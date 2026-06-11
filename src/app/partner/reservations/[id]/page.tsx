'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { normalizeProductImageUrl } from '@/lib/images';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import { useReservationRealtimeRefresh } from '@/lib/realtime/reservations';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';

type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

type ReservationDetail = {
  id: string;
  status: ReservationStatus;
  visit_at: string | null;
  reservation_at: string | null;
  cancel_at?: string | null;
  cancel_reason?: string | null;
  amount: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_type: string | null;
  payment_method: string | null;
  schedule_history?: {
    id: string;
    title: string;
    content: string;
    created_at?: string | null;
  }[];
  hospital?: { id?: string | null; name?: string | null; address?: string | null; location?: string | null } | null;
  product?: { title?: string | null; image_url?: string | null; price?: number | null } | null;
  doctor?: { name?: string | null; title?: string | null } | null;
  user?: { name?: string | null; phone?: string | null } | null;
};

const STATUS_COPY: Record<ReservationStatus, { label: string; color: string }> = {
  pending: { label: '예약확인중...', color: '#FF8A50' },
  confirmed: { label: '예약확정', color: '#00C781' },
  completed: { label: '진료완료', color: '#8037FF' },
  cancelled: { label: '취소', color: '#A4ABBA' },
};

const TIME_OPTIONS = [
  { label: '9:00오전', hour: 9, minute: 0 },
  { label: '10:00오전', hour: 10, minute: 0 },
  { label: '11:00오전', hour: 11, minute: 0 },
  { label: '12:00오후', hour: 12, minute: 0 },
  { label: '1:00오후', hour: 13, minute: 0 },
  { label: '2:00오후', hour: 14, minute: 0 },
  { label: '3:00오후', hour: 15, minute: 0 },
  { label: '4:00오후', hour: 16, minute: 0 },
  { label: '5:00오후', hour: 17, minute: 0 },
  { label: '6:00오후', hour: 18, minute: 0 },
];

function fmtDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}년${d.getMonth() + 1}월${d.getDate()}일`;
}

function fmtDateTime(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const period = d.getHours() < 12 ? '오전' : '오후';
  const hour = d.getHours() % 12 || 12;
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}년${d.getMonth() + 1}월${d.getDate()}일 ${period} ${hour}:${minute}`;
}

function money(value?: number | null) {
  if (typeof value !== 'number') return '-';
  return `${value.toLocaleString('ko-KR')}원`;
}

function toDate(value?: string | null) {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function getApiIso(date: Date) {
  return date.toISOString();
}

function sameMinute(a?: string | null, b?: string | null) {
  if (!a || !b) return a === b;
  const left = new Date(a);
  const right = new Date(b);
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return a === b;
  return Math.floor(left.getTime() / 60000) === Math.floor(right.getTime() / 60000);
}

function monthDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: lastDate }, (_, index) => index + 1),
  ];
}

export default function PartnerReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const showConfirm = useStore((s) => s.showConfirm);
  const { authUser } = useSession();
  const {
    data: hospitalData,
    mutate: mutateHospital,
  } = useMyHospitalData<unknown, ReservationDetail>(authUser?.id, { revalidateOnMount: false });
  const cachedReservation = useMemo(
    () => hospitalData?.reservations.find((row) => row.id === params.id) ?? null,
    [hospitalData?.reservations, params.id]
  );
  const [reservation, setReservation] = useState<ReservationDetail | null>(() => cachedReservation);
  const [loading, setLoading] = useState(() => !cachedReservation);
  const [initialHadCachedReservation] = useState(() => Boolean(cachedReservation));
  const [updating, setUpdating] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [draftSchedule, setDraftSchedule] = useState<Date>(() => new Date());
  const [viewDate, setViewDate] = useState<Date>(() => new Date());

  const loadReservation = useCallback(async (options: { showLoading?: boolean; syncPicker?: boolean } = {}) => {
    const { showLoading = false, syncPicker = true } = options;
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${params.id}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || '예약 정보를 불러오지 못했습니다.');
      const data = payload.reservation as ReservationDetail;
      const initialSchedule = toDate(data.reservation_at ?? data.visit_at);
      setReservation(data);
      mutateHospital((current) => current
        ? {
          ...current,
          reservations: current.reservations.some((row) => row.id === data.id)
            ? current.reservations.map((row) => (row.id === data.id ? data : row))
            : [data, ...current.reservations],
        }
        : current
      );
      if (syncPicker) {
        setDraftSchedule(initialSchedule);
        setViewDate(new Date(initialSchedule.getFullYear(), initialSchedule.getMonth(), 1));
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '예약 정보를 불러오지 못했습니다.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [mutateHospital, params.id, showToast]);

  useEffect(() => {
    void loadReservation({ showLoading: !initialHadCachedReservation });
  }, [initialHadCachedReservation, loadReservation]);

  useEffect(() => {
    if (!reservation && cachedReservation) {
      const initialSchedule = toDate(cachedReservation.reservation_at ?? cachedReservation.visit_at);
      setReservation(cachedReservation);
      setDraftSchedule(initialSchedule);
      setViewDate(new Date(initialSchedule.getFullYear(), initialSchedule.getMonth(), 1));
      setLoading(false);
    }
  }, [cachedReservation, reservation]);

  useReservationRealtimeRefresh({
    enabled: Boolean(reservation?.hospital?.id),
    hospitalId: reservation?.hospital?.id,
    onChange: () => loadReservation({ showLoading: false, syncPicker: false }),
  });

  const statusCopy = STATUS_COPY[reservation?.status ?? 'pending'];
  const address = reservation?.hospital?.address ?? reservation?.hospital?.location ?? '';
  const customerName = reservation?.user?.name ?? reservation?.customer_name ?? '-';
  const customerPhone = reservation?.user?.phone ?? reservation?.customer_phone ?? '-';
  const paymentMethod = reservation?.payment_method ?? 'KB국민카드';
  const productImage = normalizeProductImageUrl(reservation?.product?.image_url);
  const scheduleHistory = reservation?.schedule_history ?? [];
  const isChanged = !sameMinute(reservation?.reservation_at, getApiIso(draftSchedule));
  const days = useMemo(() => monthDays(viewDate), [viewDate]);
  const matchedTimeOption = TIME_OPTIONS.find((item) => (
    item.hour === draftSchedule.getHours() && item.minute === draftSchedule.getMinutes()
  ));
  const currentTimeLabel = matchedTimeOption?.label ?? fmtDateTime(getApiIso(draftSchedule)).split(' ').slice(-2).join(' ');

  const patchReservation = useCallback((updater: (current: ReservationDetail | null) => ReservationDetail | null) => {
    setReservation((current) => {
      const next = updater(current);
      if (next) {
        mutateHospital((cached) => cached
          ? {
            ...cached,
            reservations: cached.reservations.some((row) => row.id === next.id)
              ? cached.reservations.map((row) => (row.id === next.id ? next : row))
              : [next, ...cached.reservations],
          }
          : cached
        );
      }
      return next;
    });
  }, [mutateHospital]);

  const updateStatus = async (status: 'confirmed') => {
    if (updating) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/reservations/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || '예약 상태 변경에 실패했습니다.');
      patchReservation((prev) => prev ? { ...prev, status } : prev);
      showToast('예약을 확정했습니다.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '예약 상태 변경에 실패했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const submitSchedule = () => {
    if (!reservation || updating) return;
    showConfirm(
      '정말로 스케줄을 변경 하시겠습니까?',
      '변경된 스케줄이 고객에게 전달됩니다.',
      async () => {
        setUpdating(true);
        try {
          const nextSchedule = getApiIso(draftSchedule);
          const res = await fetch(`/api/reservations/${params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservationAt: nextSchedule }),
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(payload.error || '스케줄 변경에 실패했습니다.');
          patchReservation((prev) => prev ? { ...prev, reservation_at: nextSchedule, schedule_history: payload.scheduleHistory ?? prev.schedule_history } : prev);
          setShowSchedulePicker(false);
          showToast('스케줄 변경완료');
        } catch (error) {
          showToast(error instanceof Error ? error.message : '스케줄 변경에 실패했습니다.');
        } finally {
          setUpdating(false);
        }
      }
    );
  };

  const changeMonth = (delta: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const selectDay = (day: number) => {
    setDraftSchedule((current) => {
      const next = new Date(current);
      next.setFullYear(viewDate.getFullYear(), viewDate.getMonth(), day);
      return next;
    });
  };

  const selectTime = (value: string) => {
    const option = TIME_OPTIONS.find((item) => item.label === value);
    if (!option) return;
    setDraftSchedule((current) => {
      const next = new Date(current);
      next.setHours(option.hour, option.minute, 0, 0);
      return next;
    });
  };

  const renderBottomAction = () => {
    if (!reservation || reservation.status === 'cancelled' || reservation.status === 'completed') return null;

    if (reservation.status === 'pending') {
      return (
        <div className="partner-detail-bottom is-split">
          <button type="button" onClick={() => updateStatus('confirmed')} disabled={updating}>
            {updating ? '처리중...' : '예약확정'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => router.push(`/partner/reservations/${params.id}/cancel`)}
            disabled={updating}
          >
            취소하기
          </button>
        </div>
      );
    }

    return (
      <div className="partner-detail-bottom">
        <button
          type="button"
          onClick={() => {
            if (!showSchedulePicker) {
              setShowSchedulePicker(true);
              return;
            }
            if (!isChanged) {
              showToast('변경할 스케줄을 선택해주세요.');
              return;
            }
            submitSchedule();
          }}
          disabled={updating}
        >
          {updating ? '변경중...' : '스케줄변경'}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-white">
      <header className="partner-cancel-topbar">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기">
          <ChevronLeft size={28} strokeWidth={2.2} />
        </button>
        <h1>정보</h1>
      </header>

      {loading ? (
        <div className="partner-loading">불러오는 중...</div>
      ) : !reservation ? (
        <div className="partner-empty-state compact">
          <p>예약 정보를 찾을 수 없습니다.</p>
        </div>
      ) : (
        <main className="partner-cancel-page partner-detail-page">
          <section className="partner-cancel-card">
            <div className="partner-cancel-card-head">
              <strong style={{ color: statusCopy.color }}>{statusCopy.label}</strong>
              <span>
                {fmtDate(reservation.reservation_at)}
                {reservation.status !== 'cancelled' && <ChevronRight size={24} strokeWidth={2.5} />}
              </span>
            </div>

            <div className="partner-cancel-product">
              {productImage ? (
                <img src={productImage} alt="" />
              ) : (
                <div aria-hidden="true" />
              )}
              <div>
                <h2>{reservation.product?.title ?? '상품 정보 없음'}</h2>
                <p>{reservation.hospital?.name ?? '병원명 미등록'}</p>
                <p>{address || '주소 미등록'}</p>
              </div>
            </div>

            <dl className="partner-cancel-facts">
              <div>
                <dt>방문일시</dt>
                <dd>{fmtDateTime(reservation.visit_at)}</dd>
              </div>
              <div>
                <dt>예약일시</dt>
                <dd>
                  {reservation.status === 'confirmed' ? (
                    <button type="button" className="partner-detail-date-pill" onClick={() => setShowSchedulePicker(true)}>
                      {fmtDateTime(getApiIso(draftSchedule))}
                      <ChevronRight size={22} strokeWidth={2.5} />
                    </button>
                  ) : (
                    fmtDateTime(reservation.reservation_at)
                  )}
                </dd>
              </div>
              {reservation.status === 'cancelled' && (
                <div>
                  <dt>취소일시</dt>
                  <dd>{fmtDateTime(reservation.cancel_at)}</dd>
                </div>
              )}
              <div>
                <dt>금액</dt>
                <dd>{money(reservation.amount)}</dd>
              </div>
            </dl>
          </section>

          {reservation.status === 'cancelled' && (
            <section className="partner-cancel-card partner-cancel-reason">
              <h2>취소내용</h2>
              <p>{reservation.cancel_reason || '취소 사유가 없습니다.'}</p>
            </section>
          )}

          {scheduleHistory.length > 0 && (
            <section className="partner-cancel-card partner-cancel-reason">
              <h2>변경내역</h2>
              <p>{scheduleHistory[0].content}</p>
            </section>
          )}

          <section className="partner-cancel-card partner-cancel-customer">
            <h2>고객정보</h2>
            <dl>
              <div>
                <dt>이름</dt>
                <dd>{customerName}</dd>
              </div>
              <div>
                <dt>전화번호</dt>
                <dd>{customerPhone}</dd>
              </div>
              <div>
                <dt>결제분류</dt>
                <dd><span>앱결제</span></dd>
              </div>
              <div>
                <dt>결제수단</dt>
                <dd>{paymentMethod}</dd>
              </div>
            </dl>
          </section>

          <section className="partner-cancel-policy">
            <h2><Info size={17} /> 병원정책</h2>
            <p>
              서비스 내 병원 예약은 원활한 진료 운영과 다른 이용자의 예약 기회를 보호하기 위해 아래의 취소 정책이 적용됩니다.
              예약 취소는 고객에게 즉시 전달되며, 스케줄 변경 시 변경된 예약일시가 고객에게 전달됩니다.
            </p>
          </section>
        </main>
      )}

      {showSchedulePicker && reservation?.status === 'confirmed' && (
        <div className="partner-detail-picker-layer" onClick={() => setShowSchedulePicker(false)}>
          <div className="partner-detail-picker" onClick={(event) => event.stopPropagation()}>
            <div className="partner-detail-picker-head">
              <strong>{viewDate.getMonth() + 1}월 {viewDate.getFullYear()}년</strong>
              <div>
                <button type="button" aria-label="이전 달" onClick={() => changeMonth(-1)}>
                  <ChevronLeft size={30} strokeWidth={2.5} />
                </button>
                <button type="button" aria-label="다음 달" onClick={() => changeMonth(1)}>
                  <ChevronRight size={30} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="partner-detail-weekdays">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="partner-detail-calendar">
              {days.map((day, index) => day ? (
                <button
                  key={`${viewDate.getFullYear()}-${viewDate.getMonth()}-${day}`}
                  type="button"
                  className={draftSchedule.getFullYear() === viewDate.getFullYear()
                    && draftSchedule.getMonth() === viewDate.getMonth()
                    && draftSchedule.getDate() === day ? 'is-selected' : ''}
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ))}
            </div>
            <div className="partner-detail-picker-time">
              <span>시간</span>
              <select value={currentTimeLabel} onChange={(event) => selectTime(event.target.value)} aria-label="예약 시간">
                {!matchedTimeOption && <option value={currentTimeLabel}>{currentTimeLabel}</option>}
                {TIME_OPTIONS.map((option) => (
                  <option key={option.label} value={option.label}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {renderBottomAction()}

    </div>
  );
}
