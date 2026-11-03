/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getOwnedHospital } from '@/lib/owned-hospital';

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
  // 심사 중 병원도 운영시간을 고칠 수 있게 서버 권한으로 찾는다
  const { hospital, error: ownedError } = await getOwnedHospital({ ownerOnly: true });
  if (ownedError) return ownedError;

  const rows = hours.map((h: any) => ({
    hospital_id: hospital.id,
    day: h.day,
    start_time: h.is_closed ? null : h.start_time ?? null,
    end_time: h.is_closed ? null : h.end_time ?? null,
    is_closed: !!h.is_closed,
  }));

  // operating_hours 테이블에 RLS 쓰기 정책 없음 → admin client로 upsert
  const admin = await createAdminClient();
  const { error } = await admin
    .from('operating_hours')
    .upsert(rows, { onConflict: 'hospital_id,day' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
