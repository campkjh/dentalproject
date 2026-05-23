/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

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

function parseScheduleRows(rows: Array<{ day: string | null; is_closed?: boolean | null }>) {
  const disabledDays: string[] = [];
  const disabledSlots: Record<string, string[]> = {};

  for (const row of rows) {
    if (!row.day || !row.is_closed) continue;
    if (row.day.startsWith(DATE_PREFIX)) {
      const date = row.day.slice(DATE_PREFIX.length);
      if (DATE_RE.test(date)) disabledDays.push(date);
    }
    if (row.day.startsWith(SLOT_PREFIX)) {
      const rest = row.day.slice(SLOT_PREFIX.length);
      const date = rest.slice(0, 10);
      const time = rest.slice(11);
      if (!DATE_RE.test(date) || !TIME_RE.test(time)) continue;
      disabledSlots[date] = [...(disabledSlots[date] ?? []), time];
    }
  }

  disabledDays.sort();
  Object.keys(disabledSlots).forEach((date) => disabledSlots[date].sort());
  return { disabledDays, disabledSlots };
}

async function resolveManagedHospitalId(userId: string) {
  const admin = await createAdminClient();
  const { data: ownedHospital } = await admin
    .from('hospitals')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();
  if (ownedHospital?.id) return ownedHospital.id as string;

  const { data: member } = await admin
    .from('doctors')
    .select('hospital_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  return (member?.hospital_id as string | undefined) ?? null;
}

async function readSettings(hospitalId: string) {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('operating_hours')
    .select('day, is_closed')
    .eq('hospital_id', hospitalId);
  if (error) throw error;
  return parseScheduleRows(data ?? []);
}

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await resolveManagedHospitalId(user.id);
  if (!hospitalId) return NextResponse.json({ disabledDays: [], disabledSlots: {} });

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

  const hospitalId = await resolveManagedHospitalId(user.id);
  if (!hospitalId) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

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
