import { NextResponse, type NextRequest } from 'next/server';
import {
  IDV_PENDING_COOKIE,
  IDV_PENDING_COOKIE_PATH,
  MIN_AGE,
  fetchIdentityVerification,
  hashCi,
  koreanAge,
  verifyPendingCookie,
} from '@/lib/identity';
import { isIdentityVerificationId } from '@/lib/identity-shared';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function clearPending(res: NextResponse) {
  res.cookies.set(IDV_PENDING_COOKIE, '', { path: IDV_PENDING_COOKIE_PATH, maxAge: 0 });
  return res;
}

const SAVE_FAILED = '본인인증 결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';

/**
 * 포트원 본인인증 완료 후 호출 — 포트원에 결과를 직접 조회해 만 19세 이상·중복 가입을 확인하고 기록한다.
 * 인증된 실명·생년월일·연락처는 비공개 테이블(identity_verifications)에만 둔다.
 * (profiles 는 누구나 읽을 수 있어서 커뮤니티 작성자명 등으로 실명이 노출되므로 덮어쓰지 않는다.)
 */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const identityVerificationId = body?.identityVerificationId;
  if (!isIdentityVerificationId(identityVerificationId)) {
    return NextResponse.json({ error: '본인인증 정보가 올바르지 않습니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();

  // 이미 이 계정에 저장된 같은 인증(완료 화면 새로고침·다시 열린 주소)은 그대로 성공으로 본다
  const { data: saved } = await admin
    .from('identity_verifications')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('portone_verification_id', identityVerificationId)
    .maybeSingle();
  if (saved) return clearPending(NextResponse.json({ ok: true }));

  // 이 계정이 서버에서 발급받은 인증 ID만 인정한다(/api/identity/start 가 서명해 심은 쿠키)
  if (!verifyPendingCookie(req.cookies.get(IDV_PENDING_COOKIE)?.value, user.id, identityVerificationId)) {
    return NextResponse.json({ error: '본인인증을 다시 시작해 주세요.', code: 'RESTART' }, { status: 400 });
  }

  const result = await fetchIdentityVerification(identityVerificationId);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  const c = result.customer;

  const age = koreanAge(c.birthDate);
  if (age === null || age < MIN_AGE) {
    return clearPending(
      NextResponse.json(
        { error: `마이닥은 만 ${MIN_AGE}세 이상만 이용할 수 있어요.`, code: 'UNDER_AGE' },
        { status: 403 }
      )
    );
  }

  const ciHash = hashCi(c.ci);

  const [existingRes, ownRes] = await Promise.all([
    // 같은 사람이 다른 계정으로 이미 인증했는지
    admin.from('identity_verifications').select('user_id').eq('ci_hash', ciHash).maybeSingle(),
    // 이 계정이 이미 다른 명의로 인증했는지 — 덮어쓰면 이전 명의의 중복 가입 방지가 풀린다
    admin.from('identity_verifications').select('ci_hash').eq('user_id', user.id).maybeSingle(),
  ]);
  if (existingRes.error || ownRes.error) {
    console.error('[identity] 기존 인증 조회 실패', existingRes.error?.code ?? '', ownRes.error?.code ?? '');
    return NextResponse.json({ error: SAVE_FAILED }, { status: 500 });
  }
  const existing = existingRes.data;
  const own = ownRes.data;
  if (existing && existing.user_id !== user.id) {
    return clearPending(
      NextResponse.json(
        { error: '이미 다른 계정으로 가입된 명의예요. 기존 계정으로 로그인해 주세요.', code: 'DUPLICATE' },
        { status: 409 }
      )
    );
  }
  if (own && own.ci_hash !== ciHash) {
    return clearPending(
      NextResponse.json(
        { error: '이 계정은 이미 다른 명의로 본인인증을 마쳤어요.', code: 'DIFFERENT_PERSON' },
        { status: 409 }
      )
    );
  }

  const row = {
    verified_name: c.name,
    birth_date: c.birthDate,
    gender: c.gender ?? null,
    phone: c.phoneNumber ?? null,
    is_foreigner: Boolean(c.isForeigner),
    portone_verification_id: identityVerificationId,
    verified_at: new Date().toISOString(),
  };
  // 처음이면 insert(동시 요청은 PK·unique 충돌 23505로 막힌다), 재인증이면 같은 명의일 때만 갱신
  const { error, data: updated } = own
    ? await admin.from('identity_verifications').update(row).eq('user_id', user.id).eq('ci_hash', ciHash).select('user_id')
    : await admin.from('identity_verifications').insert({ user_id: user.id, ci_hash: ciHash, ...row }).select('user_id');
  if (error || !updated?.length) {
    const dup = error?.code === '23505';
    if (dup) {
      // 같은 인증을 두 번 보낸 경우(새로고침·두 탭) — 먼저 들어간 요청이 이미 저장했으면 성공
      const { data: savedNow } = await admin
        .from('identity_verifications')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('portone_verification_id', identityVerificationId)
        .maybeSingle();
      if (savedNow) return clearPending(NextResponse.json({ ok: true }));
    }
    if (!dup) console.error('[identity] 인증 결과 저장 실패', error?.code ?? 'no-row');
    return NextResponse.json(
      { error: dup ? '이미 사용된 본인인증이에요. 다시 인증해 주세요.' : SAVE_FAILED },
      { status: dup ? 409 : 500 }
    );
  }

  return clearPending(NextResponse.json({ ok: true }));
}
