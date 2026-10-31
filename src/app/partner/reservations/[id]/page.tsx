'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import CommunityModal from '@/components/community/CommunityModal';
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

// 상태 배지 — 대기=회색 · 확정=파랑 · 완료=초록 · 취소=빨강(고객 예약 상세와 같은 색)
const STATUS_COPY: Record<ReservationStatus, { label: string; tone: string; guide: string }> = {
  pending: { label: '확인 대기', tone: 'bg-[#F2F4F6] text-[#6B7684]', guide: '예약을 확인하고 확정해 주세요' },
  confirmed: { label: '예약확정', tone: 'bg-[#E8F3FF] text-[#3180F7]', guide: '확정된 예약이에요. 일정을 바꿀 수 있어요' },
  completed: { label: '진료완료', tone: 'bg-[#E6F7EE] text-[#03A94D]', guide: '진료를 마친 예약이에요' },
  cancelled: { label: '취소', tone: 'bg-[#FFEEEF] text-[#F04452]', guide: '취소된 예약이에요' },
};

function InfoRows({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} className="flex min-h-11 items-center py-1.5">
          <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">{r.label}</span>
          <span className="min-w-0 flex-1 break-keep text-[17px] text-[#333D4B]">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

const Band = () => <div className="h-2.5 bg-[#F2F4F6]" />;
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[20px]! font-bold leading-tight! tracking-[-0.4px] text-[#191F28]">{children}</h2>
);

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
      showToast('예약을 확정했어요.');
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
          showToast('스케줄을 변경했어요.');
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

  // 스케줄 변경 버튼 — 처음 누르면 달력 시트를 열고, 연 뒤엔 바뀐 일정을 보낸다
  const onScheduleButton = () => {
    if (!showSchedulePicker) {
      setShowSchedulePicker(true);
      return;
    }
    if (!isChanged) {
      showToast('바꿀 날짜나 시간을 골라 주세요.');
      return;
    }
    submitSchedule();
  };

  const primaryBtn = 'flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98] disabled:bg-[#F2F4F6] disabled:text-[#B0B8C1]';

  const renderBottomAction = () => {
    if (!reservation || reservation.status === 'cancelled' || reservation.status === 'completed') return null;

    if (reservation.status === 'pending') {
      return (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/partner/reservations/${params.id}/cancel`)}
            disabled={updating}
            className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#F04452] transition-all active:scale-[0.98] disabled:text-[#B0B8C1]"
          >
            취소하기
          </button>
          <button type="button" onClick={() => updateStatus('confirmed')} disabled={updating} className={primaryBtn}>
            {updating ? '처리 중…' : '예약 확정하기'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex">
        <button type="button" onClick={onScheduleButton} disabled={updating} className={primaryBtn}>
          {updating ? '변경 중…' : '스케줄 변경하기'}
        </button>
      </div>
    );
  };

  const action = renderBottomAction();
  const selectedInView = (day: number) => draftSchedule.getFullYear() === viewDate.getFullYear()
    && draftSchedule.getMonth() === viewDate.getMonth()
    && draftSchedule.getDate() === day;

  return (
    <div className="pd-detail min-h-full bg-white page-enter" style={{ paddingBottom: action ? 'max(calc(env(safe-area-inset-bottom, 0px) + 112px), 128px)' : 48 }}>
      {/* 머리 = 고객 상세 머리(TopBar) — 56 줄 둥근 뒤로 + 아래 큰 제목 */}
      <TopBar title="예약 정보" />

      {loading ? (
        <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
      ) : !reservation ? (
        <p className="py-20 text-center text-[15px] text-[#8B95A1]">예약 정보를 찾을 수 없어요.</p>
      ) : (
        <>
          {/* ─── 상태 · 상품 · 금액 카드 · 일정 ─── */}
          <div className="px-5 pb-5 pt-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-7 items-center rounded-[6px] px-2 text-[14px] font-bold ${statusCopy.tone}`}>{statusCopy.label}</span>
              <span className="min-w-0 truncate text-[15px] text-[#4E5968]">{statusCopy.guide}</span>
              <span className="ml-auto shrink-0 text-[14px] tabular-nums text-[#8B95A1]">{fmtDate(reservation.reservation_at)}</span>
            </div>

            <div className="mt-4 flex items-center gap-3.5 py-2">
              {productImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={productImage} alt="" className="h-[56px] w-[56px] shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
              ) : (
                <span aria-hidden className="h-[56px] w-[56px] shrink-0 rounded-[14px] bg-[#F2F4F6]" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-bold text-[#191F28]">{reservation.product?.title ?? '상품 정보 없음'}</span>
                <span className="mt-0.5 block truncate text-[14px] text-[#8B95A1]">{reservation.hospital?.name ?? '병원명 미등록'}</span>
              </span>
            </div>

            {/* 금액 카드 — 상품 상세 가격 카드와 같은 연파랑 · 남색 */}
            <div className="mt-4 rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
              <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">앱결제</span>
              <p className="mt-3 text-[15px] font-semibold text-[#1E3A78]">예약 금액</p>
              <p className="mt-0.5 text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]">{money(reservation.amount)}</p>
            </div>

            <div className="mt-3">
              <InfoRows
                rows={[
                  { label: '방문일시', value: fmtDateTime(reservation.visit_at) },
                  {
                    label: '예약일시',
                    value: reservation.status === 'confirmed' ? (
                      <button
                        type="button"
                        onClick={() => setShowSchedulePicker(true)}
                        className="-my-1 inline-flex min-h-9 items-center gap-0.5 rounded-[10px] bg-[#F2F4F6] pl-3 pr-2 text-left text-[16px] font-semibold text-[#191F28] transition-all active:scale-[0.98] active:bg-[#E5E8EB]"
                      >
                        {fmtDateTime(getApiIso(draftSchedule))}
                        <ChevronRight size={18} className="shrink-0 text-[#8B95A1]" />
                      </button>
                    ) : (
                      fmtDateTime(reservation.reservation_at)
                    ),
                  },
                  ...(reservation.status === 'cancelled' ? [{ label: '취소일시', value: fmtDateTime(reservation.cancel_at) }] : []),
                  ...(reservation.doctor?.name ? [{ label: '담당', value: `${reservation.doctor.name} ${reservation.doctor.title || '원장'}` }] : []),
                  { label: '주소', value: address || '주소 미등록' },
                ]}
              />
            </div>
          </div>

          {/* ─── 취소 내용 ─── */}
          {reservation.status === 'cancelled' && (
            <>
              <Band />
              <div className="px-5 py-7">
                <SectionTitle>취소 내용</SectionTitle>
                <p className="mt-4 whitespace-pre-line rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[15px] leading-[1.6] text-[#333D4B]">
                  {reservation.cancel_reason || '취소 사유가 없어요.'}
                </p>
              </div>
            </>
          )}

          {/* ─── 일정 변경 기록 ─── */}
          {scheduleHistory.length > 0 && (
            <>
              <Band />
              <div className="px-5 py-7">
                <SectionTitle>변경 내역</SectionTitle>
                <div className="mt-3">
                  {scheduleHistory.map((h) => (
                    <div key={h.id} className="py-2.5">
                      <p className="text-[16px] font-semibold text-[#333D4B]">{h.title}</p>
                      <p className="mt-0.5 text-[15px] text-[#4E5968]">{h.content}</p>
                      {h.created_at && <p className="mt-0.5 text-[13px] text-[#B0B8C1]">{fmtDateTime(h.created_at)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─── 고객 ─── */}
          <Band />
          <div className="px-5 py-7">
            <SectionTitle>고객 정보</SectionTitle>
            <div className="mt-3">
              <InfoRows
                rows={[
                  { label: '이름', value: customerName },
                  { label: '전화번호', value: customerPhone },
                  { label: '결제분류', value: <span className="inline-flex h-6 items-center rounded-[6px] bg-[#E8F3FF] px-2 text-[13.5px] font-semibold text-[#3180F7]">앱결제</span> },
                  { label: '결제수단', value: paymentMethod },
                ]}
              />
            </div>
          </div>

          {/* ─── 병원 정책 ─── */}
          <Band />
          <div className="px-5 py-7">
            <SectionTitle>병원 정책</SectionTitle>
            <p className="mt-4 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
              <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
              <span className="min-w-0 flex-1">
                서비스 안 병원 예약은 원활한 진료 운영과 다른 이용자의 예약 기회를 지키기 위해 취소 정책이 적용돼요.
                예약을 취소하면 고객에게 바로 전달되고, 스케줄을 바꾸면 바뀐 예약일시가 고객에게 전달돼요.
              </span>
            </p>
          </div>
        </>
      )}

      {/* ─── 스케줄 고르기 시트 ─── */}
      {showSchedulePicker && reservation?.status === 'confirmed' && (
        <CommunityModal label="스케줄 변경" onClose={() => setShowSchedulePicker(false)}>
          <div className="overflow-y-auto px-5 pb-5 pt-1">
            <div className="flex items-center justify-between">
              <strong className="text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">{viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월</strong>
              <div className="-mr-2 flex gap-1">
                <button type="button" aria-label="이전 달" onClick={() => changeMonth(-1)} className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[#4E5968] active:bg-[#F2F4F6]">
                  <ChevronLeft size={24} strokeWidth={2.4} />
                </button>
                <button type="button" aria-label="다음 달" onClick={() => changeMonth(1)} className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[#4E5968] active:bg-[#F2F4F6]">
                  <ChevronRight size={24} strokeWidth={2.4} />
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 text-center">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day} className="text-[13px] font-medium text-[#8B95A1]">{day}</span>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-y-1">
              {days.map((day, index) => day ? (
                <button
                  key={`${viewDate.getFullYear()}-${viewDate.getMonth()}-${day}`}
                  type="button"
                  onClick={() => selectDay(day)}
                  className="flex h-11 items-center justify-center transition-transform active:scale-[0.93]"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-[12px] text-[17px] tabular-nums transition-colors ${selectedInView(day) ? 'bg-[#2F6FE4] font-bold text-white' : 'font-medium text-[#333D4B]'}`}>
                    {day}
                  </span>
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="text-[17px] font-semibold text-[#4E5968]">시간</span>
              <select
                value={currentTimeLabel}
                onChange={(event) => selectTime(event.target.value)}
                aria-label="예약 시간"
                className="h-12 min-w-[140px] rounded-[14px] bg-[#F2F4F6] px-4 text-[16px] font-semibold text-[#191F28] outline-none focus:bg-[#EDEFF2]"
              >
                {!matchedTimeOption && <option value={currentTimeLabel}>{currentTimeLabel}</option>}
                {TIME_OPTIONS.map((option) => (
                  <option key={option.label} value={option.label}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setShowSchedulePicker(false)} className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968] transition-all active:scale-[0.98]">
                닫기
              </button>
              <button type="button" onClick={onScheduleButton} disabled={updating} className={primaryBtn}>
                {updating ? '변경 중…' : '이 일정으로 변경'}
              </button>
            </div>
          </div>
        </CommunityModal>
      )}

      {/* ─── 바닥 버튼 — 흐림 띠 위에 떠 있다(고객 예약 상세와 같은 결) ─── */}
      {action && (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40" style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)' }}>
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, white 30%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0) 100%)',
              maskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
            }}
          />
          <div className="pointer-events-auto relative mx-auto max-w-[608px] pt-10">{action}</div>
        </div>
      )}
    </div>
  );
}
