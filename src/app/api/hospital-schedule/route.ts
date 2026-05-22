/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const DATE_PREFIX = 'date:';
const SLOT_PREFIX = 'slot:';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

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

  return { disabledDays, disabledSlots };
}

export async function GET(req: NextRequest) {
  const hospitalIdOrSlug = req.nextUrl.searchParams.get('hospitalId');
  if (!hospitalIdOrSlug) return NextResponse.json({ disabledDays: [], disabledSlots: {} });

  const admin = await createAdminClient();
  const query = admin.from('hospitals').select('id');
  const { data: hospital } = /^[0-9a-f]{8}-/i.test(hospitalIdOrSlug)
    ? await query.eq('id', hospitalIdOrSlug).maybeSingle()
    : await query.eq('slug', hospitalIdOrSlug).maybeSingle();

  if (!hospital?.id) return NextResponse.json({ disabledDays: [], disabledSlots: {} });

  const { data, error } = await admin
    .from('operating_hours')
    .select('day, is_closed')
    .eq('hospital_id', hospital.id);

  if (error) return NextResponse.json({ disabledDays: [], disabledSlots: {} });

  return NextResponse.json(parseScheduleRows(data ?? []), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
