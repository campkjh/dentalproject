/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function resolveHospitalId(sb: any, hospitalIdOrSlug: string) {
  if (/^[0-9a-f]{8}-/.test(hospitalIdOrSlug)) return hospitalIdOrSlug;
  const { data } = await sb.from('hospitals').select('id').eq('slug', hospitalIdOrSlug).maybeSingle();
  return data?.id ?? null;
}

/**
 * POST /api/consult/rooms { hospitalId }
 * Creates (if needed) and returns the room id for the authenticated user + hospital.
 */
export async function POST(req: NextRequest) {
  const { hospitalId } = await req.json();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hId = await resolveHospitalId(sb, hospitalId);
  if (!hId) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  // Try get
  const { data: existing } = await sb
    .from('consultation_rooms')
    .select('id')
    .eq('user_id', user.id)
    .eq('hospital_id', hId)
    .maybeSingle();

  if (existing) return NextResponse.json({ id: existing.id });

  const { data: created, error } = await sb
    .from('consultation_rooms')
    .insert({ user_id: user.id, hospital_id: hId })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: created.id });
}
