'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Coins, Plus } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  PartnerButton,
  PartnerEmpty,
  PartnerInput,
  PartnerListRow,
  PartnerPanel,
  PartnerStatusBadge,
  PartnerTop,
} from '@/components/partner/tds';

type Tx = {
  id: string;
  type: 'charge' | 'spend' | 'refund';
  description: string | null;
  amount: number;
  balance_after: number;
  created_at: string;
};

const PRESET = [50000, 100000, 300000, 500000, 1000000, 3000000];

const TYPE_META: Record<Tx['type'], { label: string; color: string; tone: 'success' | 'danger' | 'info' }> = {
  charge: { label: '충전', color: '#15803D', tone: 'success' },
  spend: { label: '사용', color: '#E5484D', tone: 'danger' },
  refund: { label: '환불', color: '#6D28D9', tone: 'info' },
};

export default function PartnerPointsPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [charging, setCharging] = useState(false);

  const reload = async () => {
    const res = await fetch('/api/my-hospital/budget', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setBalance(data.balance ?? 0);
    setTxs(data.transactions ?? []);
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

  const totalSpent = useMemo(
    () => txs.filter((t) => t.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
    [txs]
  );

  const charge = async () => {
    const value = Number(amount);
    if (!value || value < 1000) {
      showToast('1,000원 이상 입력해주세요.');
      return;
    }
    setCharging(true);
    try {
      const res = await fetch('/api/my-hospital/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '충전에 실패했습니다.');
        return;
      }
      showToast('포인트가 충전되었습니다.');
      setAmount('');
      await reload();
    } finally {
      setCharging(false);
    }
  };

  if (!authUser) {
    return (
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#8037FF] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PartnerTop
        eyebrow="포인트"
        title="병원포인트"
        description="광고와 이벤트 노출에 쓰는 병원 전용 포인트를 관리합니다."
        icon={<Coins size={28} />}
      />

      <PartnerPanel className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] leading-[19.5px] text-[rgba(0,19,43,0.58)]">현재 사용 가능 포인트</p>
            <p className="mt-2 text-[36px] font-bold leading-none text-[#191F28]">
              {loading ? '—' : balance.toLocaleString()}
              <span className="ml-1 text-[18px] font-bold text-[rgba(0,19,43,0.58)]">P</span>
            </p>
          </div>
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-[#F4EFFF] text-[#8037FF]">
            <Coins size={28} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-[14px] bg-[#F9FAFB] p-4">
            <p className="text-[12px] text-[rgba(0,19,43,0.58)]">누적 사용</p>
            <p className="mt-1 text-[17px] font-bold text-[#191F28]">{totalSpent.toLocaleString()}P</p>
          </div>
          <div className="rounded-[14px] bg-[#F9FAFB] p-4">
            <p className="text-[12px] text-[rgba(0,19,43,0.58)]">거래 내역</p>
            <p className="mt-1 text-[17px] font-bold text-[#191F28]">{txs.length.toLocaleString()}건</p>
          </div>
        </div>
      </PartnerPanel>

      <PartnerPanel className="p-5">
        <h2 className="mb-4">포인트 충전</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESET.map((preset) => {
            const selected = amount === String(preset);
            return (
              <button
                key={preset}
                onClick={() => setAmount(String(preset))}
                className="rounded-full border px-3 py-2 text-[13px] font-semibold"
                style={{
                  backgroundColor: selected ? '#F4EFFF' : '#F9FAFB',
                  borderColor: selected ? '#8037FF' : 'rgba(0,27,55,0.1)',
                  color: selected ? '#6D28D9' : 'rgba(3,18,40,0.7)',
                }}
              >
                {preset.toLocaleString()}원
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <PartnerInput
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="직접 입력"
            className="flex-1"
          />
          <PartnerButton
            type="button"
            onClick={charge}
            disabled={charging || !amount}
            size="l"
            leftIcon={<Plus size={16} />}
          >
            {charging ? '처리 중' : '충전'}
          </PartnerButton>
        </div>
        <p className="mt-2 text-[13px] text-[rgba(3,24,50,0.46)]">충전 요청은 포인트 잔액과 거래 내역에 반영됩니다.</p>
      </PartnerPanel>

      <PartnerPanel className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2>포인트 내역</h2>
        </div>
        {txs.length === 0 ? (
          <PartnerEmpty icon={<Coins size={24} />} title="아직 포인트 내역이 없습니다." />
        ) : (
          <div>
            {txs.map((tx) => {
              const meta = TYPE_META[tx.type];
              return (
                <PartnerListRow
                  key={tx.id}
                  title={tx.description ?? '포인트 거래'}
                  description={
                    <span className="flex items-center gap-2">
                      <PartnerStatusBadge tone={meta.tone}>{meta.label}</PartnerStatusBadge>
                      <span>{new Date(tx.created_at).toLocaleString('ko-KR')}</span>
                    </span>
                  }
                  meta={
                    <span className="flex flex-col items-end">
                      <span className="text-[17px] font-bold" style={{ color: meta.color }}>
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount.toLocaleString()}P
                      </span>
                      <span className="mt-1 text-[13px] text-[rgba(3,24,50,0.46)]">잔액 {tx.balance_after.toLocaleString()}P</span>
                    </span>
                  }
                />
              );
            })}
          </div>
        )}
      </PartnerPanel>
    </div>
  );
}
