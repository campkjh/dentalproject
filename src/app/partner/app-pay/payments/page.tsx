'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Payment = {
  id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  amount: number;
  payment_type: string | null;
  payment_method: string | null;
  customer_name: string;
  created_at: string;
  visit_at: string | null;
  user?: { name?: string; phone?: string } | null;
  product?: { title?: string } | null;
};

const STATUS: Record<Payment['status'], { label: string; color: string }> = {
  pending: { label: '결제확인중', color: '#B45309' },
  confirmed: { label: '결제완료', color: '#15803D' },
  completed: { label: '시술완료', color: '#1E6FD9' },
  cancelled: { label: '취소/환불', color: '#E5484D' },
};

export default function AppPayPaymentsPage() {
  const { authUser } = useSession();
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital/payments', { cache: 'no-store' });
        if (!res.ok) return;
        const { payments } = await res.json();
        if (cancelled) return;
        setItems(payments ?? []);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          !q ||
          (i.user?.name ?? i.customer_name ?? '').includes(q) ||
          (i.product?.title ?? '').includes(q)
      ),
    [items, q]
  );

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
        <h1 className="text-[18px] font-bold text-gray-900">앱결제 내역</h1>
        <p className="text-[12px] text-gray-500 mt-1">앱 안에서 결제된 모든 거래를 확인합니다.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="고객명 또는 시술명 검색"
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 rounded-lg outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">결제 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">결제일</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">고객</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">시술</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">결제수단</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase">금액</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => {
                const s = STATUS[p.status];
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[12px] text-gray-600">
                      {new Date(p.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-900 font-medium">
                      {p.user?.name ?? p.customer_name}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600">
                      {p.product?.title ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600">
                      {p.payment_method ?? '현장결제'}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-bold text-gray-900 text-right">
                      {p.amount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: s.color }}>
                      {s.label}
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
