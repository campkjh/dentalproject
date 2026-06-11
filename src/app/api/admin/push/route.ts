/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isPushConfigured, sendPush } from '@/lib/push/fcm';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 }) };
  return { sb, user };
}

export async function GET() {
  return NextResponse.json({ configured: isPushConfigured() });
}

export async function POST(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  if (!isPushConfigured()) {
    return NextResponse.json({
      error: '푸시 발송이 비활성 상태입니다. Vercel 환경변수에 FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY를 추가해주세요.',
      configured: false,
    }, { status: 503 });
  }

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const message = typeof body.body === 'string' ? body.body.trim() : '';
  const target: 'all' | 'tokens' = body.target === 'tokens' ? 'tokens' : 'all';
  const explicitTokens: string[] = Array.isArray(body.tokens) ? body.tokens.filter((v: unknown) => typeof v === 'string') : [];

  if (!title || !message) return NextResponse.json({ error: '제목과 본문은 필수입니다.' }, { status: 400 });

  let tokens: string[] = [];
  if (target === 'tokens') {
    tokens = explicitTokens;
  } else {
    const admin = await createAdminClient();
    const { data, error } = await admin.from('profiles').select('push_token').not('push_token', 'is', null);
    if (error) {
      const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
      if (text.includes('push_token')) {
        return NextResponse.json({
          error: 'profiles.push_token 컬럼이 없습니다. 토큰 수집/저장이 먼저 필요합니다.',
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    tokens = (data ?? []).map((r: any) => r.push_token).filter(Boolean);
  }

  if (!tokens.length) return NextResponse.json({ error: '발송할 디바이스 토큰이 없습니다.' }, { status: 400 });

  const result = await sendPush({ title, body: message, tokens });
  return NextResponse.json(result);
}
