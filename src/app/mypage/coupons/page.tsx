'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';

const tabs = ['사용가능', '사용완료', '기간만료'] as const;
type Tab = (typeof tabs)[number];

const statusMap: Record<Tab, 'available' | 'used' | 'expired'> = {
  '사용가능': 'available',
  '사용완료': 'used',
  '기간만료': 'expired',
};

export default function CouponsPage() {
  const { isLoggedIn, user } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('사용가능');
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const prevIdxRef = useRef(0);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const activeIdx = tabs.indexOf(activeTab);

  const changeTab = (t: Tab) => {
    const nextIdx = tabs.indexOf(t);
    setDirection(nextIdx >= prevIdxRef.current ? 'right' : 'left');
    prevIdxRef.current = nextIdx;
    setActiveTab(t);
  };

  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[activeIdx];
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeIdx]);

  useEffect(() => {
    const onResize = () => {
      const btn = tabBtnRefs.current[activeIdx];
      if (!btn) return;
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeIdx]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <TopBar title="쿠폰함" />
        <LoginRequired />
      </div>
    );
  }

  const allCoupons = user?.coupons ?? [];
  const filteredCoupons = allCoupons.filter((c) => c.status === statusMap[activeTab]);
  const availableCount = allCoupons.filter((c) => c.status === 'available').length;

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto page-enter">
      <TopBar title="쿠폰함" />

      {/* Hero — mirrors the points page: label + big number on the left */}
      <div className="px-5 pt-6 pb-7 fade-in-up">
        <p className="text-[14px] text-[#6B7280]">보유중인 쿠폰</p>
        <p className="mt-1 text-[34px] font-extrabold text-[#2B313D] leading-none">
          {availableCount}장
        </p>
      </div>

      {/* Tabs */}
      <div className="relative">
        <div className="flex justify-around border-b border-gray-100 px-2">
          {tabs.map((t, i) => {
            const isActive = activeTab === t;
            return (
              <button
                key={t}
                ref={(el) => {
                  tabBtnRefs.current[i] = el;
                }}
                type="button"
                onClick={() => changeTab(t)}
                className="flex-1 py-3.5 text-center relative"
                style={{ transition: 'color 240ms ease' }}
              >
                <span
                  className={`text-[15px] font-bold ${
                    isActive ? 'text-[#2B313D]' : 'text-[#D1D5DB]'
                  }`}
                >
                  {t}
                </span>
              </button>
            );
          })}
          <span
            aria-hidden
            className="absolute bottom-0 h-[2px] bg-[#2B313D] pointer-events-none"
            style={{
              left: indicator.left,
              width: indicator.width,
              transition:
                'left 320ms cubic-bezier(0.22, 1, 0.36, 1), width 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div
        key={activeTab}
        className={`${direction === 'right' ? 'tab-slide-right' : 'tab-slide-left'}`}
      >
        {filteredCoupons.length === 0 ? (
          <EmptyState icon="payment" message="쿠폰이 없어요" />
        ) : (
          <div className="bg-white divide-y divide-gray-50">
            {filteredCoupons.map((coupon) => {
              const isAvailable = coupon.status === 'available';
              return (
                <div
                  key={coupon.id}
                  className="px-5 py-4 flex items-center justify-between"
                  style={{ opacity: isAvailable ? 1 : 0.6 }}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-[15px] font-medium text-[#2B313D] line-clamp-1">
                      {coupon.name}
                    </p>
                    <p className="text-[12px] text-[#A4ABBA] mt-1">
                      {coupon.expiryDate ? `${coupon.expiryDate}까지` : ''}
                    </p>
                  </div>
                  <span
                    className={`text-[15px] font-bold flex-shrink-0 ${
                      isAvailable ? 'text-[#8037FF]' : 'text-[#6B7280]'
                    }`}
                  >
                    {coupon.discountAmount.toLocaleString()}원
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
