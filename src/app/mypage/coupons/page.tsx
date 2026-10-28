'use client';

// 쿠폰함 — 프리티풀 마이 어법.
//  · 머리 = TopBar(뒤로) + 큰 제목 ⌄ 거르기(탭 대신): '쿠폰함(사용 가능) / 사용한 쿠폰 / 기간 지난 쿠폰'.
//  · 칸 = 티켓 모양 쿠폰 카드(CouponCard): 할인값 크게 · 이름 · 조건(설명) · 기한(D-day) · 오른쪽 그루터기에 사용 가능 여부.
import { useMemo, useState } from 'react';
import TopBar from '@/components/common/TopBar';
import LoginRequired from '@/components/common/LoginRequired';
import { QdBody } from '@/components/detail/QdKit';
import type { TitleFilterOption } from '@/components/reservations/TitleFilterMenu';
import { BillingEmpty, BillingHeader, TossIcon } from '@/components/mypage/billing/BillingKit';
import CouponCard from '@/components/mypage/billing/CouponCard';
import { useStore } from '@/store';
import type { Coupon } from '@/types';

type FilterKey = Coupon['status'];

const FILTERS: { key: FilterKey; label: string; title: string; icon: string; empty: string }[] = [
  { key: 'available', label: '사용 가능', title: '쿠폰함', icon: 'gift', empty: '지금 쓸 수 있는 쿠폰이 없어요' },
  { key: 'used', label: '사용 완료', title: '사용한 쿠폰', icon: 'check-circle', empty: '사용한 쿠폰이 없어요' },
  { key: 'expired', label: '기간 만료', title: '기간 지난 쿠폰', icon: 'clock', empty: '기간이 지난 쿠폰이 없어요' },
];

export default function CouponsPage() {
  const { isLoggedIn, user } = useStore();
  const [filter, setFilter] = useState<FilterKey>('available');

  const allCoupons = useMemo(() => user?.coupons ?? [], [user?.coupons]);
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { available: 0, used: 0, expired: 0 };
    allCoupons.forEach((x) => { c[x.status] = (c[x.status] || 0) + 1; });
    return c;
  }, [allCoupons]);

  if (!isLoggedIn) {
    return (
      <div className="mx-auto min-h-screen max-w-[600px] bg-white pb-[86px] pc:pb-16">
        <TopBar title="쿠폰함" />
        <LoginRequired />
      </div>
    );
  }

  const filtered = allCoupons.filter((c) => c.status === filter);
  const options: TitleFilterOption<FilterKey>[] = FILTERS.map((f) => ({
    key: f.key,
    label: f.label,
    title: f.title,
    icon: <TossIcon name={f.icon} />,
    count: counts[f.key],
  }));
  const current = FILTERS.find((f) => f.key === filter) || FILTERS[0];

  return (
    <div className="mx-auto min-h-screen max-w-[600px] bg-white pb-[86px] pc:pb-16" style={{ letterSpacing: '-0.02em' }}>
      <BillingHeader<FilterKey>
        value={filter}
        options={options}
        onChange={setFilter}
        sub={filter === 'available' ? `지금 쓸 수 있는 쿠폰 ${counts.available}장` : undefined}
      />

      {filtered.length === 0 ? (
        <BillingEmpty
          icon={current.icon}
          title={current.empty}
          desc={filter === 'available' ? '쿠폰을 받으면 결제할 때 바로 쓸 수 있어요' : undefined}
        />
      ) : (
        <QdBody key={filter} className="space-y-3 px-5 pc:px-0">
          {filtered.map((coupon) => <CouponCard key={coupon.id} coupon={coupon} />)}
        </QdBody>
      )}
    </div>
  );
}
