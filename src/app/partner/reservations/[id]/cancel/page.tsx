'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Info, X } from 'lucide-react';
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

function money(value?: number | null) {
  if (typeof value !== 'number') return '-';
  return `${value.toLocaleString('ko-KR')}원`;
}

export default function PartnerReservationCancelPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
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
  const [confirming, setConfirming] = useState(false);

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
    if (reservation?.status === 'cancelled') return { label: '취소', color: '#A4ABBA' };
    return { label: '예약취소', color: '#FF8A50' };
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

  const submit = async () => {
    if (!canSubmit) {
      showToast('고객에게 전달할 취소 사유를 5자 이상 입력해주세요.');
      return;
    }
    setConfirming(false);
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
        <main className="partner-cancel-page">
          <section className="partner-cancel-card">
            <div className="partner-cancel-card-head">
              <strong style={{ color: statusCopy.color }}>{statusCopy.label}</strong>
              <span>{fmtDate(reservation.reservation_at)}</span>
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
                <dd>{fmtDateTime(reservation.reservation_at)}</dd>
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

          <section className="partner-cancel-card partner-cancel-reason">
            <h2>취소내용</h2>
            {reservation.status === 'cancelled' ? (
              <p>{reservation.cancel_reason || '취소 사유가 없습니다.'}</p>
            ) : (
              <>
                <p className="partner-cancel-helper">작성한 내용이 고객에게 예약 취소 사유로 전달됩니다.</p>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="예: 안녕하세요 고객님. 해당일 병원 휴진으로 부득이하게 예약을 취소합니다. 불편을 드려 죄송합니다."
                  rows={7}
                />
                <div className="partner-cancel-presets">
                  {REASON_PRESETS.map((preset) => (
                    <button key={preset} type="button" onClick={() => setReason(preset)}>
                      {preset}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="partner-cancel-policy">
            <h2><Info size={17} /> 병원정책</h2>
            <p>서비스 내 병원 예약은 원활한 진료 운영과 다른 이용자의 예약 기회를 보호하기 위해 취소 사유가 고객에게 전달됩니다.</p>
          </section>
        </main>
      )}

      {reservation?.status !== 'cancelled' && (
        <div className="partner-cancel-bottom">
          <button type="button" onClick={() => setConfirming(true)} disabled={!canSubmit}>
            {submitting ? '전달 중...' : '예약취소 전달'}
          </button>
        </div>
      )}

      {confirming && (
        <div className="partner-cancel-dialog-backdrop">
          <div className="partner-cancel-dialog" role="dialog" aria-modal="true">
            <h2>예약을 취소하시겠습니까?</h2>
            <p>작성한 취소 사유가 고객에게 전달됩니다.</p>
            <div>
              <button type="button" onClick={submit}>네</button>
              <button type="button" onClick={() => setConfirming(false)}>아니요</button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <button type="button" className="partner-cancel-dialog-close" aria-label="닫기" onClick={() => setConfirming(false)}>
          <X size={24} />
        </button>
      )}
    </div>
  );
}
