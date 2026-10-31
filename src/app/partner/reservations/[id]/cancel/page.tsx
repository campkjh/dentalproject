'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { normalizeProductImageUrl } from '@/lib/images';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';

type ReservationDetail = {
  id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  visit_at: string | null;
  reservation_at: string | null;
  cancel_at?: string | null;
  cancel_reason?: string | null;
  amount: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_type: string | null;
  payment_method: string | null;
  hospital?: { name?: string | null; address?: string | null; location?: string | null } | null;
  product?: { title?: string | null; image_url?: string | null; price?: number | null } | null;
  user?: { name?: string | null; phone?: string | null } | null;
};

const REASON_PRESETS = [
  '해당일 병원 휴진으로 예약 진행이 어렵습니다.',
  '담당 의료진 일정 변경으로 예약을 취소합니다.',
  '예약 가능 시간이 잘못 열려 예약을 취소합니다.',
  '장비 점검 일정으로 예약 진행이 어렵습니다.',
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

function money(value?: number | null) {
  if (typeof value !== 'number') return '-';
  return `${value.toLocaleString('ko-KR')}원`;
}

export default function PartnerReservationCancelPage() {
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
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(() => !cachedReservation);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/reservations/${params.id}`, { cache: 'no-store' })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || '예약 정보를 불러오지 못했습니다.');
        return payload.reservation as ReservationDetail;
      })
      .then((data) => {
        if (!alive) return;
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
        setReason(data.cancel_reason ?? '');
      })
      .catch((error) => {
        if (!alive) return;
        showToast(error.message || '예약 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [mutateHospital, params.id, showToast]);

  useEffect(() => {
    if (!reservation && cachedReservation) {
      setReservation(cachedReservation);
      setReason(cachedReservation.cancel_reason ?? '');
      setLoading(false);
    }
  }, [cachedReservation, reservation]);

  const customerName = reservation?.user?.name ?? reservation?.customer_name ?? '-';
  const customerPhone = reservation?.user?.phone ?? reservation?.customer_phone ?? '-';
  const paymentMethod = reservation?.payment_method ?? reservation?.payment_type ?? '후불';
  const address = reservation?.hospital?.address ?? reservation?.hospital?.location ?? '';
  const productImage = normalizeProductImageUrl(reservation?.product?.image_url);
  const canSubmit = reason.trim().length >= 5 && !submitting && reservation?.status !== 'cancelled';

  const statusCopy = useMemo(() => {
    if (reservation?.status === 'cancelled') return { label: '취소', tone: 'bg-[#FFEEEF] text-[#F04452]', guide: '이미 취소된 예약이에요' };
    return { label: '예약취소', tone: 'bg-[#FFEEEF] text-[#F04452]', guide: '고객에게 전달할 취소 사유를 적어 주세요' };
  }, [reservation?.status]);

  const patchReservation = (updater: (current: ReservationDetail | null) => ReservationDetail | null) => {
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
  };

  const submit = () => {
    if (!canSubmit) {
      showToast('고객에게 전달할 취소 사유를 5자 이상 입력해주세요.');
      return;
    }
    showConfirm(
      '예약을 취소하시겠습니까?',
      '작성한 취소 사유가 고객에게 전달됩니다.',
      async () => {
        setSubmitting(true);
        try {
          const res = await fetch(`/api/reservations/${params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled', cancelReason: reason.trim() }),
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(payload.error || '예약 취소에 실패했습니다.');
          patchReservation((current) => current
            ? {
              ...current,
              status: 'cancelled',
              cancel_reason: reason.trim(),
              cancel_at: current.cancel_at ?? new Date().toISOString(),
            }
            : current
          );
          showToast('예약 취소 사유를 고객에게 전달했습니다.');
          router.replace(`/partner/reservations/${params.id}`);
        } catch (error) {
          showToast(error instanceof Error ? error.message : '예약 취소에 실패했습니다.');
        } finally {
          setSubmitting(false);
        }
      }
    );
  };

  const showBottom = reservation?.status !== 'cancelled';

  return (
    <div className="pd-detail min-h-full bg-white page-enter" style={{ paddingBottom: showBottom ? 'max(calc(env(safe-area-inset-bottom, 0px) + 112px), 128px)' : 48 }}>
      {/* 머리 = 고객 상세 머리(TopBar) — 56 줄 둥근 뒤로 + 아래 큰 제목 */}
      <TopBar title="예약 취소" />

      {loading ? (
        <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
      ) : !reservation ? (
        <p className="py-20 text-center text-[15px] text-[#8B95A1]">예약 정보를 찾을 수 없어요.</p>
      ) : (
        <>
          {/* ─── 상태 · 상품 · 금액 · 일정 ─── */}
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

            <div className="mt-4 rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
              <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">앱결제</span>
              <p className="mt-3 text-[15px] font-semibold text-[#1E3A78]">예약 금액</p>
              <p className="mt-0.5 text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]">{money(reservation.amount)}</p>
            </div>

            <div className="mt-3">
              <InfoRows
                rows={[
                  { label: '방문일시', value: fmtDateTime(reservation.visit_at) },
                  { label: '예약일시', value: fmtDateTime(reservation.reservation_at) },
                  ...(reservation.status === 'cancelled' ? [{ label: '취소일시', value: fmtDateTime(reservation.cancel_at) }] : []),
                  { label: '주소', value: address || '주소 미등록' },
                ]}
              />
            </div>
          </div>

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

          {/* ─── 취소 내용 ─── */}
          <Band />
          <div className="px-5 py-7">
            <SectionTitle>취소 내용</SectionTitle>
            {reservation.status === 'cancelled' ? (
              <p className="mt-4 whitespace-pre-line rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[15px] leading-[1.6] text-[#333D4B]">
                {reservation.cancel_reason || '취소 사유가 없어요.'}
              </p>
            ) : (
              <>
                <p className="mt-1.5 text-[15px] leading-[1.6] text-[#6B7684]">적은 내용이 고객에게 예약 취소 사유로 전달돼요.</p>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="예: 안녕하세요 고객님. 해당일 병원 휴진으로 부득이하게 예약을 취소합니다. 불편을 드려 죄송합니다."
                  rows={6}
                  className="mt-4 w-full resize-none rounded-[14px]! border-0! bg-[#F2F4F6]! px-4! py-3.5! text-[16px]! font-normal! leading-[1.6]! text-[#191F28]! shadow-none! outline-none transition-colors placeholder:text-[#B0B8C1] focus:bg-[#EDEFF2]! focus:shadow-none!"
                />
                <p className={`mt-1.5 text-right text-[13px] tabular-nums ${reason.trim().length >= 5 ? 'text-[#8B95A1]' : 'text-[#B0B8C1]'}`}>
                  {reason.trim().length}자 · 5자 이상
                </p>

                <p className="mt-4 text-[15px] font-semibold text-[#4E5968]">자주 쓰는 사유</p>
                <div className="mt-1">
                  {REASON_PRESETS.map((preset) => {
                    const on = reason === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setReason(preset)}
                        className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[16px] px-2 py-3 text-left transition-colors active:bg-[#F9FAFB]"
                      >
                        <span key={String(on)} className={`chk-dot flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? 'is-on bg-[#2F6FE4]' : 'is-off border-2 border-[#E5E8EB]'}`}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={on ? '#fff' : '#D1D6DB'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                        </span>
                        <span className={`min-w-0 flex-1 break-keep text-[16px] leading-[1.5] ${on ? 'font-semibold text-[#191F28]' : 'text-[#333D4B]'}`}>{preset}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ─── 병원 정책 ─── */}
          <Band />
          <div className="px-5 py-7">
            <SectionTitle>병원 정책</SectionTitle>
            <p className="mt-4 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
              <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
              <span className="min-w-0 flex-1">서비스 안 병원 예약은 원활한 진료 운영과 다른 이용자의 예약 기회를 지키기 위해 취소 사유가 고객에게 전달돼요.</span>
            </p>
          </div>
        </>
      )}

      {/* ─── 바닥 버튼 — 흐림 띠 위에 떠 있다 ─── */}
      {showBottom && (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40" style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)' }}>
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, white 30%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0) 100%)',
              maskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
            }}
          />
          <div className="pointer-events-auto relative mx-auto max-w-[608px] pt-10">
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#F04452] transition-all active:scale-[0.98] disabled:text-[#B0B8C1]"
            >
              {submitting ? '전달 중…' : '예약 취소 전달하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
