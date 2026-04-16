'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Reservation = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  customer: string;
  phone: string;
  procedure: string;
  surgeon?: string;
  status: '확정' | '대기' | '내원완료' | '취소';
  memo?: string;
};

const INITIAL: Reservation[] = [
  { id: 'r1', date: '2026-04-20', time: '11:00', customer: '이지은', phone: '010-1234-5678', procedure: '쌍꺼풀 상담', surgeon: '김정우 원장', status: '확정' },
  { id: 'r2', date: '2026-04-20', time: '14:30', customer: '박민수', phone: '010-2345-6789', procedure: '코 수술 상담', status: '대기' },
  { id: 'r3', date: '2026-04-22', time: '10:00', customer: '김하늘', phone: '010-3456-7890', procedure: '리프팅 상담', surgeon: '이서연 원장', status: '확정' },
  { id: 'r4', date: '2026-04-18', time: '16:00', customer: '정유나', phone: '010-4567-8901', procedure: '보톡스', surgeon: '김정우 원장', status: '내원완료' },
  { id: 'r5', date: '2026-04-25', time: '15:30', customer: '유리', phone: '010-5678-9012', procedure: '필러', status: '확정' },
];

const STATUS_COLOR: Record<Reservation['status'], { bg: string; text: string }> = {
  확정: { bg: '#E6F7EB', text: '#15803D' },
  대기: { bg: '#FFF8E1', text: '#B45309' },
  내원완료: { bg: '#E6F2FF', text: '#1E6FD9' },
  취소: { bg: '#F3F4F6', text: '#6B7280' },
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

export default function ReservationsPage() {
  const today = new Date('2026-04-16');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>('2026-04-20');
  const [items, setItems] = useState<Reservation[]>(INITIAL);

  const weeks = getMonthMatrix(year, month);
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const countByDate = items.reduce<Record<string, number>>((acc, r) => {
    if (r.date.startsWith(monthStr)) acc[r.date] = (acc[r.date] || 0) + 1;
    return acc;
  }, {});

  const dayList = items
    .filter((r) => r.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

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

  const updateStatus = (id: string, s: Reservation['status']) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: s } : r)));
  };

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
                      <span
                        className="absolute bottom-0 text-[9px] font-bold px-1 rounded-sm"
                        style={{
                          color: selected ? '#fff' : '#5B8B25',
                          backgroundColor: selected ? 'transparent' : 'transparent',
                        }}
                      >
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
            <h2 className="text-[14px] font-bold text-gray-900">
              {selectedDate} 일정
            </h2>
            <span className="text-[11px] text-gray-500">{dayList.length}건</span>
          </div>
          {dayList.length === 0 ? (
            <div className="py-16 text-center text-[12px] text-gray-400">
              해당 날짜에 예약이 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {dayList.map((r) => {
                const sc = STATUS_COLOR[r.status];
                return (
                  <li key={r.id} className="p-4 flex items-start gap-3">
                    <div className="flex-shrink-0 w-14 text-center">
                      <p className="text-[16px] font-extrabold text-gray-900">{r.time}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-[13px] font-bold text-gray-900">{r.customer}</span>
                        <span className="text-[11px] text-gray-500">{r.phone}</span>
                        <select
                          value={r.status}
                          onChange={(e) =>
                            updateStatus(r.id, e.target.value as Reservation['status'])
                          }
                          className="text-[11px] font-bold rounded px-2 py-0.5 border-0 outline-none"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {(['확정', '대기', '내원완료', '취소'] as const).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[12px] text-gray-700">{r.procedure}</p>
                      {r.surgeon && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{r.surgeon}</p>
                      )}
                    </div>
                    <button className="flex-shrink-0 text-[11px] font-semibold text-[#5B8B25] border border-[#8DC63F] rounded px-2 py-1">
                      문자발송
                    </button>
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
