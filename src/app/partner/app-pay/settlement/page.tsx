'use client';

// 정산 내역 — 상품 상세(261031) 톤: 연파랑 금액 카드(남색 숫자) · 정산 건마다 회색 이름 정보 줄 · 상태 배지.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
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

// 상태 배지 — 대기=회색 · 완료=초록 · 실패=빨강
const STATUS_LABEL: Record<Settlement['status'], { label: string; tone: string }> = {
  pending: { label: '정산 대기', tone: 'bg-white text-[#6B7684]' }, // 회색 칸 위라 흰 배지
  paid: { label: '정산 완료', tone: 'bg-[#E6F7EE] text-[#03A94D]' },
  failed: { label: '실패', tone: 'bg-[#FFEEEF] text-[#F04452]' },
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

  const totalPending = items.filter((i) => i.status === 'pending').reduce((s, i) => s + i.payout, 0);
  const totalPaid = items.filter((i) => i.status === 'paid').reduce((s, i) => s + i.payout, 0);

  return (
    <div className="bg-white pb-12">
      <TopBar title="정산 내역" sub="월별 앱결제 정산 내역과 입금 상태를 확인해요." />

      {/* ─── 금액 카드 ─── */}
      <div className="qd-a-item px-5 pb-7 pt-1">
        <div className="rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
          <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">정산 대기</span>
          <p className="mt-3 text-[15px] font-semibold text-[#1E3A78]">받을 금액</p>
          <p className="mt-0.5 text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]">{totalPending.toLocaleString()}원</p>
          <div className="mt-4 flex items-center justify-between border-t border-[#1E3A78]/10 pt-3.5">
            <span className="text-[15px] text-[#1E3A78]/70">누적 정산 완료</span>
            <span className="text-[17px] font-bold text-[#1E3A78]">{totalPaid.toLocaleString()}원</span>
          </div>
        </div>
        <p className="mt-3 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
          <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
          결제일 다음 달 10일에 자동으로 정산돼요.
        </p>
      </div>

      <div className="h-2.5 bg-[#F2F4F6]" />

      {/* ─── 정산 건 목록 ─── */}
      <div className="qd-a-item px-5 py-7" style={{ animationDelay: '.06s' }}>
        <h2 className="!text-[20px] font-bold !leading-[1.3] tracking-[-0.4px] text-[#191F28]">월별 정산</h2>
        {loading ? (
          <p className="py-16 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
              <MonoIcon name="receipt" size={34} color="#B0B8C1" />
            </span>
            <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">아직 정산 내역이 없어요</p>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]">결제일 다음 달 10일에 자동 정산돼요</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((s) => {
              const cfg = STATUS_LABEL[s.status];
              const rows = [
                { label: '결제 금액', value: `${s.total_revenue.toLocaleString()}원` },
                { label: 'VAT', value: `${s.vat.toLocaleString()}원` },
                { label: '수수료', value: `-${s.fee.toLocaleString()}원` },
                ...(s.paid_at ? [{ label: '입금일', value: new Date(s.paid_at).toLocaleDateString('ko-KR') }] : []),
              ];
              return (
                <div key={s.id} className="rounded-[16px] bg-[#F2F4F6] px-4 pb-4 pt-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-6 items-center rounded-[6px] px-2 text-[13.5px] font-semibold ${cfg.tone}`}>{cfg.label}</span>
                    <span className="min-w-0 truncate text-[15px] font-semibold text-[#333D4B]">
                      {s.period_start} ~ {s.period_end}
                    </span>
                  </div>
                  <div className="mt-2">
                    {rows.map((r) => (
                      <p key={r.label} className="flex min-h-9 items-center py-1">
                        <span className="w-[86px] shrink-0 text-[15px] text-[#8B95A1]">{r.label}</span>
                        <span className="min-w-0 flex-1 text-right text-[15px] text-[#333D4B]">{r.value}</span>
                      </p>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-[12px] bg-[#EFF5FE] px-3.5 py-3">
                    <span className="text-[15px] font-semibold text-[#1E3A78]">정산액</span>
                    <span className="text-[20px] font-bold tracking-[-0.4px] text-[#1E3A78]">{s.payout.toLocaleString()}원</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
