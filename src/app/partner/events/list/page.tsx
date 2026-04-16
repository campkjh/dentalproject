'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Star, Search, X } from 'lucide-react';

type EventRow = {
  id: string;
  country: '🇰🇷' | '🇯🇵' | '🇨🇳';
  title: string;
  thumb: string;
  period: string;
  price: number;
  category: string;
  consults: number;
  rating: number;
  ratingCount: number;
  visible: boolean;
};

const ITEMS: EventRow[] = [
  {
    id: 'evt-1041',
    country: '🇰🇷',
    title: '눈매교정 + 쌍꺼풀 자연유착',
    thumb: '🦴',
    period: '2026-04-10 ~ 2026-05-10',
    price: 1800000,
    category: '눈성형',
    consults: 124,
    rating: 4.8,
    ratingCount: 68,
    visible: true,
  },
  {
    id: 'evt-1039',
    country: '🇯🇵',
    title: '코끝 재수술 3D',
    thumb: '🦴',
    period: '2026-04-05 ~ 2026-05-05',
    price: 3200000,
    category: '코성형',
    consults: 87,
    rating: 4.6,
    ratingCount: 42,
    visible: true,
  },
  {
    id: 'evt-1035',
    country: '🇰🇷',
    title: '리프팅 올드클래식 15라인',
    thumb: '🦴',
    period: '2026-03-28 ~ 2026-04-28',
    price: 2400000,
    category: '리프팅',
    consults: 212,
    rating: 4.9,
    ratingCount: 140,
    visible: false,
  },
];

export default function EventsListPage() {
  const [items, setItems] = useState<EventRow[]>(ITEMS);
  const [q, setQ] = useState('');
  const [periodEvt, setPeriodEvt] = useState<EventRow | null>(null);

  const filtered = items.filter(
    (i) => !q || i.title.includes(q) || i.id.includes(q)
  );

  const toggle = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">이벤트 목록</h1>
          <p className="text-[12px] text-gray-500 mt-1">총 {items.length}건</p>
        </div>
        <Link
          href="/partner/events/new"
          className="px-3 py-2 rounded-lg bg-[#7C3AED] text-white text-[12px] font-semibold btn-press flex items-center gap-1"
        >
          <Plus size={13} /> 이벤트 등록
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div
          className="flex items-center gap-2 px-3"
          style={{ height: 34, borderRadius: 9999, backgroundColor: '#F4F5F7', maxWidth: 320 }}
        >
          <Search size={14} className="text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이벤트명·ID 검색"
            className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[960px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">ID</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">국가</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">이벤트</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">기간</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">가격</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">카테고리</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">상담 수</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">평점(건수)</th>
              <th className="px-3 py-2.5 text-center font-semibold text-gray-600">노출</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{e.id}</td>
                <td className="px-3 py-3 text-gray-700 text-[14px]">{e.country}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                      {e.thumb}
                    </div>
                    <p className="text-gray-900 font-semibold line-clamp-1">{e.title}</p>
                  </div>
                </td>
                <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{e.period}</td>
                <td className="px-3 py-3 text-right text-gray-900 font-bold whitespace-nowrap">
                  {e.price.toLocaleString()}원
                </td>
                <td className="px-3 py-3 text-gray-700">{e.category}</td>
                <td className="px-3 py-3 text-right text-gray-900 font-semibold">{e.consults}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <Star size={11} fill="#FBBF24" stroke="#FBBF24" />
                    <span className="text-gray-900 font-semibold">{e.rating.toFixed(1)}</span>
                    <span className="text-gray-400">({e.ratingCount})</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[11px] font-bold"
                    style={{
                      backgroundColor: e.visible ? '#E6F7EB' : '#F3F4F6',
                      color: e.visible ? '#15803D' : '#6B7280',
                    }}
                  >
                    {e.visible ? '노출' : '미노출'}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggle(e.id)}
                      className="px-2 py-1 rounded text-[11px] font-semibold border border-gray-200 hover:bg-gray-50"
                    >
                      노출 변경
                    </button>
                    <Link
                      href={`/partner/events/${e.id}/edit`}
                      className="px-2 py-1 rounded text-[11px] font-semibold border border-gray-200 hover:bg-gray-50"
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => setPeriodEvt(e)}
                      className="px-2 py-1 rounded text-[11px] font-semibold border border-gray-200 hover:bg-gray-50"
                    >
                      기간변경
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {periodEvt && (
        <PeriodModal
          event={periodEvt}
          onClose={() => setPeriodEvt(null)}
          onSave={(newPeriod) => {
            setItems((prev) =>
              prev.map((i) => (i.id === periodEvt.id ? { ...i, period: newPeriod } : i))
            );
            setPeriodEvt(null);
          }}
        />
      )}
    </div>
  );
}

function PeriodModal({
  event,
  onClose,
  onSave,
}: {
  event: EventRow;
  onClose: () => void;
  onSave: (period: string) => void;
}) {
  const [startDate, endDate] = event.period.split(' ~ ');
  const [newEnd, setNewEnd] = useState(endDate);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-3 modal-overlay-enter"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-5 modal-content-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-gray-900">기간 변경</h3>
          <button onClick={onClose}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="mb-4">
          <p className="text-[11px] text-gray-500 mb-1">이벤트</p>
          <p className="text-[13px] font-semibold text-gray-900 line-clamp-1">{event.title}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{event.id}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-[11px] text-gray-500 mb-1">시작일</p>
            <input
              type="date"
              value={startDate}
              readOnly
              className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded text-[12px] text-gray-500"
            />
            <p className="text-[10px] text-gray-400 mt-1">시작일은 수정 불가</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 mb-1">종료일</p>
            <input
              type="date"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="w-full px-2.5 py-2 border border-gray-200 rounded text-[12px] outline-none focus:border-[#7C3AED]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700"
          >
            취소
          </button>
          <button
            onClick={() => onSave(`${startDate} ~ ${newEnd}`)}
            className="flex-1 py-2.5 rounded-lg bg-[#7C3AED] text-white text-[12px] font-bold btn-press"
          >
            변경 저장
          </button>
        </div>
      </div>
    </div>
  );
}
