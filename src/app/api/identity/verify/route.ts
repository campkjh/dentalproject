import { NextResponse, type NextRequest } from 'next/server';
import { MIN_AGE, fetchIdentityVerification, hashCi, koreanAge } from '@/lib/identity';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 포트원 본인인증 완료 후 호출 — 포트원에 결과를 직접 조회해 만 19세 이상·중복 가입을 확인하고 기록한다.
 */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const identityVerificationId = typeof body?.identityVerificationId === 'string' ? body.identityVerificationId : '';
  if (!/^idv_[A-Za-z0-9_-]{8,80}$/.test(identityVerificationId)) {
    return NextResponse.json({ error: '본인인증 정보가 올바르지 않습니다.' }, { status: 400 });
  }

  const result = await fetchIdentityVerification(identityVerificationId);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  const c = result.customer;

  const age = koreanAge(c.birthDate);
  if (age < MIN_AGE) {
    return NextResponse.json(
      { error: `마이닥은 만 ${MIN_AGE}세 이상만 이용할 수 있어요.`, code: 'UNDER_AGE' },
      { status: 403 }
    );
  }

  const admin = await createAdminClient();
  const ciHash = hashCi(c.ci);

  // 같은 사람이 다른 계정으로 이미 인증했는지
  const { data: existing } = await admin
    .from('identity_verifications')
    .select('user_id')
    .eq('ci_hash', ciHash)
    .maybeSingle();
  if (existing && existing.user_id !== user.id) {
    return NextResponse.json(
      { error: '이미 다른 계정으로 가입된 명의예요. 기존 계정으로 로그인해 주세요.', code: 'DUPLICATE' },
      { status: 409 }
    );
  }

  const { error } = await admin.from('identity_verifications').upsert({
    user_id: user.id,
    ci_hash: ciHash,
    verified_name: c.name,
    birth_date: c.birthDate,
    gender: c.gender ?? null,
    phone: c.phoneNumber ?? null,
    is_foreigner: Boolean(c.isForeigner),
    portone_verification_id: identityVerificationId,
    verified_at: new Date().toISOString(),
  });
  if (error) {
    const dup = error.code === '23505';
    return NextResponse.json(
      { error: dup ? '이미 사용된 본인인증이에요. 다시 인증해 주세요.' : error.message },
      { status: dup ? 409 : 400 }
    );
  }

  // 예약자 정보에 쓰이는 이름·연락처를 인증된 값으로 맞춘다
  await admin
    .from('profiles')
    .update({ name: c.name, ...(c.phoneNumber ? { phone: c.phoneNumber } : {}), birth_year: c.birthDate.slice(0, 4) })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
