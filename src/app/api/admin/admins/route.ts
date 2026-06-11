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

  const admin = await createAdminClient();
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, name, phone, is_admin, is_doctor, created_at')
    .eq('is_admin', true);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map<string, { email: string; lastSignIn: string | null }>();
  for (const u of authList?.users ?? []) {
    emailMap.set(u.id, { email: u.email ?? '', lastSignIn: (u as any).last_sign_in_at ?? null });
  }

  const admins = (profiles ?? []).map((p: any) => ({
    id: p.id,
    name: p.name ?? '(미입력)',
    email: emailMap.get(p.id)?.email ?? '',
    phone: p.phone ?? '',
    last_sign_in_at: emailMap.get(p.id)?.lastSignIn ?? null,
    created_at: p.created_at,
  }));

  return NextResponse.json({ admins });
}

export async function POST(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const userId = typeof body.user_id === 'string' ? body.user_id : '';
  const grant = body.action !== 'revoke';
  if (!userId) return NextResponse.json({ error: '회원 ID가 필요합니다.' }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from('profiles').update({ is_admin: grant }).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
