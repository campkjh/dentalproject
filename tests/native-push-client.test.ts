import assert from 'node:assert/strict';
import test from 'node:test';
import { registerNativeDevice, unregisterNativePush } from '../src/lib/push/native-client';

test('로그아웃은 진행 중인 기기 등록 뒤에 해제하며 해제 중 새 등록을 막는다', async () => {
  const originalFetch = globalThis.fetch;
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const calls: string[] = [];
  const values = new Map<string, string>();
  let nativeUnregistered = 0;
  let restoreRegistration = 0;
  let finishPost!: () => void;
  const postCompleted = new Promise<void>(resolve => { finishPost = resolve; });
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { NativePush: { register: () => { restoreRegistration++; }, unregister: () => { nativeUnregistered++; } } } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem: (key: string, value: string) => values.set(key, value), getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => values.delete(key) } });
    globalThis.fetch = async (_url, init) => {
      calls.push(init?.method ?? 'GET');
      if (init?.method === 'POST') await postCompleted;
      return Response.json({ ok: true });
    };
    const registration = registerNativeDevice({ token: 'test-token', deviceId: 'device-a', platform: 'ios' });
    await Promise.resolve();
    await Promise.resolve();
    const logout = unregisterNativePush();
    await registerNativeDevice({ token: 'other-token', deviceId: 'device-b', platform: 'ios' });
    finishPost();
    await registration;
    await logout;
    assert.deepEqual(calls, ['POST', 'DELETE']);
    assert.equal(nativeUnregistered, 1);

    // A failed removal must not silently permit sign-out with a live inbox token.
    await registerNativeDevice({ token: 'new-token', deviceId: 'device-a', platform: 'ios' });
    globalThis.fetch = async () => Response.json({}, { status: 503 });
    await assert.rejects(unregisterNativePush());
    assert.equal(restoreRegistration, 1);
  } finally {
    finishPost();
    globalThis.fetch = originalFetch;
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor); else Reflect.deleteProperty(globalThis, 'window');
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
