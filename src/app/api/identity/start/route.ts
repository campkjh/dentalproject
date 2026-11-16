import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import {
  IDV_PENDING_COOKIE,
  IDV_PENDING_COOKIE_PATH,
  IDV_PENDING_MAX_AGE_S,
  isIdentityVerificationConfigured,
  signPendingCookie,
} from '@/lib/identity';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 본인인증 시작 — 서버가 인증 ID를 발급하고, 그 ID를 이 계정·이 브라우저에만 묶어 둔다(HttpOnly 쿠키).
 * 그래야 다른 사람이 끝낸 인증 링크(?identityVerificationId=…)를 받아 열어도 내 계정에 저장되지 않는다.
 */
export async function POST() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (!isIdentityVerificationConfigured()) {
    return NextResponse.json({ error: '본인인증 설정이 아직 완료되지 않았어요. 고객센터로 문의해 주세요.' }, { status: 503 });
  }

  // KCP: 영문·숫자만, 40자 이하 → 'idv' + 32hex = 35자
  const identityVerificationId = `idv${randomUUID().replace(/-/g, '')}`;
  const pending = signPendingCookie(user.id, identityVerificationId);
  if (!pending) {
    console.error('[identity] 쿠키 서명 키 없음(IDENTITY_COOKIE_SECRET 또는 SUPABASE_SERVICE_ROLE_KEY)');
    return NextResponse.json({ error: '본인인증 설정이 아직 완료되지 않았어요. 고객센터로 문의해 주세요.' }, { status: 503 });
  }
  const res = NextResponse.json({ identityVerificationId });
  res.cookies.set(IDV_PENDING_COOKIE, pending, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: IDV_PENDING_COOKIE_PATH,
    maxAge: IDV_PENDING_MAX_AGE_S,
  });
  return res;
}
