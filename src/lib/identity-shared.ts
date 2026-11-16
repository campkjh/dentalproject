/**
 * 본인인증에서 브라우저·서버가 같이 쓰는 순수 함수. 시크릿·DB 접근이 없으므로 어디서든 import 해도 된다.
 */

/** 이용 가능한 최소 만 나이 — 피부·미용 시술 플랫폼이라 성인만 가입한다. */
export const MIN_AGE = 19;

/**
 * 포트원 본인인증 ID 형식. NHN KCP는 '영문 대소문자·숫자만, 40자 이하'만 받으므로
 * 밑줄·하이픈 없이 'idv' + 영숫자로 만든다(서버는 'idv' + 32hex = 35자를 발급).
 */
export const IDV_ID_PATTERN = /^idv[A-Za-z0-9]{8,37}$/;

export function isIdentityVerificationId(value: unknown): value is string {
  return typeof value === 'string' && IDV_ID_PATTERN.test(value);
}

/**
 * 인증 후 돌아갈 경로. 같은 사이트 안의 경로만 허용한다.
 * '//evil.com', '/\evil.com' 처럼 브라우저가 다른 사이트로 해석하는 값과 제어문자는 막는다.
 */
export function safeNextPath(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') return '/';
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  if (path.includes('\\')) return '/';
  if (/[\u0000-\u001F\u007F]/.test(path)) return '/';
  if (path === '/verify-identity' || path.startsWith('/verify-identity?') || path.startsWith('/verify-identity/')) return '/';
  return path;
}

/**
 * 한국 시간 기준 만 나이. 생년월일이 'YYYY-MM-DD' 형식의 실제 날짜가 아니면 null —
 * 이상한 값이 NaN이 되어 나이 검사를 통과하는 일이 없게 한다.
 */
export function koreanAge(birthDate: string, now = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate ?? '');
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;

  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const ty = kst.getUTCFullYear();
  const tm = kst.getUTCMonth() + 1;
  const td = kst.getUTCDate();
  const age = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  return age >= 0 ? age : null;
}
