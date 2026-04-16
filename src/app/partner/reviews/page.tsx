'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ReviewRow = {
  id: string;
  rating: number;
  content: string;
  treatment_name: string | null;
  treatment_date: string | null;
  total_cost: number;
  before_image: string | null;
  after_image: string | null;
  created_at: string;
  author?: { name?: string } | null;
  doctor?: { name?: string } | null;
};

export default function PartnerReviewsPage() {
  const { authUser } = useSession();
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'전체' | '5점' | '4점이하'>('전체');

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
        const { reviews } = await res.json();
        if (cancelled) return;
        setItems(reviews ?? []);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const filtered = useMemo(() => {
    if (filter === '전체') return items;
    if (filter === '5점') return items.filter((r) => Number(r.rating) >= 5);
    return items.filter((r) => Number(r.rating) < 5);
  }, [items, filter]);

  const avgRating = useMemo(() => {
    if (!items.length) return 0;
    return items.reduce((s, r) => s + Number(r.rating), 0) / items.length;
  }, [items]);

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
        <h1 className="text-[18px] font-bold text-gray-900">후기 관리</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          내 병원에 등록된 환자 후기를 확인하세요.
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-6">
        <div className="text-center">
          <div className="flex items-center gap-1 justify-center mb-1">
            <Star size={20} fill="#FBBF24" stroke="#FBBF24" />
            <span className="text-[24px] font-extrabold">{avgRating.toFixed(1)}</span>
          </div>
          <p className="text-[11px] text-gray-500">평균 평점</p>
        </div>
        <div className="w-px h-10 bg-gray-200" />
        <div className="text-center">
          <p className="text-[24px] font-extrabold">{items.length}</p>
          <p className="text-[11px] text-gray-500">총 후기</p>
        </div>
        <div className="w-px h-10 bg-gray-200" />
        <div className="text-center">
          <p className="text-[24px] font-extrabold">
            {items.filter((r) => Number(r.rating) >= 4.5).length}
          </p>
          <p className="text-[11px] text-gray-500">고평가 후기</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['전체', '5점', '4점이하'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-bold border"
            style={{
              backgroundColor: filter === f ? '#2B313D' : '#fff',
              color: filter === f ? '#fff' : '#6B7280',
              borderColor: filter === f ? '#2B313D' : '#E5E7EB',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">등록된 후기가 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#F4F5F7] text-gray-600 flex items-center justify-center text-[12px] font-bold">
                    {r.author?.name?.[0] ?? '?'}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-900">{r.author?.name ?? '익명'}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      {r.doctor?.name && <> · {r.doctor.name} 원장</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i <= Number(r.rating) ? '#FBBF24' : '#E5E7EB'}
                      stroke={i <= Number(r.rating) ? '#FBBF24' : '#E5E7EB'}
                    />
                  ))}
                </div>
              </div>

              {r.treatment_name && (
                <div className="bg-gray-50 rounded-lg p-3 my-3 text-[12px] text-gray-600">
                  <span className="font-medium text-gray-700">시술: {r.treatment_name}</span>
                  {r.total_cost > 0 && (
                    <span className="ml-2 text-gray-400">· {r.total_cost.toLocaleString()}원</span>
                  )}
                </div>
              )}

              {(r.before_image || r.after_image) && (
                <div className="flex gap-2 mb-3">
                  {r.before_image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={r.before_image} alt="Before" className="flex-1 h-32 object-cover rounded-lg" />
                  )}
                  {r.after_image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={r.after_image} alt="After" className="flex-1 h-32 object-cover rounded-lg" />
                  )}
                </div>
              )}

              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line">
                {r.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
