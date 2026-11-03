import { DOW_INDEX, generateTimeSlotsForDay, type HoursByDow, type ScheduleSettings } from '@/components/booking/schedule';

export type OperatingHoursRow = { day: string | null; start_time?: string | null; end_time?: string | null; is_closed?: boolean | null };
export type HospitalSchedule = ScheduleSettings & { hoursByDow: HoursByDow };

export function parseHospitalSchedule(rows: OperatingHoursRow[]): HospitalSchedule {
  const hoursByDow: HoursByDow = {};
  const disabledDays: string[] = [];
  const disabledSlots: Record<string, string[]> = {};
  for (const row of rows) {
    const day = row.day ?? '';
    if (DOW_INDEX[day] !== undefined) {
      hoursByDow[DOW_INDEX[day]] = { start: row.start_time?.slice(0, 5), end: row.end_time?.slice(0, 5), closed: !!row.is_closed };
    } else if (row.is_closed && /^date:\d{4}-\d{2}-\d{2}$/.test(day)) {
      disabledDays.push(day.slice(5));
    } else if (row.is_closed && /^slot:\d{4}-\d{2}-\d{2}:\d{2}:\d{2}$/.test(day)) {
      const date = day.slice(5, 15);
      (disabledSlots[date] ??= []).push(day.slice(16));
    }
  }
  return { hoursByDow, disabledDays: disabledDays.sort(), disabledSlots };
}

/** Always interpret an ISO instant in the hospital's timezone, including UTC inputs. */
export function hospitalVisitParts(visitAt: Date) {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(visitAt);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  const date = `${part('year')}-${part('month')}-${part('day')}`;
  const time = `${part('hour')}:${part('minute')}`;
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return { date, time, dow };
}

export function isHospitalVisitAvailable(visitAt: Date, schedule: HospitalSchedule) {
  if (!Number.isFinite(visitAt.getTime()) || visitAt.getUTCSeconds() || visitAt.getUTCMilliseconds()) return false;
  const { date, time, dow } = hospitalVisitParts(visitAt);
  const hours = schedule.hoursByDow[dow];
  if (!hours || hours.closed || schedule.disabledDays.includes(date) || schedule.disabledSlots[date]?.includes(time)) return false;
  return Object.values(generateTimeSlotsForDay(hours.start, hours.end)).flat().includes(time);
}
