'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { nativePushLink } from '@/lib/push/policy';
import { registerNativeDevice, requestNativePushRegistration, type PushWindow } from '@/lib/push/native-client';

export default function NativePushBridge() {
  const router = useRouter();
  const userId = useStore(s => s.user?.id);
  useEffect(() => {
    const bridge = window as PushWindow;
    bridge.onNativePushToken = device => {
      if (!userId) return;
      void registerNativeDevice(device).catch(() => console.error('Native push registration failed'));
    };
    bridge.onNativePushNotification = payload => {
      if (!userId) { router.push('/login'); return; }
      void useStore.getState().refreshNotifications();
      router.push(nativePushLink(payload.link));
    };
    const refresh = () => { if (userId && document.visibilityState === 'visible') requestNativePushRegistration(); };
    if (userId) requestNativePushRegistration();
    document.addEventListener('visibilitychange', refresh);
    return () => {
      delete bridge.onNativePushToken;
      delete bridge.onNativePushNotification;
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [router, userId]);
  return null;
}
