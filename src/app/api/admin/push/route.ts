/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { nativePushPolicy, pushPreferences } from '@/lib/push/policy';
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

  const admin = await createAdminClient();
  const type = body.category === 'event' ? 'event' : 'recommendation';
  let devices = admin.from('push_devices').select('token, user_id');
  if (target === 'tokens') devices = devices.in('token', explicitTokens);
  const { data, error } = await devices;
  if (error) return NextResponse.json({ error: '푸시 기기 정보를 불러오지 못했습니다.' }, { status: 503 });
  const userIds = [...new Set((data ?? []).map(row => row.user_id))];
  if (!userIds.length) return NextResponse.json({ error: '발송할 디바이스 토큰이 없습니다.' }, { status: 400 });
  const { data: settings, error: settingsError } = await admin.from('push_preferences').select('user_id, settings').in('user_id', userIds);
  if (settingsError) return NextResponse.json({ error: '수신 동의 설정을 확인하지 못했습니다.' }, { status: 503 });
  const byUser = new Map((settings ?? []).map(row => [row.user_id, row.settings]));
  const tokens = (data ?? []).filter(row => nativePushPolicy({ title, type, link: '/notifications' }, pushPreferences(byUser.get(row.user_id))).allowed).map(row => row.token);

  if (!tokens.length) return NextResponse.json({ error: '해당 알림 수신에 동의한 기기가 없습니다.' }, { status: 400 });

  const result = await sendPush({ title, body: message, tokens, data: { link: '/notifications', type } });
  return NextResponse.json({ ok: result.ok, configured: result.configured, sent: result.sent, failed: result.failed, errors: result.errors });
}
