'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ReservationRow = {
  id: string;
  visit_at: string | null;
  reservation_at?: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  amount?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  user?: { name?: string | null; phone?: string | null } | null;
  product?: { title?: string | null; image_url?: string | null } | null;
};

type HospitalRow = {
  id: string;
  name?: string | null;
  address?: string | null;
  location?: string | null;
};

const FALLBACK_IMAGE = '/images/banner_img_1751346038.jpg';
const FILTERS = ['all', 'pending', 'confirmed', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: '전체',
  pending: '새로운예약',
  confirmed: '확정된예약',
  cancelled: '취소된예약',
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}년${d.getMonth() + 1}월${d.getDate()}일`;
}

function formatVisit(value?: string | null) {
  if (!value) return '일정 미정';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '일정 미정';
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours < 12 ? '오전' : '오후';
  const hour12 = hours % 12 || 12;
  return `${d.getFullYear()}년${d.getMonth() + 1}월${d.getDate()}일 ${period} ${hour12}:${minutes}`;
}

function money(value?: number | null) {
  return `${(value ?? 0).toLocaleString('ko-KR')}원`;
}

function getStatus(row: ReservationRow) {
  if (row.status === 'confirmed' || row.status === 'completed') {
    return { label: '예약확정', tone: 'confirmed' as const };
  }
  if (row.status === 'cancelled') {
    return { label: '예약취소', tone: 'cancelled' as const };
  }
  return { label: '예약확인중...', tone: 'pending' as const };
}

function ReservationCard({
  row,
  hospital,
  onStatus,
}: {
  row: ReservationRow;
  hospital: HospitalRow | null;
  onStatus: (id: string, status: ReservationRow['status']) => void;
}) {
  const status = getStatus(row);
  const customerName = row.user?.name ?? row.customer_name ?? '예약자';
  const title = row.product?.title ?? '예약 상품';
  const hospitalName = hospital?.name ?? '병원명';
  const address = hospital?.address ?? hospital?.location ?? '주소 정보 없음';

  return (
    <article className="partner-reservation-card">
      <div className="partner-reservation-card-head">
        <strong className={`is-${status.tone}`}>{status.label}</strong>
        <span>
          {formatDate(row.reservation_at ?? row.visit_at)}
          <ChevronRight size={22} strokeWidth={2.2} />
        </span>
      </div>
      <div className="partner-reservation-card-body">
        <div className="partner-reservation-product">
          <img src={row.product?.image_url || FALLBACK_IMAGE} alt="" />
          <div>
            <h2>{title}</h2>
            <p>{hospitalName}</p>
            <p>{address}</p>
          </div>
        </div>
        <dl className="partner-reservation-facts">
          <div>
            <dt>예약자</dt>
            <dd>{customerName}</dd>
          </div>
          <div>
            <dt>예약일시</dt>
            <dd>{formatVisit(row.visit_at)}</dd>
          </div>
          <div>
            <dt>금액</dt>
            <dd>{money(row.amount)}</dd>
          </div>
        </dl>
        {row.status === 'pending' && (
          <div className="partner-reservation-actions">
            <button type="button" onClick={() => onStatus(row.id, 'confirmed')}>
              예약확정
            </button>
            <button type="button" onClick={() => onStatus(row.id, 'cancelled')}>
              예약취소
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function PartnerHomePage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [hospital, setHospital] = useState<HospitalRow | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setHospital(data.hospital ?? null);
        setReservations(data.reservations ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const counts = useMemo(() => {
    return {
      all: reservations.length,
      pending: reservations.filter((r) => r.status === 'pending').length,
      confirmed: reservations.filter((r) => r.status === 'confirmed' || r.status === 'completed').length,
      cancelled: reservations.filter((r) => r.status === 'cancelled').length,
    };
  }, [reservations]);

  const visible = useMemo(() => {
    const rows = [...reservations].sort((a, b) => {
      const ad = new Date(a.visit_at ?? a.reservation_at ?? 0).getTime();
      const bd = new Date(b.visit_at ?? b.reservation_at ?? 0).getTime();
      return bd - ad;
    });
    if (filter === 'all') return rows;
    if (filter === 'confirmed') return rows.filter((r) => r.status === 'confirmed' || r.status === 'completed');
    return rows.filter((r) => r.status === filter);
  }, [filter, reservations]);

  const updateStatus = async (id: string, status: ReservationRow['status']) => {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(status === 'cancelled' ? { cancelReason: '병원 사정으로 취소되었습니다.' } : {}),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        showToast(payload.error || '예약 상태 변경에 실패했습니다.');
      } else {
        showToast(status === 'confirmed' ? '예약을 확정했습니다.' : '예약을 취소했습니다.');
      }
    } catch {
      showToast('네트워크 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div className="partner-loading">불러오는 중...</div>;
  }

  if (!hospital) {
    return (
      <div className="partner-empty-state">
        <p>등록된 병원이 없습니다.</p>
        <span>병원 등록 후 파트너센터를 이용할 수 있습니다.</span>
        <Link href="/hospital/register">병원 등록하기</Link>
      </div>
    );
  }

  return (
    <div className="partner-mobile-screen">
      <header className="partner-screen-title">
        <h1>홈</h1>
      </header>

      <div className="partner-home-filter hide-scrollbar">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={filter === item ? 'is-active' : undefined}
          >
            <span>{FILTER_LABEL[item]}</span>
            {counts[item] > 0 && <span>{counts[item]}</span>}
          </button>
        ))}
      </div>

      <section className="partner-reservation-stack">
        {visible.length === 0 ? (
          <div className="partner-empty-state compact">
            <p>표시할 예약이 없습니다.</p>
            <span>예약이 접수되면 이 화면에 바로 표시됩니다.</span>
          </div>
        ) : (
          visible.map((row) => (
            <ReservationCard key={row.id} row={row} hospital={hospital} onStatus={updateStatus} />
          ))
        )}
      </section>
    </div>
  );
}
