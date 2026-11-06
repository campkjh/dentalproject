'use client';

/** Toss can open an iframe without a main-frame navigation. Tell the iOS shell before opening it. */
export async function setNativePaymentSafeArea(active: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  const bridge = (window as Window & {
    webkit?: { messageHandlers?: { paymentWindow?: { postMessage: (body: unknown) => void } } };
  }).webkit?.messageHandlers?.paymentWindow;
  if (!bridge) return;
  const requestId = `payment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await new Promise<void>(resolve => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener('mydoc:payment-layout-ready', onReady);
      resolve();
    };
    const onReady = (event: Event) => {
      if ((event as CustomEvent<{ requestId?: string }>).detail?.requestId === requestId) done();
    };
    const timer = setTimeout(done, 500);
    window.addEventListener('mydoc:payment-layout-ready', onReady);
    try { bridge.postMessage({ active, requestId }); } catch { done(); }
  });
}
