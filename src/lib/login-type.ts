export type LoginType = 'email' | 'kakao' | 'apple' | 'unknown';

function knownLoginType(value: unknown): Exclude<LoginType, 'unknown'> | undefined {
  return value === 'email' || value === 'kakao' || value === 'apple' ? value : undefined;
}

/** 인증 계정의 제공자를 우선하고, 이전 계정은 프로필의 저장값을 사용한다. */
export function resolveLoginType(authProvider: unknown, profileType?: unknown): LoginType {
  if (authProvider != null && authProvider !== '') return knownLoginType(authProvider) ?? 'unknown';
  return knownLoginType(profileType) ?? 'unknown';
}

export function loginTypePresentation(value: unknown) {
  switch (value) {
    case 'email': return { label: '이메일', description: '이메일로 로그인했어요' };
    case 'kakao': return { label: '카카오', description: '카카오 계정으로 로그인했어요' };
    case 'apple': return { label: '애플', description: '애플 계정으로 로그인했어요' };
    default: return { label: '확인 필요', description: '로그인 유형을 확인할 수 없어요' };
  }
}
