/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ payments: [] });

  const { data: hospital } = await sb.from('hospitals').select('id').eq('owner_id', user.id).maybeSingle();
  if (!hospital) return NextResponse.json({ payments: [] });

  const { data, error } = await sb
    .from('reservations')
    .select(
      `id, status, amount, payment_type, payment_method, customer_name, created_at, visit_at,
       user:profiles!reservations_user_id_fkey (name, phone),
       product:products (title)`
    )
    .eq('hospital_id', hospital.id)
    .not('payment_method', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ payments: data ?? [] });
}
