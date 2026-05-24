import { NextResponse, type NextRequest } from 'next/server';
import { pickRandomCustomerProfileAvatar } from '@/lib/customer-profile-avatars';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const signupAttempts = new Map<string, { count: number; resetAt: number }>();
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_MAX_ATTEMPTS = 5;

function checkSignupLimit(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = forwardedFor || req.headers.get('x-real-ip') || 'local';
  const now = Date.now();
  const current = signupAttempts.get(key);
  if (!current || current.resetAt <= now) {
    signupAttempts.set(key, { count: 1, resetAt: now + SIGNUP_WINDOW_MS });
    return null;
  }
  if (current.count >= SIGNUP_MAX_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return retryAfter;
  }
  current.count += 1;
  signupAttempts.set(key, current);
  return null;
}

export async function POST(req: NextRequest) {
  const retryAfter = checkSignupLimit(req);
  if (retryAfter) {
    return NextResponse.json(
      { error: '회원가입 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: '이메일 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: '이름을 2자 이상 입력해 주세요.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    const message = error.message.toLowerCase();
    const isDuplicate =
      message.includes('already') ||
      message.includes('registered') ||
      message.includes('exists');
    return NextResponse.json(
      { error: isDuplicate ? '이미 가입된 이메일입니다. 로그인해 주세요.' : error.message },
      { status: isDuplicate ? 409 : 400 }
    );
  }

  if (!data.user) {
    return NextResponse.json({ error: '회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  await admin.from('profiles').upsert({
    id: data.user.id,
    name,
    login_type: 'email',
    country: '대한민국',
    profile_image: pickRandomCustomerProfileAvatar(),
  });

  return NextResponse.json({ ok: true });
}
