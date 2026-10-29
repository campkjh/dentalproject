/**
 * 예약 화면의 날짜·시간 가능 판정 — 예전 booking/page.tsx 에 있던 계산을 그대로 옮긴 것.
 * (병원 진료시간 → 30분 칸, 병원이 막은 날·칸, 지난 시각 제외)
 */

export type ScheduleSettings = { disabledDays: string[]; disabledSlots: Record<string, string[]> };
export type TimeGroup = { label: '오전' | '오후' | '저녁'; slots: string[] };
export type HoursByDow = Record<number, { start?: string; end?: string; closed?: boolean }>;

export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
export const DOW_INDEX: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };

const timeGroupLabels: TimeGroup['label'][] = ['오전', '오후', '저녁'];

export function emptyTimeGroups(): TimeGroup[] {
  return timeGroupLabels.map((label) => ({ label, slots: [] }));
}

export function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' → [년, 월(1~12), 일] */
export function parseDateKey(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y, m, d];
}

export function slotTimestamp(year: number, month: number, day: number, time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute || 0, 0, 0).getTime();
}

export function generateTimeSlotsForDay(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) return { '오전': [] as string[], '오후': [] as string[], '저녁': [] as string[] };
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMin = sh * 60 + (sm || 0);
  const endMin = eh * 60 + (em || 0);
  const groups: Record<string, string[]> = { '오전': [], '오후': [], '저녁': [] };
  // 칸은 정각·30분에 맞춘다 — 진료 시작이 10:31 처럼 어긋나 있어도 10:31·11:01 이 아니라 11:00·11:30 …
  for (let m = Math.ceil(startMin / 30) * 30; m < endMin; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const t = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    if (h < 12) groups['오전'].push(t);
    else if (h < 18) groups['오후'].push(t);
    else groups['저녁'].push(t);
  }
  return groups;
}

export function getAvailableTimeGroupsForDay(
  year: number,
  month: number,
  day: number,
  hoursByDow: HoursByDow,
  disabledSlotsByDate: Record<string, string[]>,
  nowMs: number,
) {
  const dow = new Date(year, month - 1, day).getDay();
  const hour = hoursByDow[dow];
  if (!hour || hour.closed) return emptyTimeGroups();

  const dateStr = formatDateKey(year, month, day);
  const disabledSlots = new Set(disabledSlotsByDate[dateStr] ?? []);
  const groups = generateTimeSlotsForDay(hour.start, hour.end);
  const isSelectable = (time: string) => !disabledSlots.has(time) && slotTimestamp(year, month, day, time) > nowMs;

  return timeGroupLabels.map((label) => ({
    label,
    slots: groups[label].filter(isSelectable),
  }));
}

/** 그날 진료시간의 모든 30분 칸(막힌 칸 포함) — 시간 칩 줄을 그릴 때 쓴다 */
export function allSlotsForDay(year: number, month: number, day: number, hoursByDow: HoursByDow) {
  const hour = hoursByDow[new Date(year, month - 1, day).getDay()];
  if (!hour || hour.closed) return [] as string[];
  const g = generateTimeSlotsForDay(hour.start, hour.end);
  return [...g['오전'], ...g['오후'], ...g['저녁']];
}

/** 날짜 하나가 예약 가능한지 — 예전 isAvailable 과 같은 판정 */
export function isDayAvailable(
  year: number,
  month: number,
  day: number,
  hoursByDow: HoursByDow,
  settings: ScheduleSettings,
  nowMs: number,
) {
  const now = new Date(nowMs);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const d = new Date(year, month - 1, day);
  if (d.getTime() < todayMidnight) return false;
  const dateStr = formatDateKey(year, month, day);
  if (settings.disabledDays.includes(dateStr)) return false;
  const hour = hoursByDow[d.getDay()];
  if (!hour || hour.closed || !hour.start || !hour.end) return false;
  return getAvailableTimeGroupsForDay(year, month, day, hoursByDow, settings.disabledSlots, nowMs)
    .some((group) => group.slots.length > 0);
}

/** '2026년 10월 30일 (금)' */
export function formatKDate(key: string) {
  if (!key) return '';
  const [y, m, d] = parseDateKey(key);
  return `${y}년 ${m}월 ${d}일 (${DAY_LABELS[new Date(y, m - 1, d).getDay()]})`;
}

/** '오후 2:30' */
export function formatKTime(v: string) {
  if (!v) return '';
  const [h, m] = v.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(m).padStart(2, '0')}`;
}
