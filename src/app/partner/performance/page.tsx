'use client';

// 성과 관리 — 상품 상세(261031) 톤: 연파랑 매출 카드(남색 숫자) · 회색 숫자 칸 · 회색 띠 · 주별 막대(파랑).

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
          <MonoIcon name="lock" size={34} color="#B0B8C1" />
        </span>
        <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">로그인이 필요해요</p>
        <Link href="/login" className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7]">
          로그인
        </Link>
      </div>
    );
  }

  const maxRevenue = Math.max(1, ...weekly.map((w) => w.revenue));

  const tiles = summary
    ? [
        { label: '총 예약', value: `${summary.totalReservations.toLocaleString()}건`, sub: '누적' },
        { label: '최근 30일 예약', value: `${summary.reservations30.toLocaleString()}건`, sub: '신규' },
        { label: '총 후기', value: `${summary.totalReviews.toLocaleString()}개`, sub: `평균 ${summary.avgRating.toFixed(1)}점` },
        { label: '총 상품', value: `${summary.totalProducts.toLocaleString()}개`, sub: '활성' },
        { label: '총 상담', value: `${summary.totalConsults.toLocaleString()}건`, sub: '채팅 룸' },
        { label: '상담 → 예약 전환율', value: `${summary.conversionRate.toFixed(1)}%`, sub: summary.conversionRate >= 30 ? '우수' : '개선 가능' },
      ]
    : [];

  return (
    <div className="bg-white pb-12">
      <TopBar title="성과 관리" sub="병원 운영 지표를 한눈에 확인해요." />

      {loading ? (
        <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
      ) : !summary ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
            <MonoIcon name="chart-bar" size={34} color="#B0B8C1" />
          </span>
          <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">데이터가 없어요</p>
        </div>
      ) : (
        <>
          <div className="qd-a-item px-5 pb-7 pt-1">
            <div className="rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
              <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">최근 30일</span>
              <p className="mt-3 text-[15px] font-semibold text-[#1E3A78]">매출 · 시술완료 건</p>
              <p className="mt-0.5 text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]">{summary.totalRevenue.toLocaleString()}원</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {tiles.map((t) => (
                <div key={t.label} className="rounded-[14px] bg-[#F2F4F6] px-4 py-3.5">
                  <p className="text-[14px] text-[#6B7684]">{t.label}</p>
                  <p className="mt-0.5 text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">{t.value}</p>
                  <p className="mt-0.5 text-[13px] text-[#8B95A1]">{t.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-2.5 bg-[#F2F4F6]" />

          <div className="qd-a-item px-5 py-7" style={{ animationDelay: '.06s' }}>
            <h2 className="!text-[20px] font-bold !leading-[1.3] tracking-[-0.4px] text-[#191F28]">최근 4주 매출 추이</h2>
            {weekly.length === 0 ? (
              <p className="py-10 text-center text-[15px] text-[#8B95A1]">데이터가 없어요</p>
            ) : (
              <div className="mt-5 space-y-4">
                {weekly.map((w) => (
                  <div key={w.label}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[15px] text-[#6B7684]">{w.label}</span>
                      <span className="text-[16px] font-bold text-[#1E3A78]">
                        {w.revenue.toLocaleString()}원
                        <span className="ml-2 text-[13.5px] font-normal text-[#8B95A1]">예약 {w.reservations}건</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F2F4F6]">
                      <div className="h-full rounded-full bg-[#2F6FE4] transition-all duration-700" style={{ width: `${(w.revenue / maxRevenue) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
