import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { parseHospitalSchedule } from '@/lib/hospital-schedule';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const hospitalIdOrSlug = req.nextUrl.searchParams.get('hospitalId');
  if (!hospitalIdOrSlug) return NextResponse.json({ error: '병원 ID가 필요합니다.' }, { status: 400 });

  const admin = await createAdminClient();
  const query = admin.from('hospitals').select('id');
  const { data: hospital } = /^[0-9a-f]{8}-/i.test(hospitalIdOrSlug)
    ? await query.eq('id', hospitalIdOrSlug).maybeSingle()
    : await query.eq('slug', hospitalIdOrSlug).maybeSingle();

  if (!hospital?.id) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  const { data, error } = await admin
    .from('operating_hours')
    .select('day, start_time, end_time, is_closed')
    .eq('hospital_id', hospital.id);

  if (error) return NextResponse.json({ error: '예약 가능 시간을 불러오지 못했습니다.' }, { status: 500 });

  return NextResponse.json(parseHospitalSchedule(data ?? []), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
