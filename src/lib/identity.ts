/**
 * 휴대폰 본인인증(포트원 V2 + NHN KCP, PASS·통신 3사·알뜰폰) 서버 헬퍼. 시크릿키를 쓰므로 서버에서만 import 한다.
 *
 * 켜는 조건(모두 있어야 인증을 요구한다 — 로그인한 고객의 화면 전체와 예약·상담·글·댓글·후기 작성):
 *   IDENTITY_VERIFICATION_REQUIRED=true
 *   PORTONE_API_SECRET                  — 포트원 콘솔 > 결제 연동 > 연동 정보 > 식별코드·API Keys > V2 API Secret
 *   NEXT_PUBLIC_PORTONE_STORE_ID         — 같은 화면의 상점 아이디(store-…)
 *   NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY  — 채널 관리의 NHN KCP '본인인증' 채널 키(channel-key-…)
 * 하나라도 없으면 인증을 요구하지 않는다(계약 전 배포해도 서비스는 그대로).
 */
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { MIN_AGE, koreanAge } from '@/lib/identity-shared';
import { createAdminClient } from '@/lib/supabase/server';

export { MIN_AGE, koreanAge };

/** 인증 완료 후 이 시간 안에 확인(저장)해야 한다. */
const VERIFICATION_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * 인증을 시작한 계정에만 결과를 인정하기 위한 쿠키(/api/identity/start 가 발급).
 * 값은 `인증ID.발급시각.서명` — 서버 비밀키로 서명하므로 사용자가 쿠키를 직접 만들어 남의 인증 ID를 끼워 넣을 수 없다.
 */
export const IDV_PENDING_COOKIE = 'mydoc_idv_pending';
export const IDV_PENDING_COOKIE_PATH = '/api/identity';
export const IDV_PENDING_MAX_AGE_S = 30 * 60;

function pendingSecret() {
  return process.env.IDENTITY_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function pendingMac(userId: string, identityVerificationId: string, issuedAt: number) {
  return createHmac('sha256', pendingSecret())
    .update(`idv-pending:${userId}.${identityVerificationId}.${issuedAt}`)
    .digest('base64url');
}

export function signPendingCookie(userId: string, identityVerificationId: string, issuedAt = Date.now()) {
  if (!pendingSecret()) return null;
  return `${identityVerificationId}.${issuedAt}.${pendingMac(userId, identityVerificationId, issuedAt)}`;
}

/** 쿠키가 이 계정이 방금(30분 안에) 서버에서 발급받은 그 인증 ID 것인지 */
export function verifyPendingCookie(cookie: string | undefined, userId: string, identityVerificationId: string) {
  if (!cookie || !pendingSecret()) return false;
  const [id, issuedAtRaw, mac, ...rest] = cookie.split('.');
  if (rest.length > 0 || id !== identityVerificationId || !/^\d{13}$/.test(issuedAtRaw ?? '') || !mac) return false;
  const issuedAt = Number(issuedAtRaw);
  const age = Date.now() - issuedAt;
  if (age < 0 || age > IDV_PENDING_MAX_AGE_S * 1000) return false;
  const expected = Buffer.from(pendingMac(userId, id, issuedAt));
  const actual = Buffer.from(mac);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isIdentityVerificationRequired() {
  return (
    process.env.IDENTITY_VERIFICATION_REQUIRED === 'true' &&
    Boolean(process.env.PORTONE_API_SECRET) &&
    Boolean(process.env.NEXT_PUBLIC_PORTONE_STORE_ID) &&
    Boolean(process.env.NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY)
  );
}

/** 인증 창을 열 수 있을 만큼 설정됐는지(강제 여부와 무관) */
export function isIdentityVerificationConfigured() {
  return (
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
  operator?: string | null; // KCP: 항상 제공
  di?: string | null; // KCP: 항상 제공(사이트별 값)
  ci: string; // KCP: '가맹점 설정에 따라 제공' — 계약 때 CI 제공을 신청해야 한다
};

const GENERIC_FAIL = '본인인증 결과를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.';

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

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `PortOne ${secret}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error('[identity] PortOne 조회 실패', (error as Error)?.name);
    return { ok: false, message: GENERIC_FAIL };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 401/403은 API Secret 만료·오설정 — 운영자가 알아야 하므로 로그를 남기고, 고객에게는 일반 문구만 보인다
    console.error('[identity] PortOne 조회 오류', res.status, data?.type ?? '');
    return { ok: false, message: GENERIC_FAIL };
  }
  if (data?.status !== 'VERIFIED') {
    return { ok: false, message: '본인인증이 완료되지 않았어요.' };
  }

  // 우리 본인인증 채널에서 끝난 건인지(채널 정보가 있을 때만 — 포트원 스펙상 선택 필드)
  const channel = data?.channel as { type?: string; key?: string } | undefined;
  const expectedChannelKey = process.env.NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY;
  if (channel?.key && expectedChannelKey && channel.key !== expectedChannelKey) {
    console.error('[identity] 다른 채널의 인증 건', channel.type ?? '');
    return { ok: false, message: '본인인증을 다시 진행해 주세요.' };
  }
  // 테스트 채널 건은 기본 거부 — 별도 DB를 쓰는 로컬·프리뷰에서만 IDENTITY_ALLOW_TEST_CHANNEL=true 로 허용
  if (channel?.type === 'TEST' && process.env.IDENTITY_ALLOW_TEST_CHANNEL !== 'true') {
    console.error('[identity] 테스트 채널 인증 건 거부');
    return { ok: false, message: '본인인증을 다시 진행해 주세요.' };
  }

  const customer = data?.verifiedCustomer as Partial<VerifiedCustomer> | undefined;
  const missing = (['name', 'birthDate', 'ci'] as const).filter((key) => !customer?.[key]);
  if (missing.length > 0) {
    // CI가 빠졌다면 KCP 가맹점 설정에서 CI 제공이 꺼져 있는 것 — 계약·설정 확인 필요
    console.error('[identity] 인증 결과 필수 항목 누락', missing.join(','));
    return { ok: false, message: GENERIC_FAIL };
  }
  if (koreanAge(customer!.birthDate!) === null) {
    console.error('[identity] 생년월일 형식 오류');
    return { ok: false, message: GENERIC_FAIL };
  }

  // 오래된 인증 결과를 다시 쓰지 못하게 — 방금(30분 이내) 끝난 인증만 받는다
  const verifiedAt = Date.parse(data?.verifiedAt ?? data?.statusChangedAt ?? '');
  if (!Number.isFinite(verifiedAt) || Date.now() - verifiedAt > VERIFICATION_MAX_AGE_MS) {
    return { ok: false, message: '본인인증 시간이 지났어요. 다시 인증해 주세요.' };
  }
  return { ok: true, customer: customer as VerifiedCustomer };
}

export function hashCi(ci: string) {
  return createHash('sha256').update(ci).digest('hex');
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** 의사 계정이 '승인된' 병원에 소속돼 있는지 — 입점 심사 중인 병원이 스스로 의사 권한을 만든 경우를 면제에서 뺀다 */
async function isDoctorAtApprovedHospital(admin: any, userId: string) {
  let { data: doctors, error } = await admin
    .from('doctors')
    .select('hospital_id')
    .eq('user_id', userId)
    .eq('member_status', 'active');
  if (error && `${error.message ?? ''}`.includes('member_status')) {
    // member_status 컬럼이 없는 DB(0009 이전) — 소속 여부만 본다
    ({ data: doctors, error } = await admin.from('doctors').select('hospital_id').eq('user_id', userId));
  }
  if (error || !Array.isArray(doctors)) return false;
  const hospitalIds = doctors.map((d: { hospital_id?: string | null }) => d.hospital_id).filter(Boolean);
  if (hospitalIds.length === 0) return false;
  const { data: approved } = await admin
    .from('hospitals')
    .select('id')
    .in('id', hospitalIds)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle();
  return Boolean(approved);
}

/**
 * 이 사용자가 지금 본인인증을 해야 하는지.
 * 관리자, '승인된' 병원 운영자, '승인된' 병원 소속 의사는 별도 심사를 거친 계정이라 고객 본인인증을 요구하지 않는다.
 * (입점 신청만 한 계정 — 심사 중·반려·정지 — 은 면제하지 않는다. is_doctor/is_admin 은 0032 트리거로 서버만 바꿀 수 있다.)
 */
export async function getIdentityStatus(admin: any, userId: string) {
  if (!isIdentityVerificationRequired()) return { required: false, verified: false, exempt: false };
  const [{ data: profile }, { data: hospital }, { data: verification }] = await Promise.all([
    admin.from('profiles').select('is_doctor, is_admin').eq('id', userId).maybeSingle(),
    admin.from('hospitals').select('id').eq('owner_id', userId).eq('status', 'approved').limit(1).maybeSingle(),
    admin.from('identity_verifications').select('verified_at').eq('user_id', userId).maybeSingle(),
  ]);
  const exempt = Boolean(
    profile?.is_admin ||
      hospital ||
      (profile?.is_doctor && (await isDoctorAtApprovedHospital(admin, userId)))
  );
  return { required: !exempt, verified: Boolean(verification), exempt };
}

/**
 * 고객 쓰기 API 맨 앞에서 부른다. 본인인증(만 19세 이상)이 필요한데 안 했으면 403 응답을, 아니면 null 을 돌려준다.
 * 화면의 IdentityGate 를 건너뛴 직접 호출도 여기서 막는다.
 */
export async function identityRequiredResponse(userId: string, action = '이 기능을 이용할') {
  if (!isIdentityVerificationRequired()) return null;
  const status = await getIdentityStatus(await createAdminClient(), userId);
  if (status.required && !status.verified) {
    return NextResponse.json(
      { error: `본인인증 후 ${action} 수 있어요.`, code: 'IDENTITY_REQUIRED' },
      { status: 403 }
    );
  }
  return null;
}
