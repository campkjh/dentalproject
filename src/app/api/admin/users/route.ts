/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

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
  const check = await requireAdmin();
  if (check.error) return check.error;
  const sb = check.sb!;

  const { data, error } = await sb
    .from('profiles')
    .select('id, name, phone, login_type, gender, country, is_doctor, is_admin, points, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const admin = await createAdminClient();
  const { data: authList, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
  const authMap = new Map<string, { email: string; bannedUntil: string | null }>();
  for (const u of authList?.users ?? []) {
    authMap.set(u.id, {
      email: u.email ?? '',
      bannedUntil: (u as any).banned_until ?? null,
    });
  }

  const now = Date.now();
  const users = (data ?? []).map((p: any) => {
    const info = authMap.get(p.id);
    const bannedUntilTs = info?.bannedUntil ? new Date(info.bannedUntil).getTime() : 0;
    return {
      ...p,
      email: info?.email ?? '',
      banned_until: info?.bannedUntil ?? null,
      is_banned: bannedUntilTs > now,
    };
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: { userId?: string; action?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const userId = typeof body.userId === 'string' ? body.userId : '';
  const action = body.action;
  if (!userId || (action !== 'suspend' && action !== 'unsuspend' && action !== 'delete')) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();

  if (action === 'delete') {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const banDuration = action === 'suspend' ? '8760h' : 'none';
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: banDuration } as any);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
