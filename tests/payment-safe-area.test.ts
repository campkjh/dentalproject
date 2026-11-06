import assert from 'node:assert/strict';
import test from 'node:test';
import { setNativePaymentSafeArea } from '../src/lib/payment-safe-area';

function replaceWindow(value: unknown) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value });
  return () => {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  };
}

test('iOS 결제창을 열고 닫을 때 해당 요청의 레이아웃 완료 응답을 기다린다', async () => {
  const target = new EventTarget();
  const actions: boolean[] = [];
  const restore = replaceWindow(Object.assign(target, { webkit: { messageHandlers: { paymentWindow: {
    postMessage(body: { active: boolean; requestId: string }) {
      actions.push(body.active);
      target.dispatchEvent(new CustomEvent('mydoc:payment-layout-ready', { detail: { requestId: 'other-request' } }));
      queueMicrotask(() => target.dispatchEvent(new CustomEvent('mydoc:payment-layout-ready', { detail: { requestId: body.requestId } })));
    },
  } } } }));
  try {
    await setNativePaymentSafeArea(true);
    await setNativePaymentSafeArea(false);
    assert.deepEqual(actions, [true, false]);
  } finally { restore(); }
});

test('기존 앱·Android·웹에는 브리지가 없어도 결제 진입을 막지 않는다', async () => {
  const restore = replaceWindow({});
  try { await setNativePaymentSafeArea(true); await setNativePaymentSafeArea(false); }
  finally { restore(); }
});

test('네이티브 완료 응답이 없거나 메시지 전송이 실패해도 무한 대기하지 않는다', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const target = new EventTarget();
  const bridge = { postMessage() {} };
  const restore = replaceWindow(Object.assign(target, { webkit: { messageHandlers: { paymentWindow: bridge } } }));
  try {
    const pending = setNativePaymentSafeArea(true);
    t.mock.timers.tick(500);
    await pending;
    bridge.postMessage = () => { throw new Error('unavailable'); };
    await setNativePaymentSafeArea(false);
  } finally { restore(); }
});
