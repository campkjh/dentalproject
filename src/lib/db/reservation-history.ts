/* eslint-disable @typescript-eslint/no-explicit-any */

type NotificationRow = {
  id: string;
  title?: string | null;
  content?: string | null;
  link?: string | null;
  created_at?: string | null;
};

export type ReservationScheduleHistoryItem = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export function formatScheduleDate(value?: string | null) {
  if (!value) return '일정 미정';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '일정 미정';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function buildScheduleChangeContent(hospitalName: string, previous?: string | null, next?: string | null) {
  const before = formatScheduleDate(previous);
  const after = formatScheduleDate(next);
  return `${hospitalName}의 예약일시가 ${before}에서 ${after}(으)로 변경되었습니다.`;
}

function isScheduleNotification(row: NotificationRow) {
  const text = `${row.title ?? ''} ${row.content ?? ''}`;
  return text.includes('스케줄') || text.includes('예약일시');
}

function reservationIdFromLink(link?: string | null) {
  if (!link) return null;
  const match = link.match(/\/(?:partner\/)?reservations\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function normalizeScheduleNotification(row: NotificationRow): ReservationScheduleHistoryItem {
  return {
    id: row.id,
    title: row.title ?? '예약일시 변경',
    content: row.content ?? '',
    created_at: row.created_at ?? '',
  };
}

export function attachScheduleHistory<T extends { id: string }>(
  reservations: T[],
  notifications: NotificationRow[]
) {
  const historyMap = new Map<string, ReservationScheduleHistoryItem[]>();

  for (const row of notifications) {
    if (!isScheduleNotification(row)) continue;
    const reservationId = reservationIdFromLink(row.link);
    if (!reservationId) continue;
    const current = historyMap.get(reservationId) ?? [];
    current.push(normalizeScheduleNotification(row));
    historyMap.set(reservationId, current);
  }

  return reservations.map((reservation) => ({
    ...reservation,
    schedule_history: (historyMap.get(reservation.id) ?? []).sort((a, b) => (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )),
  }));
}

export async function getScheduleHistoryForReservation(admin: any, reservationId: string) {
  const { data } = await admin
    .from('notifications')
    .select('id, title, content, link, created_at')
    .in('link', [`/reservations/${reservationId}`, `/partner/reservations/${reservationId}`])
    .order('created_at', { ascending: false })
    .limit(20);

  return (data ?? [])
    .filter(isScheduleNotification)
    .map(normalizeScheduleNotification);
}
