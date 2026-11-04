/** Use the existing iOS Apple bridge; Android and browsers continue through OAuth. */
export function startNativeAppleLogin(onError: (message: string) => void): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & {
    webkit?: { messageHandlers?: { appleLogin?: { postMessage: (message: unknown) => void } } };
    onAppleNativeLoginError?: (message: string) => void;
  };
  const apple = w.webkit?.messageHandlers?.appleLogin;
  if (!apple) return false;
  // An empty error means the user dismissed Apple's sheet. Restore the buttons quietly.
  w.onAppleNativeLoginError = onError;
  try { apple.postMessage({}); }
  catch { onError('Apple 로그인을 시작하지 못했습니다.'); }
  return true;
}
