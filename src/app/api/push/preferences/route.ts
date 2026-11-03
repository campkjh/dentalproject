import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { pushPreferences } from '@/lib/push/policy';

export const dynamic = 'force-dynamic';
export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const admin = await createAdminClient();
  const { data, error } = await admin.from('push_preferences').select('settings').eq('user_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: '알림 설정을 불러오지 못했습니다.' }, { status: 503 });
  return NextResponse.json({ settings: pushPreferences(data?.settings) }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.settings || typeof body.settings !== 'object') return NextResponse.json({ error: '설정을 확인해주세요.' }, { status: 400 });
  const settings = pushPreferences(body.settings);
  const admin = await createAdminClient();
  const { error } = await admin.from('push_preferences').upsert({ user_id: user.id, settings, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: '알림 설정을 저장하지 못했습니다.' }, { status: 503 });
  return NextResponse.json({ settings });
}
