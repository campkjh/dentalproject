/**
 * 휴대폰 본인인증(포트원 V2 + 다날, PASS 포함) 서버 헬퍼. 시크릿키를 쓰므로 서버에서만 import 한다.
 *
 * 켜는 조건(모두 있어야 가입·예약 때 인증을 요구한다):
 *   IDENTITY_VERIFICATION_REQUIRED=true
 *   PORTONE_API_SECRET                  — 포트원 콘솔 > 결제 연동 > API Secret
 *   NEXT_PUBLIC_PORTONE_STORE_ID         — 상점 아이디(store-…)
 *   NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY  — 본인인증 채널 키(channel-key-…, 다날)
 * 하나라도 없으면 인증을 요구하지 않는다(계약 전 배포해도 서비스는 그대로).
 */
import { createHash } from 'crypto';

/** 이용 가능한 최소 만 나이 — 피부·미용 시술 플랫폼이라 성인만 가입한다. */
export const MIN_AGE = 19;

export function isIdentityVerificationRequired() {
  return (
    process.env.IDENTITY_VERIFICATION_REQUIRED === 'true' &&
    Boolean(process.env.PORTONE_API_SECRET) &&
    Boolean(process.env.NEXT_PUBLIC_PORTONE_STORE_ID) &&
    Boolean(process.env.NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY)
  );
}

export type VerifiedCustomer = {
  name: string;
  phoneNumber?: string | null;
  birthDate: string; // YYYY-MM-DD
  gender?: string | null;
  isForeigner?: boolean | null;
  ci: string;
};

/** 포트원에 인증 결과를 직접 조회한다(클라이언트가 넘긴 값은 믿지 않는다). */
export async function fetchIdentityVerification(
  identityVerificationId: string
): Promise<{ ok: true; customer: VerifiedCustomer } | { ok: false; message: string }> {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) return { ok: false, message: '본인인증 설정이 완료되지 않았습니다.' };

  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
  const url =
    `https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}` +
    (storeId ? `?storeId=${encodeURIComponent(storeId)}` : '');
  const res = await fetch(url, { headers: { Authorization: `PortOne ${secret}` }, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data?.message ?? '본인인증 결과를 확인하지 못했어요.' };
  if (data?.status !== 'VERIFIED' || !data?.verifiedCustomer?.ci || !data?.verifiedCustomer?.birthDate) {
    return { ok: false, message: '본인인증이 완료되지 않았어요.' };
  }
  return { ok: true, customer: data.verifiedCustomer as VerifiedCustomer };
}

/** 한국 시간 기준 만 나이 */
export function koreanAge(birthDate: string, now = new Date()) {
  const [y, m, d] = birthDate.split('-').map(Number);
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const ty = kst.getUTCFullYear();
  const tm = kst.getUTCMonth() + 1;
  const td = kst.getUTCDate();
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

export function hashCi(ci: string) {
  return createHash('sha256').update(ci).digest('hex');
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 이 사용자가 지금 본인인증을 해야 하는지.
 * 의사·병원 운영자·관리자는 별도 심사를 거친 계정이라 고객 본인인증을 요구하지 않는다.
 */
export async function getIdentityStatus(admin: any, userId: string) {
  if (!isIdentityVerificationRequired()) return { required: false, verified: false, exempt: false };
  const [{ data: profile }, { data: hospital }, { data: verification }] = await Promise.all([
    admin.from('profiles').select('is_doctor, is_admin').eq('id', userId).maybeSingle(),
    admin.from('hospitals').select('id').eq('owner_id', userId).limit(1).maybeSingle(),
    admin.from('identity_verifications').select('verified_at').eq('user_id', userId).maybeSingle(),
  ]);
  const exempt = Boolean(profile?.is_doctor || profile?.is_admin || hospital);
  return { required: !exempt, verified: Boolean(verification), exempt };
}
