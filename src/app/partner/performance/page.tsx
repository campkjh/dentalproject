'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Summary = {
  totalReservations: number;
  reservations30: number;
  totalRevenue: number;
  totalReviews: number;
  avgRating: number;
  totalProducts: number;
  totalConsults: number;
  conversionRate: number;
};
type Weekly = { label: string; revenue: number; reservations: number };

export default function PerformancePage() {
  const { authUser } = useSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weekly, setWeekly] = useState<Weekly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital/performance', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setSummary(data.summary ?? null);
        setWeekly(data.weekly ?? []);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

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

  const maxRevenue = Math.max(1, ...weekly.map((w) => w.revenue));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">성과 관리</h1>
        <p className="text-[12px] text-gray-500 mt-1">병원 운영 지표를 한눈에 확인합니다.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : !summary ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">데이터가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="총 예약" value={summary.totalReservations.toLocaleString()} sub="누적" />
            <KpiCard label="최근 30일 예약" value={summary.reservations30.toLocaleString()} sub="신규" />
            <KpiCard
              label="최근 30일 매출"
              value={`${summary.totalRevenue.toLocaleString()}원`}
              sub="시술완료 건"
              accent
            />
            <KpiCard label="총 후기" value={summary.totalReviews.toLocaleString()} sub={`평균 ${summary.avgRating.toFixed(1)}점`} />
            <KpiCard label="총 상품" value={summary.totalProducts.toLocaleString()} sub="활성" />
            <KpiCard label="총 상담" value={summary.totalConsults.toLocaleString()} sub="채팅 룸" />
            <KpiCard
              label="상담 → 예약 전환율"
              value={`${summary.conversionRate.toFixed(1)}%`}
              sub={summary.conversionRate >= 30 ? '우수' : '개선 가능'}
            />
          </div>

          {/* Weekly chart */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-[14px] font-bold text-gray-900 mb-4">최근 4주 매출 추이</h2>
            {weekly.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">데이터 없음</p>
            ) : (
              <div className="space-y-3">
                {weekly.map((w) => (
                  <div key={w.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] text-gray-600 font-medium">{w.label}</span>
                      <span className="text-[12px] font-bold text-gray-900">
                        {w.revenue.toLocaleString()}원
                        <span className="text-[10px] text-gray-400 font-normal ml-2">예약 {w.reservations}건</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] rounded-full transition-all duration-700"
                        style={{ width: `${(w.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p
        className="text-[20px] font-extrabold mt-1 leading-none"
        style={{ color: accent ? '#7C3AED' : '#2B313D' }}
      >
        {value}
      </p>
      <p className="text-[11px] text-gray-400 mt-1.5">{sub}</p>
    </div>
  );
}
