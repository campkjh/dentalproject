/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/my-hospital/hours
 * Body: { hours: [{ day, start_time, end_time, is_closed }] }
 */
export async function PUT(req: NextRequest) {
  const { hours } = await req.json();
  if (!Array.isArray(hours)) {
    return NextResponse.json({ error: 'hours must be an array' }, { status: 400 });
  }
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data: hospital } = await sb
    .from('hospitals')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!hospital) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  const rows = hours.map((h: any) => ({
    hospital_id: hospital.id,
    day: h.day,
    start_time: h.is_closed ? null : h.start_time ?? null,
    end_time: h.is_closed ? null : h.end_time ?? null,
    is_closed: !!h.is_closed,
  }));

  const { error } = await sb
    .from('operating_hours')
    .upsert(rows, { onConflict: 'hospital_id,day' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
