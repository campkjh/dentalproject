'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard, TrendingUp } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Hospital = { id: string; name: string };

export default function AppPayInfoPage() {
  const { authUser } = useSession();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalReservations: 0,
    completed: 0,
  });
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
        const { hospital, reservations } = await res.json();
        if (cancelled) return;
        setHospital(hospital);
        const total = (reservations ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
        const completed = (reservations ?? []).filter((r: any) => r.status === 'completed').length;
        setStats({
          totalRevenue: total,
          totalReservations: reservations?.length ?? 0,
          completed,
        });
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">앱결제 안내</h1>
        <p className="text-[12px] text-gray-500 mt-1">앱 안에서 환자가 결제한 내역과 정산을 관리합니다.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={16} className="text-[#7C3AED]" />
            <span className="text-[12px] text-gray-500">누적 결제 금액</span>
          </div>
          <p className="text-[24px] font-extrabold text-gray-900">
            {loading ? '—' : stats.totalRevenue.toLocaleString()}원
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-[#15803D]" />
            <span className="text-[12px] text-gray-500">총 결제 건수</span>
          </div>
          <p className="text-[24px] font-extrabold text-gray-900">
            {loading ? '—' : stats.totalReservations.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] text-gray-500">시술 완료 건수</span>
          </div>
          <p className="text-[24px] font-extrabold text-[#7C3AED]">
            {loading ? '—' : stats.completed.toLocaleString()}
          </p>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-[14px] font-bold text-gray-900">앱결제란?</h2>
        <p className="text-[13px] text-gray-600 leading-relaxed">
          환자가 키닥터 앱에서 직접 시술비를 결제하면, 결제일로부터 다음달 10일에 병원 계좌로 정산됩니다.
        </p>
        <ul className="space-y-2 text-[12px] text-gray-600">
          <li>· 결제 수수료: 카드 3.3%, 계좌이체 1.1%</li>
          <li>· 정산 주기: 월 1회 (매월 10일)</li>
          <li>· 부가세는 결제 금액에 별도 포함</li>
          <li>· 환불 발생 시 다음 정산에서 차감</li>
        </ul>
        <div className="flex gap-2 pt-2">
          <Link href="/partner/app-pay/payments" className="flex-1 py-2.5 text-center text-[13px] font-bold border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
            결제 내역
          </Link>
          <Link href="/partner/app-pay/settlement" className="flex-1 py-2.5 text-center text-[13px] font-bold bg-[#7C3AED] text-white rounded-lg">
            정산 내역
          </Link>
        </div>
        {hospital && (
          <p className="text-[11px] text-gray-400 pt-2">병원: {hospital.name}</p>
        )}
      </section>
    </div>
  );
}
