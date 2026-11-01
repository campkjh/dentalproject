// 병원 고객관리 — 목록(예약관리 › 고객관리)과 고객 상세(/partner/customers/[key])가 같이 쓰는 모양·표기(261101).
// 자료는 /api/my-hospital/customers 하나에서 온다(고객 키 = 'u:<user_id>' 또는 'n:<이름>|<전화 숫자>').

export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type CustomerReservation = {
  id: string;
  status: ReservationStatus;
  visit_at: string | null;
  reservation_at: string | null;
  created_at: string | null;
  amount: number | null;
  product_title: string | null;
};

export type CustomerRow = {
  key: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  visits: number;
  total: number;
  cancelled: number;
  paid: number;
  last_visit_at: string | null;
  last_activity_at: string | null;
  reservations: CustomerReservation[];
};

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: '확인 대기',
  confirmed: '예약확정',
  completed: '진료완료',
  cancelled: '취소',
};

/** 상태 배지 색 — 대기=회색 · 확정=파랑 · 완료=초록 · 취소=빨강 */
export function reservationStatusTone(status: ReservationStatus) {
  if (status === 'completed') return 'bg-[#E6F7EE] text-[#03A94D]';
  if (status === 'confirmed') return 'bg-[#E8F3FF] text-[#3180F7]';
  if (status === 'cancelled') return 'bg-[#FFEEEF] text-[#F04452]';
  return 'bg-[#F2F4F6] text-[#6B7684]';
}

export function timeOf(value?: string | null) {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function wonOf(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return `${value.toLocaleString('ko-KR')}원`;
}

export function monthDayOf(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const prefix = d.getFullYear() !== new Date().getFullYear() ? `${d.getFullYear()}년 ` : '';
  return `${prefix}${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 고객 상세 주소 — 키에 한글·'|' 가 들어가 인코딩한다 */
export function customerHref(key: string) {
  return `/partner/customers/${encodeURIComponent(key)}`;
}
