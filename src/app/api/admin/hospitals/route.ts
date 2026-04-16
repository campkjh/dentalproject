/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { sb, user: null, isAdmin: false };
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return { sb, user, isAdmin: !!profile?.is_admin };
}

export async function GET() {
  const { sb, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const { data, error } = await sb
    .from('hospitals')
    .select(
      `id, name, category, phone, status, created_at,
       owner:profiles!hospitals_owner_id_fkey (name, phone),
       doctors (id)`
    )
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ hospitals: data ?? [] });
}
