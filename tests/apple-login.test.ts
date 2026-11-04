import assert from 'node:assert/strict';
import test from 'node:test';
import { startNativeAppleLogin } from '../src/components/auth/apple-login';

function withWindow(value: unknown, run: () => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value });
  try { run(); }
  finally { if (previous) Object.defineProperty(globalThis, 'window', previous); else Reflect.deleteProperty(globalThis, 'window'); }
}

test('iOS 애플 브리지가 없는 Android·웹은 기존 OAuth 흐름으로 넘긴다', () => {
  withWindow({ AndroidKakao: { login() {} } }, () => {
    assert.equal(startNativeAppleLogin(() => assert.fail('unexpected native error')), false);
  });
  withWindow(undefined, () => assert.equal(startNativeAppleLogin(() => {}), false));
});

test('iOS에서는 네이티브 Apple 로그인만 시작하고 취소·오류를 호출한 화면에 돌려준다', () => {
  const requests: unknown[] = [];
  const errors: string[] = [];
  const w: { webkit: { messageHandlers: { appleLogin: { postMessage: (message: unknown) => void } } }; onAppleNativeLoginError?: (message: string) => void } = {
    webkit: { messageHandlers: { appleLogin: { postMessage: message => { requests.push(message); } } } },
  };
  withWindow(w, () => {
    assert.equal(startNativeAppleLogin(message => errors.push(message)), true);
    assert.deepEqual(requests, [{}]);
    w.onAppleNativeLoginError?.('');
    w.onAppleNativeLoginError?.('로그인 실패');
    assert.deepEqual(errors, ['', '로그인 실패']);
  });
});

test('네이티브 채널 호출 실패는 화면을 대기 상태로 남기지 않는다', () => {
  const errors: string[] = [];
  withWindow({ webkit: { messageHandlers: { appleLogin: { postMessage() { throw new Error('closed'); } } } } }, () => {
    assert.equal(startNativeAppleLogin(message => errors.push(message)), true);
    assert.deepEqual(errors, ['Apple 로그인을 시작하지 못했습니다.']);
  });
});
