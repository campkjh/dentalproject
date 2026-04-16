import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ settlements: [] });

  const { data: hospital } = await sb.from('hospitals').select('id').eq('owner_id', user.id).maybeSingle();
  if (!hospital) return NextResponse.json({ settlements: [] });

  const { data } = await sb
    .from('hospital_settlements')
    .select('*')
    .eq('hospital_id', hospital.id)
    .order('period_end', { ascending: false });

  return NextResponse.json({ settlements: data ?? [] });
}
