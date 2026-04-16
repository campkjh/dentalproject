'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Settlement = {
  id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  vat: number;
  fee: number;
  payout: number;
  bank_account: string | null;
  status: 'pending' | 'paid' | 'failed';
  paid_at: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<Settlement['status'], { label: string; color: string }> = {
  pending: { label: '정산 대기', color: '#B45309' },
  paid: { label: '정산 완료', color: '#15803D' },
  failed: { label: '실패', color: '#E5484D' },
};

export default function SettlementPage() {
  const { authUser } = useSession();
  const [items, setItems] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital/settlements', { cache: 'no-store' });
        if (!res.ok) return;
        const { settlements } = await res.json();
        if (cancelled) return;
        setItems(settlements ?? []);
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

  const totalPending = items.filter((i) => i.status === 'pending').reduce((s, i) => s + i.payout, 0);
  const totalPaid = items.filter((i) => i.status === 'paid').reduce((s, i) => s + i.payout, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">정산 내역</h1>
        <p className="text-[12px] text-gray-500 mt-1">월별 앱결제 정산 내역과 입금 상태를 확인합니다.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[12px] text-gray-500 mb-1">정산 대기 금액</p>
          <p className="text-[24px] font-extrabold text-[#B45309]">{totalPending.toLocaleString()}원</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[12px] text-gray-500 mb-1">누적 정산 완료</p>
          <p className="text-[24px] font-extrabold text-[#15803D]">{totalPaid.toLocaleString()}원</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400 mb-2">아직 정산 내역이 없습니다.</p>
          <p className="text-[11px] text-gray-400">결제일 다음달 10일에 자동 정산됩니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">정산 기간</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase">결제 금액</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase">VAT</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase">수수료</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase">정산액</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((s) => {
                const cfg = STATUS_LABEL[s.status];
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[12px] text-gray-700">
                      {s.period_start} ~ {s.period_end}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-700 text-right">{s.total_revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-500 text-right">{s.vat.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-500 text-right">-{s.fee.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-gray-900 text-right">{s.payout.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: cfg.color }}>
                      {cfg.label}
                      {s.paid_at && (
                        <p className="text-[10px] text-gray-400">{new Date(s.paid_at).toLocaleDateString('ko-KR')}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
