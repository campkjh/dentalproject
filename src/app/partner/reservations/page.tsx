'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ReservationRow = {
  id: string;
  visit_at: string | null;
  reservation_at?: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string | null;
  customer_phone?: string | null;
  payment_type?: string | null;
  payment_method?: string | null;
  memo?: string | null;
  user?: { name?: string | null; phone?: string | null } | null;
  product?: { title?: string | null } | null;
  doctor?: { name?: string | null } | null;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getMonthCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const prevLast = new Date(year, month, 0).getDate();
  const currentLast = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date; muted: boolean }> = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevLast - i), muted: true });
  }
  for (let d = 1; d <= currentLast; d++) {
    cells.push({ date: new Date(year, month, d), muted: false });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    cells.push({ date: new Date(year, month + 1, nextDay++), muted: true });
  }
  return cells;
}

function timeOf(value?: string | null) {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function ReservationScheduleCard({ row }: { row: ReservationRow }) {
  const name = row.user?.name ?? row.customer_name ?? '환자';
  const phone = row.user?.phone ?? row.customer_phone ?? '010-1234-5123';
  const doctor = row.doctor?.name ? `${row.doctor.name} 원장` : '미지정';
  const assigned = doctor !== '미지정';
  const isPaid = row.payment_type === 'app' || row.payment_method === 'app' || row.payment_method === '앱결제';

  return (
    <article className="partner-schedule-card">
      <div className="partner-schedule-row top">
        <div>
          <strong>{timeOf(row.visit_at)}</strong>
          <span>{name} <em>여/20</em></span>
          <span>{phone}</span>
        </div>
        <ChevronRight size={22} strokeWidth={2.2} />
      </div>
      <div className="partner-schedule-row">
        <strong>{row.product?.title ?? '예약 상품'}</strong>
        <div className="partner-badge-row">
          {isPaid && <span className="blue">앱결제</span>}
          <span>앱예약</span>
        </div>
      </div>
      <div className="partner-schedule-row">
        <p>
          담당 <em className={assigned ? 'purple' : undefined}>{doctor}</em>
        </p>
        <button type="button">{assigned ? '변경' : '지정'}</button>
      </div>
      <div className="partner-schedule-memo">
        {row.memo || (row.status === 'confirmed' ? '[즉시확정완료]' : '희망일1: 2026/03/25 11:00\n희망일2: 2026/04/25 12:00...')}
      </div>
    </article>
  );
}

export default function PartnerReservationsPage() {
  const { authUser } = useSession();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(dateKey(now));
  const [items, setItems] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);

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
        if (!cancelled) setItems(data.reservations ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const cells = useMemo(() => getMonthCells(year, month), [year, month]);
  const countByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of items) {
      if (!row.visit_at) continue;
      const key = dateKey(new Date(row.visit_at));
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const dayItems = useMemo(() => {
    return items
      .filter((row) => row.visit_at && dateKey(new Date(row.visit_at)) === selected)
      .sort((a, b) => new Date(a.visit_at ?? 0).getTime() - new Date(b.visit_at ?? 0).getTime());
  }, [items, selected]);

  const selectedDate = new Date(selected);

  if (!authUser) {
    return (
      <div className="partner-empty-state">
        <p>로그인이 필요합니다.</p>
        <Link href="/partner/login">로그인</Link>
      </div>
    );
  }

  return (
    <div className="partner-mobile-screen">
      <header className="partner-screen-title with-action">
        <h1>예약관리</h1>
        <nav className="partner-inline-segment" aria-label="예약관리 탭">
          <a className="is-active">병원예약</a>
          <a>예약설정</a>
        </nav>
      </header>

      <section className="partner-calendar-section">
        <button
          type="button"
          className="partner-month-label"
          onClick={() => {
            setYear(now.getFullYear());
            setMonth(now.getMonth());
            setSelected(dateKey(now));
          }}
        >
          {month + 1}월
        </button>

        <div className="partner-weekdays">
          {WEEKDAYS.map((day, index) => (
            <span key={day} className={index === 0 || index === 6 ? 'weekend' : undefined}>
              {day}
            </span>
          ))}
        </div>

        <div className="partner-calendar-grid">
          {cells.map(({ date, muted }) => {
            const key = dateKey(date);
            const active = key === selected;
            const count = countByDate[key] ?? 0;
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <button
                key={key}
                type="button"
                className={[
                  active ? 'is-active' : '',
                  count > 0 ? 'has-event' : '',
                  muted ? 'is-muted' : '',
                  weekend ? 'is-weekend' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  setSelected(key);
                  setYear(date.getFullYear());
                  setMonth(date.getMonth());
                }}
              >
                <span>{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="partner-schedule-section">
        <h2>
          오늘 {Number.isNaN(selectedDate.getTime()) ? month + 1 : selectedDate.getMonth() + 1}월
          {Number.isNaN(selectedDate.getTime()) ? now.getDate() : selectedDate.getDate()}일
        </h2>
        {loading ? (
          <div className="partner-loading small">불러오는 중...</div>
        ) : dayItems.length === 0 ? (
          <div className="partner-empty-state compact">
            <p>해당 날짜에 예약이 없습니다.</p>
            <span>예약이 등록되면 시간순으로 표시됩니다.</span>
          </div>
        ) : (
          <div className="partner-schedule-list">
            {dayItems.map((row) => (
              <ReservationScheduleCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
