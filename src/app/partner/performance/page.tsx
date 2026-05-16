'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { PartnerEmpty, PartnerPanel, PartnerStatCard, PartnerTop } from '@/components/partner/tds';

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
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#3182F6] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  const maxRevenue = Math.max(1, ...weekly.map((w) => w.revenue));

  return (
    <div className="space-y-5">
      <PartnerTop
        eyebrow="성과"
        title="성과 관리"
        description="병원 운영 지표를 한눈에 확인합니다."
        icon={<TrendingUp size={28} />}
      />

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : !summary ? (
        <PartnerEmpty icon={<TrendingUp size={24} />} title="데이터가 없습니다." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <PartnerStatCard label="총 예약" value={summary.totalReservations.toLocaleString()} sub="누적" />
            <PartnerStatCard label="최근 30일 예약" value={summary.reservations30.toLocaleString()} sub="신규" />
            <PartnerStatCard
              label="최근 30일 매출"
              value={`${summary.totalRevenue.toLocaleString()}원`}
              sub="시술완료 건"
              accent
            />
            <PartnerStatCard label="총 후기" value={summary.totalReviews.toLocaleString()} sub={`평균 ${summary.avgRating.toFixed(1)}점`} />
            <PartnerStatCard label="총 상품" value={summary.totalProducts.toLocaleString()} sub="활성" />
            <PartnerStatCard label="총 상담" value={summary.totalConsults.toLocaleString()} sub="채팅 룸" />
            <PartnerStatCard
              label="상담 → 예약 전환율"
              value={`${summary.conversionRate.toFixed(1)}%`}
              sub={summary.conversionRate >= 30 ? '우수' : '개선 가능'}
            />
          </div>

          <PartnerPanel className="p-5">
            <h2 className="mb-4">최근 4주 매출 추이</h2>
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
                        className="h-full bg-gradient-to-r from-[#3182F6] to-[#86B7FF] rounded-full transition-all duration-700"
                        style={{ width: `${(w.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PartnerPanel>
        </>
      )}
    </div>
  );
}
