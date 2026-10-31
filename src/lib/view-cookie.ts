// 의사 화면 쿠키(261101) — 이 기기에서 지금 의사 화면으로 보는 계정이면 'md-view=partner'.
//  · 서버 proxy 가 이걸 보고 '/' 요청을 곧장 /partner 로 보낸다(고객 홈이 잠깐 보였다 넘어가는 것 막기).
//  · 쓰기는 SessionProvider 가 store(isLoggedIn·isDoctor) 를 따라 한 곳에서만. 권한 판단에 쓰지 않는다(화면 길잡이일 뿐).
export const VIEW_COOKIE = 'md-view';

export function writeViewCookie(partner: boolean) {
  if (typeof document === 'undefined') return;
  document.cookie = partner
    ? `${VIEW_COOKIE}=partner; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`
    : `${VIEW_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
