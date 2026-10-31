'use client';

// 앱결제 내역 — 상품 상세(261031) 톤: 연파랑 합계 카드 · 회색 검색 칸 · 테두리 없는 목록 줄 · 상태 배지.

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
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

// 상태 배지 — 대기=회색 · 확정=파랑 · 완료=초록 · 취소=빨강(예약 상세와 같은 결)
const STATUS: Record<Payment['status'], { label: string; tone: string }> = {
  pending: { label: '결제확인중', tone: 'bg-[#F2F4F6] text-[#6B7684]' },
  confirmed: { label: '결제완료', tone: 'bg-[#E8F3FF] text-[#3180F7]' },
  completed: { label: '시술완료', tone: 'bg-[#E6F7EE] text-[#03A94D]' },
  cancelled: { label: '취소/환불', tone: 'bg-[#FFEEEF] text-[#F04452]' },
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

  // 화면 표시용 합계 — 취소·환불은 빼고 지금 보이는 목록만
  const shownTotal = filtered.filter((p) => p.status !== 'cancelled').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="bg-white pb-12">
      <TopBar title="앱결제 내역" sub="앱 안에서 결제된 모든 거래를 확인해요." />

      <div className="qd-a-item px-5 pt-1">
        <div className="rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
          <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">{q ? '검색 결과' : '전체'}</span>
          <p className="mt-3 text-[15px] font-semibold text-[#1E3A78]">결제 금액 합계 · {filtered.length.toLocaleString()}건</p>
          <p className="mt-0.5 text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]">{loading ? '—' : shownTotal.toLocaleString()}원</p>
          <p className="mt-1 text-[13px] text-[#1E3A78]/60">취소·환불 건은 빼고 더했어요</p>
        </div>

        <div className="relative mt-4">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
            <MonoIcon name="search" size={20} color="#8B95A1" />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="고객명 또는 시술명 검색"
            className="!h-12 !min-h-0 w-full !rounded-[14px] !border-0 !bg-[#F2F4F6] !py-0 !pl-11 !pr-4 !text-[16px] !font-medium !text-[#191F28] outline-none transition-colors placeholder:!text-[#B0B8C1] focus:!bg-[#EDEFF2] focus:!shadow-none"
          />
        </div>
      </div>

      <div className="qd-a-item px-3 pb-4 pt-3" style={{ animationDelay: '.06s' }}>
        {loading ? (
          <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
              <MonoIcon name="receipt" size={34} color="#B0B8C1" />
            </span>
            <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">결제 내역이 없어요</p>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]">{q ? '다른 이름이나 시술명으로 찾아보세요' : '환자가 앱에서 결제하면 여기에 보여요'}</p>
          </div>
        ) : (
          <ul>
            {filtered.map((p) => {
              const s = STATUS[p.status];
              return (
                <li key={p.id} className="rounded-[16px] px-2 py-3.5 transition-colors active:bg-[#F9FAFB]">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-6 items-center rounded-[6px] px-2 text-[13.5px] font-semibold ${s.tone}`}>{s.label}</span>
                    <span className="text-[14px] text-[#8B95A1]">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div className="mt-2 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-bold text-[#191F28]">{p.user?.name ?? p.customer_name}</p>
                      <p className="mt-0.5 truncate text-[14px] text-[#6B7684]">
                        {p.product?.title ?? '-'} · {p.payment_method ?? '현장결제'}
                      </p>
                    </div>
                    <p className={`shrink-0 text-[17px] font-bold ${p.status === 'cancelled' ? 'text-[#B0B8C1] line-through' : 'text-[#1E3A78]'}`}>
                      {p.amount.toLocaleString()}원
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
