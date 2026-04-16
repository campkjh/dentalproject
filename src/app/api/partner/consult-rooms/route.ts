/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ rooms: [] });

  // Find owner's hospitals
  const { data: hospitals } = await sb.from('hospitals').select('id').eq('owner_id', user.id);
  const hospitalIds = (hospitals ?? []).map((h: { id: string }) => h.id);
  if (!hospitalIds.length) return NextResponse.json({ rooms: [] });

  const { data: rooms, error } = await sb
    .from('consultation_rooms')
    .select(
      `id, user_id, hospital_id, last_message, last_at, created_at,
       user:profiles!consultation_rooms_user_id_fkey (name, profile_image)`
    )
    .in('hospital_id', hospitalIds)
    .order('last_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ rooms: rooms ?? [] });
}
