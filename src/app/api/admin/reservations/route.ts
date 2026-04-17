/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const { data, error } = await sb
    .from('reservations')
    .select(
      `id, status, amount, customer_name, customer_phone, payment_type, payment_method, created_at, visit_at,
       user:profiles!reservations_user_id_fkey (name, phone),
       hospital:hospitals (name),
       product:products (title),
       doctor:doctors (name)`
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ reservations: data ?? [] });
}
