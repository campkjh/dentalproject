'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Coins } from 'lucide-react';
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

const TYPE_LABEL: Record<Tx['type'], { label: string; color: string }> = {
  charge: { label: '충전', color: '#15803D' },
  spend: { label: '소진', color: '#E5484D' },
  refund: { label: '환불', color: '#7C3AED' },
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
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  const totalSpent = txs.filter((t) => t.amount < 0).reduce((s, t) => s + -t.amount, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">예산 관리</h1>
        <p className="text-[12px] text-gray-500 mt-1">광고 캠페인에 사용할 병원 포인트를 충전하고 사용 내역을 확인합니다.</p>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-[#7C3AED] to-[#5B2BB5] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Coins size={20} />
          <span className="text-[13px] font-bold opacity-90">현재 잔액</span>
        </div>
        <p className="text-[36px] font-extrabold leading-none">
          {loading ? '—' : balance.toLocaleString()}
          <span className="text-[18px] font-bold ml-1 opacity-80">P</span>
        </p>
        <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-[12px] opacity-80">
          <span>누적 사용액</span>
          <span className="font-bold">{totalSpent.toLocaleString()}원</span>
        </div>
      </div>

      {/* Charge */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-[14px] font-bold text-gray-900 mb-3">포인트 충전</h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {PRESET.map((amt) => (
            <button
              key={amt}
              onClick={() => setChargeAmount(String(amt))}
              className="py-2.5 rounded-lg border text-[12px] font-semibold transition-colors"
              style={{
                borderColor: chargeAmount === String(amt) ? '#7C3AED' : '#E5E7EB',
                color: chargeAmount === String(amt) ? '#7C3AED' : '#374151',
              }}
            >
              {amt.toLocaleString()}원
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={chargeAmount}
            onChange={(e) => setChargeAmount(e.target.value)}
            placeholder="직접 입력 (1,000원 이상)"
            className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
          />
          <button
            onClick={handleCharge}
            disabled={charging || !chargeAmount}
            className="px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-lg disabled:opacity-50"
          >
            {charging ? '처리 중…' : '충전'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          ⚠ 데모용 즉시 충전입니다. 실서비스 시 결제 PG 연동 필요.
        </p>
      </section>

      {/* Transactions */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-[14px] font-bold text-gray-900">사용 내역</h2>
        </div>
        {txs.length === 0 ? (
          <div className="py-16 text-center text-[12px] text-gray-400">
            아직 거래 내역이 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {txs.map((t) => {
              const cfg = TYPE_LABEL[t.type];
              return (
                <li key={t.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#F4F5F7', color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-[12px] text-gray-700">{t.description ?? '-'}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleString('ko-KR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-extrabold" style={{ color: cfg.color }}>
                      {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}P
                    </p>
                    <p className="text-[10px] text-gray-400">잔액 {t.balance_after.toLocaleString()}P</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
