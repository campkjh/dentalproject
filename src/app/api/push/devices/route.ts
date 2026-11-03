import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const deviceInput = z.object({
  deviceId: z.uuid(), platform: z.enum(['android', 'ios']),
  token: z.string().min(20).max(4096).regex(/^[A-Za-z0-9_:.-]+$/),
});

export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const parsed = deviceInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '기기 등록 정보가 올바르지 않습니다.' }, { status: 400 });
  const { deviceId, platform, token } = parsed.data;
  const admin = await createAdminClient();
  // A token belongs to the currently signed-in account, including on shared devices.
  const { error: cleanupError } = await admin.from('push_devices').delete().eq('device_id', deviceId).neq('token', token);
  if (cleanupError) return NextResponse.json({ error: '기기 정보를 저장하지 못했습니다.' }, { status: 503 });
  const { error } = await admin.from('push_devices').upsert({ user_id: user.id, device_id: deviceId, platform, token, updated_at: new Date().toISOString() }, { onConflict: 'token' });
  if (error) return NextResponse.json({ error: '기기 정보를 저장하지 못했습니다.' }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const deviceId = z.uuid().safeParse(body?.deviceId);
  if (!deviceId.success) return NextResponse.json({ error: '기기 정보가 올바르지 않습니다.' }, { status: 400 });
  const admin = await createAdminClient();
  const { error } = await admin.from('push_devices').delete().eq('device_id', deviceId.data).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: '기기 연결을 해제하지 못했습니다.' }, { status: 503 });
  return NextResponse.json({ ok: true });
}
