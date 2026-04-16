'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ReservationRow = {
  id: string;
  visit_at: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name: string;
  customer_phone: string;
  payment_type: string | null;
  payment_method: string | null;
  user?: { name?: string; phone?: string } | null;
  product?: { title?: string } | null;
  doctor?: { name?: string } | null;
};

const STATUS: Record<ReservationRow['status'], { label: string; bg: string; text: string }> = {
  pending: { label: '확인 대기', bg: '#FFF8E1', text: '#B45309' },
  confirmed: { label: '확정', bg: '#E6F7EB', text: '#15803D' },
  completed: { label: '내원완료', bg: '#E6F2FF', text: '#1E6FD9' },
  cancelled: { label: '취소', bg: '#F3F4F6', text: '#6B7280' },
};

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getMonthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const firstDay = first.getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let cur: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= lastDate; d++) {
    cur.push(d);
    if (cur.length === 7) {
      weeks.push(cur);
      cur = [];
    }
  }
  if (cur.length) {
    while (cur.length < 7) cur.push(null);
    weeks.push(cur);
  }
  return weeks;
}

export default function PartnerReservationsPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );
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
        const { reservations } = await res.json();
        if (cancelled) return;
        setItems(reservations ?? []);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const weeks = getMonthMatrix(year, month);
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const countByDate = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const r of items) {
      if (!r.visit_at) continue;
      const d = new Date(r.visit_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (key.startsWith(monthStr)) acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, [items, monthStr]);

  const dayList = useMemo(() => {
    return items
      .filter((r) => {
        if (!r.visit_at) return false;
        const d = new Date(r.visit_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key === selectedDate;
      })
      .sort((a, b) => new Date(a.visit_at!).getTime() - new Date(b.visit_at!).getTime());
  }, [items, selectedDate]);

  const prev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth(month - 1);
  };
  const next = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth(month + 1);
  };

  const updateStatus = async (id: string, newStatus: ReservationRow['status']) => {
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'cancelled' ? { cancelReason: '병원 사정으로 취소되었습니다.' } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '상태 변경 실패');
      } else {
        showToast('상태가 변경되었습니다.');
      }
    } catch {
      showToast('네트워크 오류');
    }
  };

  if (!authUser) {
    return (
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">예약 관리</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          상담을 통해 확정된 예약 및 내원 일정을 관리합니다.
        </p>
      </div>

      <div className="grid md:grid-cols-[360px_1fr] gap-4">
        {/* Calendar */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prev} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <h2 className="text-[14px] font-bold text-gray-900">
              {year}년 {month + 1}월
            </h2>
            <button onClick={next} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d, i) => (
              <span
                key={d}
                className="text-center text-[11px] font-semibold py-1.5"
                style={{
                  color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#6B7280',
                }}
              >
                {d}
              </span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((d, di) => {
                if (d === null) return <div key={di} className="aspect-square" />;
                const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
                const selected = dateStr === selectedDate;
                const n = countByDate[dateStr] || 0;
                return (
                  <button
                    key={di}
                    onClick={() => setSelectedDate(dateStr)}
                    className="aspect-square flex flex-col items-center justify-center relative"
                  >
                    <span
                      className="flex items-center justify-center text-[12px]"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        backgroundColor: selected ? '#2B313D' : 'transparent',
                        color: selected
                          ? '#fff'
                          : di === 0
                          ? '#EF4444'
                          : di === 6
                          ? '#3B82F6'
                          : '#2B313D',
                        fontWeight: n > 0 ? 700 : 500,
                      }}
                    >
                      {d}
                    </span>
                    {n > 0 && (
                      <span className="absolute bottom-0 text-[9px] font-bold text-[#7C3AED]">
                        {n}건
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </section>

        {/* Day list */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-[14px] font-bold text-gray-900">{selectedDate} 일정</h2>
            <span className="text-[11px] text-gray-500">{dayList.length}건</span>
          </div>
          {loading ? (
            <div className="py-16 text-center text-[12px] text-gray-400">불러오는 중…</div>
          ) : dayList.length === 0 ? (
            <div className="py-16 text-center text-[12px] text-gray-400">
              해당 날짜에 예약이 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {dayList.map((r) => {
                const sc = STATUS[r.status];
                const visitTime = r.visit_at
                  ? new Date(r.visit_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                  : '';
                return (
                  <li key={r.id} className="p-4 flex items-start gap-3">
                    <div className="flex-shrink-0 w-14 text-center">
                      <p className="text-[16px] font-extrabold text-gray-900">{visitTime}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-[13px] font-bold text-gray-900">
                          {r.user?.name ?? r.customer_name ?? '환자'}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {r.user?.phone ?? r.customer_phone}
                        </span>
                        <select
                          value={r.status}
                          onChange={(e) =>
                            updateStatus(r.id, e.target.value as ReservationRow['status'])
                          }
                          className="text-[11px] font-bold rounded px-2 py-0.5 border-0 outline-none cursor-pointer"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {(['pending', 'confirmed', 'completed', 'cancelled'] as const).map((s) => (
                            <option key={s} value={s}>
                              {STATUS[s].label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[12px] text-gray-700">{r.product?.title ?? '예약'}</p>
                      {r.doctor?.name && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{r.doctor.name} 원장</p>
                      )}
                      {r.payment_method && (
                        <p className="text-[11px] text-gray-400 mt-0.5">결제: {r.payment_method}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
