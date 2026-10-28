/**
 * 카카오 로그인 시작 — 로그인 페이지와 온보딩 로그인 시트가 같이 쓴다.
 *
 * 네이티브 앱(WebView)에선 카카오톡 앱-투-앱 네이티브 로그인을 사용한다.
 * - Android: window.AndroidKakao.login()
 * - iOS:     window.webkit.messageHandlers.kakaoLogin.postMessage({})
 * 네이티브가 로그인 후 onKakaoNativeLogin(id_token)을 호출 →
 * SessionProvider가 Supabase 세션 생성 → 로그인 상태가 바뀌며 화면이 알아서 닫히거나 이동한다.
 *
 * 네이티브 브리지가 없으면(일반 웹) false 를 돌려준다 → 부른 쪽이 signInWithOAuth('kakao') 로 넘어간다.
 */
export function startNativeKakaoLogin(onError: (message: string) => void): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & {
    AndroidKakao?: { login?: () => void };
    webkit?: {
      messageHandlers?: { kakaoLogin?: { postMessage: (msg: unknown) => void } };
    };
    onKakaoNativeLoginError?: (message: string) => void;
  };
  const androidKakao = w.AndroidKakao;
  const iosKakao = w.webkit?.messageHandlers?.kakaoLogin;
  if (!androidKakao?.login && !iosKakao) return false;

  w.onKakaoNativeLoginError = (message: string) => {
    onError(message || '카카오 로그인에 실패했습니다.');
  };
  try {
    if (androidKakao?.login) androidKakao.login();
    else iosKakao!.postMessage({});
  } catch {
    onError('카카오 로그인을 시작하지 못했습니다.');
  }
  return true;
}

/** 로그인 뒤 돌아갈 경로 — 같은 사이트 안 경로만 받는다(//evil.com, /login 되돌이 막기) */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  if (next === '/login' || next.startsWith('/login?') || next.startsWith('/login/')) return null;
  return next;
}
