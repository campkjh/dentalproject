/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const { data, error } = await sb
    .from('profiles')
    .select('id, name, phone, login_type, gender, country, is_doctor, is_admin, points, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Get emails from auth.admin with service role after the current user is verified as admin.
  const admin = await createAdminClient();
  const { data: authList, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
  const emailMap = new Map<string, string>();
  for (const u of authList?.users ?? []) {
    emailMap.set(u.id, u.email ?? '');
  }

  const users = (data ?? []).map((p: any) => ({
    ...p,
    email: emailMap.get(p.id) ?? '',
  }));

  return NextResponse.json({ users });
}
