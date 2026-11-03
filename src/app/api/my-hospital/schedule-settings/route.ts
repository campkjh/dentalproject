import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getOwnedHospital } from '@/lib/owned-hospital';
import { parseHospitalSchedule } from '@/lib/hospital-schedule';
import { allSlotsForDay } from '@/components/booking/schedule';

export const dynamic = 'force-dynamic';

const DATE_PREFIX = 'date:';
const SLOT_PREFIX = 'slot:';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function dayKey(date: string) {
  return `${DATE_PREFIX}${date}`;
}

function slotKey(date: string, time: string) {
  return `${SLOT_PREFIX}${date}:${time}`;
}

async function resolveManagedHospitalId() {
  const owned = await getOwnedHospital();
  return owned.hospital?.id ?? null;
}

async function readSettings(hospitalId: string) {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('operating_hours')
    .select('day, start_time, end_time, is_closed')
    .eq('hospital_id', hospitalId);
  if (error) throw error;
  return parseHospitalSchedule(data ?? []);
}

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await resolveManagedHospitalId();
  if (!hospitalId) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  try {
    const settings = await readSettings(hospitalId);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '예약설정을 불러오지 못했습니다.' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as {
    date?: unknown;
    time?: unknown;
    disabled?: unknown;
    allDay?: unknown;
  };

  const date = typeof body.date === 'string' ? body.date : '';
  const time = typeof body.time === 'string' ? body.time : '';
  const disabled = Boolean(body.disabled);
  const allDay = Boolean(body.allDay);

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  if (!allDay && !TIME_RE.test(time)) {
    return NextResponse.json({ error: '시간 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await resolveManagedHospitalId();
  if (!hospitalId) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  if (!allDay) {
    const settings = await readSettings(hospitalId);
    const [year, month, day] = date.split('-').map(Number);
    if (!allSlotsForDay(year, month, day, settings.hoursByDow).includes(time)) return NextResponse.json({ error: '병원 운영시간 내 30분 단위 시간을 선택해주세요.' }, { status: 400 });
  }
  const key = allDay ? dayKey(date) : slotKey(date, time);
  const admin = await createAdminClient();

  const { count } = await admin
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('hospital_id', hospitalId)
    .in('status', ['pending', 'confirmed'])
    .gte('visit_at', `${date}T00:00:00+09:00`)
    .lte('visit_at', `${date}T23:59:59+09:00`);

  if (disabled) {
    const { error } = await admin
      .from('operating_hours')
      .upsert(
        {
          hospital_id: hospitalId,
          day: key,
          start_time: allDay ? null : time,
          end_time: allDay ? null : time,
          is_closed: true,
        },
        { onConflict: 'hospital_id,day' }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await admin
      .from('operating_hours')
      .delete()
      .eq('hospital_id', hospitalId)
      .eq('day', key);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const settings = await readSettings(hospitalId);
  return NextResponse.json({ ok: true, reservationCount: count ?? 0, ...settings });
}
