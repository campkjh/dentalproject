'use client';

// 내 포인트 — 프리티풀 마이 어법.
//  · 머리 = TopBar(뒤로) + 큰 제목 ⌄ 거르기(탭 대신): '내 포인트 / 적립 내역 / 사용 내역'.
//  · 위 = 큰 잔액 카드(보유 포인트 · 총 적립 / 총 사용). 아래 = 달별로 묶은 내역 줄(적립 + 파랑 · 사용 − 검정).
//  · 금액 부호는 type 으로 정한다(저장 값이 음수든 양수든 같게 보이도록 절댓값 + 부호).
import { useMemo, useState } from 'react';
import TopBar from '@/components/common/TopBar';
import LoginRequired from '@/components/common/LoginRequired';
import { MySectionTitle, QdBody } from '@/components/detail/QdKit';
import type { TitleFilterOption } from '@/components/reservations/TitleFilterMenu';
import { BillingEmpty, BillingHeader, TossIcon, monthKey } from '@/components/mypage/billing/BillingKit';
import { useStore } from '@/store';
import type { PointHistory } from '@/types';

type FilterKey = 'all' | 'earn' | 'use';

const FILTERS: { key: FilterKey; label: string; title: string; icon: string }[] = [
  { key: 'all', label: '전체', title: '내 포인트', icon: 'list' },
  { key: 'earn', label: '적립', title: '적립 내역', icon: 'coin' },
  { key: 'use', label: '사용', title: '사용 내역', icon: 'pay-card' },
];

function PointRow({ item }: { item: PointHistory }) {
  const earn = item.type === 'earn';
  const value = Math.abs(item.amount).toLocaleString();
  return (
    <div className="flex items-center gap-3.5 px-[18px] py-3.5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${earn ? 'bg-[#E8F3FF]' : 'bg-[#F2F4F6]'}`}>
        <TossIcon name={earn ? 'coin' : 'pay-card'} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="truncate text-[16px] font-semibold tracking-[-0.3px] text-[#333D4B]">{item.description || (earn ? '포인트 적립' : '포인트 사용')}</span>
        <span className="truncate text-[13px] text-[#8B95A1]">{item.date}{item.date ? ' · ' : ''}{earn ? '적립' : '사용'}</span>
      </span>
      <span className={`shrink-0 text-[16px] font-bold tabular-nums tracking-[-0.3px] ${earn ? 'text-[#3182F6]' : 'text-[#191F28]'}`}>
        {earn ? '+' : '−'}{value}P
      </span>
    </div>
  );
}

export default function PointsPage() {
  const { isLoggedIn, user, pointHistory } = useStore();
  const [filter, setFilter] = useState<FilterKey>('all');

  const totals = useMemo(() => {
    let earn = 0;
    let use = 0;
    let earnCount = 0;
    let useCount = 0;
    pointHistory.forEach((p) => {
      if (p.type === 'earn') { earn += Math.abs(p.amount); earnCount += 1; } else { use += Math.abs(p.amount); useCount += 1; }
    });
    return { earn, use, earnCount, useCount };
  }, [pointHistory]);

  // 달별 묶음 — 내역 순서(최신 먼저)는 그대로 두고 같은 달끼리 붙인다
  const groups = useMemo(() => {
    const list = pointHistory.filter((p) => filter === 'all' || p.type === filter);
    const out: { key: string; items: PointHistory[] }[] = [];
    list.forEach((p) => {
      const k = monthKey(p.date);
      const last = out[out.length - 1];
      if (last && last.key === k) last.items.push(p);
      else out.push({ key: k, items: [p] });
    });
    return out;
  }, [pointHistory, filter]);

  if (!isLoggedIn) {
    return (
      <div className="mx-auto min-h-screen max-w-[600px] bg-white pb-[86px] pc:pb-16">
        <TopBar title="내 포인트" />
        <LoginRequired />
      </div>
    );
  }

  const options: TitleFilterOption<FilterKey>[] = FILTERS.map((f) => ({
    key: f.key,
    label: f.label,
    title: f.title,
    icon: <TossIcon name={f.icon} />,
    count: f.key === 'all' ? pointHistory.length : f.key === 'earn' ? totals.earnCount : totals.useCount,
  }));
  const current = FILTERS.find((f) => f.key === filter) || FILTERS[0];

  return (
    <div className="mx-auto min-h-screen max-w-[600px] bg-white pb-[86px] pc:pb-16" style={{ letterSpacing: '-0.02em' }}>
      <BillingHeader<FilterKey> value={filter} options={options} onChange={setFilter} />

      <QdBody key={filter} className="space-y-6 px-5 pc:px-0">
        {/* 큰 잔액 카드 */}
        <section className="overflow-hidden rounded-[24px] bg-[#F2F7FF]">
          <div className="flex items-center justify-between gap-3 px-6 pb-5 pt-6">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#4E5968]">보유 포인트</p>
              <p className="mt-1.5 flex items-baseline gap-1 text-[#191F28]">
                <span className="text-[34px] font-bold leading-none tabular-nums tracking-[-1px]">{(user?.points ?? 0).toLocaleString()}</span>
                <span className="text-[22px] font-bold leading-none">P</span>
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/point-seal-hero.png" alt="" aria-hidden width={98} height={80} className="h-[80px] w-auto max-w-[34%] shrink-0 select-none object-contain" />
          </div>
          <div className="grid grid-cols-2 border-t border-white/80 bg-white/50">
            <div className="px-6 py-3.5">
              <p className="text-[13px] text-[#6B7684]">총 적립</p>
              <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[#3182F6]">+{totals.earn.toLocaleString()}P</p>
            </div>
            <div className="border-l border-white/80 px-6 py-3.5">
              <p className="text-[13px] text-[#6B7684]">총 사용</p>
              <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[#191F28]">−{totals.use.toLocaleString()}P</p>
            </div>
          </div>
        </section>

        {groups.length === 0 ? (
          <BillingEmpty
            icon="coin"
            title={filter === 'all' ? '아직 포인트 내역이 없어요' : `${current.label} 내역이 없어요`}
            desc={filter === 'all' ? '시술 후 리뷰를 쓰면 포인트가 쌓여요' : undefined}
          />
        ) : (
          groups.map((g, gi) => (
            <div key={`${g.key}-${gi}`}>
              {g.key && <MySectionTitle>{g.key}</MySectionTitle>}
              <div className="qd-card divide-y divide-[#F2F4F6] overflow-hidden">
                {g.items.map((item) => <PointRow key={item.id} item={item} />)}
              </div>
            </div>
          ))
        )}
      </QdBody>
    </div>
  );
}
