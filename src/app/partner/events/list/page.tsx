'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Star, Search } from 'lucide-react';

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
                    <button className="px-2 py-1 rounded text-[11px] font-semibold border border-gray-200 hover:bg-gray-50">
                      수정
                    </button>
                    <button className="px-2 py-1 rounded text-[11px] font-semibold border border-gray-200 hover:bg-gray-50">
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
    </div>
  );
}
