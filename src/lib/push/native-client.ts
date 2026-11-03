'use client';

export type NativePushDevice = { token: string; deviceId: string; platform: 'android' | 'ios' };
export type PushWindow = Window & {
  NativePush?: { register: () => void; unregister: () => void };
  webkit?: { messageHandlers?: { nativePush?: { postMessage: (message: { action: string }) => void } } };
  onNativePushToken?: (device: NativePushDevice) => void;
  onNativePushNotification?: (payload: { link?: string; notificationId?: string }) => void;
};

let currentDevice: NativePushDevice | null = null;
let pendingRegistration: Promise<unknown> = Promise.resolve();
let signingOut = false;

export function registerNativeDevice(device: NativePushDevice) {
  if (signingOut) return Promise.resolve();
  currentDevice = device;
  try { localStorage.setItem('native_push_device_id', device.deviceId); } catch { /* unavailable storage */ }
  pendingRegistration = pendingRegistration.catch(() => {}).then(async () => {
    const response = await fetch('/api/push/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(device), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Native push device registration failed');
  });
  return pendingRegistration;
}

export function requestNativePushRegistration() {
  const bridge = window as PushWindow;
  if (bridge.NativePush) bridge.NativePush.register();
  else bridge.webkit?.messageHandlers?.nativePush?.postMessage({ action: 'register' });
}

/** Run BEFORE signing out so another account's alerts cannot remain linked. */
export async function unregisterNativePush() {
  signingOut = true;
  const bridge = window as PushWindow;
  bridge.NativePush?.unregister();
  bridge.webkit?.messageHandlers?.nativePush?.postMessage({ action: 'unregister' });
  try {
    await pendingRegistration.catch(() => {});
    let deviceId = currentDevice?.deviceId;
    try { deviceId ||= localStorage.getItem('native_push_device_id') || undefined; } catch { /* unavailable storage */ }
    if (deviceId) {
      const response = await fetch('/api/push/devices', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId }), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Native push unregister failed');
    }
    currentDevice = null;
    try { localStorage.removeItem('native_push_device_id'); } catch { /* unavailable storage */ }
  } catch (error) {
    // Keep the authenticated session until the server confirms device removal.
    // Otherwise a shared phone could receive alerts for a signed-out member.
    signingOut = false;
    requestNativePushRegistration();
    throw error;
  } finally { signingOut = false; }
}
