'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';

const tabs = ['사용가능', '사용완료', '기간만료'];

const statusMap: Record<string, 'available' | 'used' | 'expired'> = {
  '사용가능': 'available',
  '사용완료': 'used',
  '기간만료': 'expired',
};

export default function CouponsPage() {
  const { isLoggedIn, user } = useStore();
  const [activeTab, setActiveTab] = useState('사용가능');
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const prevIdxRef = useRef(0);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const activeIdx = tabs.indexOf(activeTab);

  const changeTab = (t: string) => {
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

  const counts: Record<string, number> = {
    '사용가능': allCoupons.filter((c) => c.status === 'available').length,
    '사용완료': allCoupons.filter((c) => c.status === 'used').length,
    '기간만료': allCoupons.filter((c) => c.status === 'expired').length,
  };

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto page-enter">
      <TopBar title="쿠폰함" />

      {/* Summary hero */}
      <div className="px-2.5 pt-3 pb-5 fade-in-up flex items-center gap-3">
        <img src="/icons/mypage/coupons.svg" alt="" width={52} height={52} />
        <div>
          <p className="text-[13px] text-gray-500">보유 쿠폰</p>
          <p className="text-[24px] font-bold text-gray-900 leading-tight">
            <span className="text-[#7C3AED]">{counts['사용가능']}</span>
            <span className="text-[15px] text-gray-400 font-semibold ml-1">
              / 총 {allCoupons.length}
            </span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-2.5 pb-3">
        <div className="relative flex gap-1.5 overflow-x-auto hide-scrollbar">
          <span
            aria-hidden
            className="absolute top-0 bottom-0 rounded-full bg-gray-900 pointer-events-none"
            style={{
              left: indicator.left,
              width: indicator.width,
              transition:
                'left 420ms cubic-bezier(0.22, 1, 0.36, 1), width 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          {tabs.map((t, i) => {
            const isActive = activeTab === t;
            const c = counts[t];
            return (
              <button
                key={t}
                ref={(el) => {
                  tabBtnRefs.current[i] = el;
                }}
                onClick={() => changeTab(t)}
                className={`pill-tab relative z-10 px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-gray-500'
                }`}
                style={{
                  transition: 'color 420ms cubic-bezier(0.22, 1, 0.36, 1)',
                  border: `1px solid ${isActive ? 'transparent' : '#E5E7EB'}`,
                  background: 'transparent',
                }}
              >
                {t} {c > 0 && <span className="ml-0.5 opacity-80">{c}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div
        key={activeTab}
        className={`px-2.5 pb-6 ${direction === 'right' ? 'tab-slide-right' : 'tab-slide-left'}`}
      >
        {filteredCoupons.length === 0 ? (
          <EmptyState icon="payment" message="쿠폰이 없습니다" />
        ) : (
          <div className="flex flex-col gap-3 stagger-children">
            {filteredCoupons.map((coupon) => {
              const isAvailable = coupon.status === 'available';
              const isExpired = coupon.status === 'expired';
              const accent = isAvailable ? '#7C3AED' : '#A4ABBA';
              const softBg = isAvailable ? '#F4EFFF' : '#F3F4F6';

              return (
                <div
                  key={coupon.id}
                  className="card-press relative flex overflow-hidden"
                  style={{
                    borderRadius: 14,
                    boxShadow: isAvailable
                      ? '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(124,58,237,0.08)'
                      : '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.04)',
                    opacity: isAvailable ? 1 : 0.7,
                    backgroundColor: '#fff',
                  }}
                >
                  {/* Left: amount */}
                  <div
                    className="flex flex-col items-center justify-center py-5 relative"
                    style={{ width: 120, backgroundColor: softBg }}
                  >
                    <img src="/icons/mypage/coupons.svg" alt="" width={28} height={28} className="mb-1" />
                    <p
                      className="text-[22px] font-extrabold leading-none"
                      style={{ color: accent }}
                    >
                      {coupon.discountAmount.toLocaleString()}
                      <span className="text-[13px] font-semibold ml-0.5">원</span>
                    </p>
                    <p
                      className="text-[11px] font-semibold mt-1"
                      style={{ color: accent, opacity: 0.85 }}
                    >
                      할인쿠폰
                    </p>
                  </div>

                  {/* Notch punch effect */}
                  <div
                    className="absolute bg-white rounded-full"
                    style={{
                      width: 16,
                      height: 16,
                      top: -8,
                      left: 112,
                      boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.05)',
                    }}
                  />
                  <div
                    className="absolute bg-white rounded-full"
                    style={{
                      width: 16,
                      height: 16,
                      bottom: -8,
                      left: 112,
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  />

                  {/* Dashed divider */}
                  <div
                    className="absolute"
                    style={{
                      top: 12,
                      bottom: 12,
                      left: 120,
                      borderLeft: `1.5px dashed ${isAvailable ? '#D1C2FF' : '#E5E7EB'}`,
                    }}
                  />

                  {/* Right: info */}
                  <div className="flex-1 px-4 py-4 flex flex-col justify-center min-w-0">
                    <p className="text-[14px] font-bold text-gray-900 line-clamp-2 leading-snug">
                      {coupon.name}
                    </p>
                    {coupon.description && (
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">
                        {coupon.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      {coupon.expiryDate && (
                        <span className="text-[11px] text-gray-400">
                          {coupon.expiryDate}
                        </span>
                      )}
                      {isAvailable && coupon.daysLeft !== undefined && (
                        <span
                          className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: coupon.daysLeft <= 7 ? '#FEE2E2' : '#F4EFFF',
                            color: coupon.daysLeft <= 7 ? '#DC2626' : '#7C3AED',
                          }}
                        >
                          D-{coupon.daysLeft}
                        </span>
                      )}
                      {coupon.status === 'used' && (
                        <span className="inline-block text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-semibold">
                          사용완료
                        </span>
                      )}
                      {isExpired && (
                        <span className="inline-block text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded font-semibold">
                          기간만료
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pb-12" />
    </div>
  );
}
