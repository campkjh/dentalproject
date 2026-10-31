'use client';

// 예산 관리 — 상품 상세(261031) 톤: 연파랑 잔액 카드(남색 숫자) · 회색 금액 칩 · 회색 입력 칸 · 테두리 없는 내역 줄.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Tx = {
  id: string;
  type: 'charge' | 'spend' | 'refund';
  description: string | null;
  amount: number;
  balance_after: number;
  created_at: string;
};

// 거래 배지 — 충전=파랑 · 소진=회색 · 환불=초록
const TYPE_LABEL: Record<Tx['type'], { label: string; tone: string }> = {
  charge: { label: '충전', tone: 'bg-[#E8F3FF] text-[#3180F7]' },
  spend: { label: '소진', tone: 'bg-[#F2F4F6] text-[#6B7684]' },
  refund: { label: '환불', tone: 'bg-[#E6F7EE] text-[#03A94D]' },
};

const PRESET = [50000, 100000, 300000, 500000, 1000000, 3000000];

export default function BudgetPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [chargeAmount, setChargeAmount] = useState('');
  const [charging, setCharging] = useState(false);

  const reload = async () => {
    const res = await fetch('/api/my-hospital/budget', { cache: 'no-store' });
    if (!res.ok) return;
    const { balance: b, transactions } = await res.json();
    setBalance(b ?? 0);
    setTxs(transactions ?? []);
  };

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const handleCharge = async () => {
    const amount = Number(chargeAmount);
    if (!amount || amount < 1000) {
      showToast('1,000원 이상 입력해주세요.');
      return;
    }
    setCharging(true);
    try {
      const res = await fetch('/api/my-hospital/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '충전 실패');
      } else {
        showToast('포인트가 충전되었습니다.');
        setChargeAmount('');
        await reload();
      }
    } finally {
      setCharging(false);
    }
  };

  if (!authUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
          <MonoIcon name="lock" size={34} color="#B0B8C1" />
        </span>
        <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">로그인이 필요해요</p>
        <Link href="/partner/login" className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7]">
          로그인
        </Link>
      </div>
    );
  }

  const totalSpent = txs.filter((t) => t.amount < 0).reduce((s, t) => s + -t.amount, 0);

  return (
    <div className="bg-white pb-12">
      <TopBar title="예산 관리" sub="광고 캠페인에 쓸 병원 포인트를 충전하고 사용 내역을 확인해요." />

      {/* ─── 잔액 카드 ─── */}
      <div className="qd-a-item px-5 pb-7 pt-1">
        <div className="rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
          <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">병원포인트</span>
          <p className="mt-3 text-[15px] font-semibold text-[#1E3A78]">현재 잔액</p>
          <p className="mt-0.5 text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]">
            {loading ? '—' : balance.toLocaleString()}P
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-[#1E3A78]/10 pt-3.5">
            <span className="text-[15px] text-[#1E3A78]/70">누적 사용액</span>
            <span className="text-[17px] font-bold text-[#1E3A78]">{totalSpent.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      <Band />

      {/* ─── 충전 ─── */}
      <div className="qd-a-item px-5 py-7" style={{ animationDelay: '.06s' }}>
        <h2 className="!text-[20px] font-bold !leading-[1.3] tracking-[-0.4px] text-[#191F28]">포인트 충전</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {PRESET.map((amt) => {
            const on = chargeAmount === String(amt);
            return (
              <button
                key={amt}
                type="button"
                onClick={() => setChargeAmount(String(amt))}
                className={`flex h-11 items-center justify-center rounded-[12px] text-[15px] font-semibold transition-colors ${on ? 'bg-[#EFF5FE] text-[#2F6FE4]' : 'bg-[#F2F4F6] text-[#333D4B]'}`}
              >
                {amt.toLocaleString()}원
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={chargeAmount}
            onChange={(e) => setChargeAmount(e.target.value)}
            placeholder="직접 입력 (1,000원 이상)"
            className="!h-14 !min-h-0 min-w-0 flex-1 !rounded-[14px] !border-0 !bg-[#F2F4F6] !py-0 !px-4 !text-[16px] !font-medium !text-[#191F28] outline-none transition-colors placeholder:!text-[#B0B8C1] focus:!bg-[#EDEFF2] focus:!shadow-none"
          />
          <button
            type="button"
            onClick={handleCharge}
            disabled={charging || !chargeAmount}
            className="flex h-14 w-[96px] shrink-0 items-center justify-center rounded-[14px] bg-[#4A82EE] text-[16px] font-bold text-white transition-all active:scale-[0.98] disabled:bg-[#E5E8EB] disabled:text-[#B0B8C1]"
          >
            {charging ? '처리 중…' : '충전'}
          </button>
        </div>
        <p className="mt-3 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
          <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
          충전 요청은 포인트 잔액과 거래 내역에 반영돼요.
        </p>
      </div>

      <Band />

      {/* ─── 내역 ─── */}
      <div className="qd-a-item px-5 py-7" style={{ animationDelay: '.12s' }}>
        <h2 className="!text-[20px] font-bold !leading-[1.3] tracking-[-0.4px] text-[#191F28]">사용 내역</h2>
        {txs.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
              <MonoIcon name="coin" size={34} color="#B0B8C1" />
            </span>
            <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">아직 거래 내역이 없어요</p>
          </div>
        ) : (
          <ul className="-mx-2 mt-2">
            {txs.map((t) => {
              const cfg = TYPE_LABEL[t.type];
              return (
                <li key={t.id} className="flex items-center gap-3 rounded-[16px] px-2 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-[13.5px] font-semibold ${cfg.tone}`}>{cfg.label}</span>
                      <span className="min-w-0 truncate text-[16px] font-semibold text-[#333D4B]">{t.description ?? '-'}</span>
                    </div>
                    <p className="mt-1 text-[13.5px] text-[#8B95A1]">{new Date(t.created_at).toLocaleString('ko-KR')}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-[17px] font-bold ${t.amount > 0 ? 'text-[#3180F7]' : 'text-[#333D4B]'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}P
                    </p>
                    <p className="mt-0.5 text-[13.5px] text-[#8B95A1]">잔액 {t.balance_after.toLocaleString()}P</p>
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

const Band = () => <div className="h-2.5 bg-[#F2F4F6]" />;
