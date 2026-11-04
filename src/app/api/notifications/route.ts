import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationDeleteInput, removeOwnNotifications } from '@/lib/notification-management';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { data, error } = await sb.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: '알림을 불러오지 못했어요.' }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const input = notificationDeleteInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: '삭제할 알림을 확인해주세요.' }, { status: 400 });
  const ids = 'ids' in input.data ? input.data.ids : null;
  const { data, error } = await removeOwnNotifications(sb, user.id, ids);
  if (error) return NextResponse.json({ error: '알림을 삭제하지 못했어요.' }, { status: 500 });
  return NextResponse.json({ ok: true, deletedIds: (data ?? []).map(row => row.id) }, { headers: { 'Cache-Control': 'no-store' } });
}
