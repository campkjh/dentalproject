import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { data, error } = await sb.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: '알림을 불러오지 못했어요.' }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}
