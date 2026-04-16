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
  const { isLoggedIn, user, showToast } = useStore();
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

  const availableTotal = allCoupons
    .filter((c) => c.status === 'available')
    .reduce((sum, c) => sum + c.discountAmount, 0);

  return (
    <div className="min-h-screen bg-[#FAFAFB] max-w-[480px] mx-auto page-enter">
      <TopBar title="쿠폰함" />

      {/* Premium hero card */}
      <div className="px-2.5 pt-4 pb-5 fade-in-up">
        <div
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background:
              'linear-gradient(135deg, #1F1633 0%, #352252 45%, #5B2BB5 100%)',
            boxShadow: '0 10px 30px rgba(91,43,181,0.25)',
          }}
        >
          {/* Decorative orbs */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 180,
              height: 180,
              right: -50,
              top: -60,
              background:
                'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 70%)',
              borderRadius: '50%',
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              width: 140,
              height: 140,
              left: -40,
              bottom: -50,
              background:
                'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
              borderRadius: '50%',
            }}
          />

          <div className="relative">
            <div className="flex items-center gap-1.5 mb-3">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                style={{
                  color: '#EEE6FF',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                My Coupons
              </span>
            </div>
            <p className="text-[13px] text-white/70 mb-1.5">사용가능 쿠폰 혜택</p>
            <p className="text-white leading-none">
              <span className="text-[34px] font-extrabold tracking-tight">
                {availableTotal.toLocaleString()}
              </span>
              <span className="text-[18px] font-semibold ml-1">원</span>
            </p>
            <div
              className="mt-4 pt-4 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
            >
              <div>
                <p className="text-[11px] text-white/60">보유 쿠폰</p>
                <p className="text-[15px] text-white font-bold">
                  {counts['사용가능']}
                  <span className="text-[11px] text-white/60 font-medium ml-1">
                    / 총 {allCoupons.length}장
                  </span>
                </p>
              </div>
              <span className="text-[11px] text-white/70">KEY DOCTOR BENEFIT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — underline style for clean look */}
      <div className="sticky top-0 z-30 bg-[#FAFAFB]">
        <div className="px-2.5">
          <div className="relative flex border-b border-gray-200/80">
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
                  className="flex-1 py-3 text-[13px] font-semibold whitespace-nowrap"
                  style={{
                    color: isActive ? '#2B313D' : '#A4ABBA',
                    transition: 'color 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  {t}
                  <span
                    className="ml-1 text-[11px] font-bold"
                    style={{
                      color: isActive ? '#7C3AED' : '#C5CAD4',
                    }}
                  >
                    {c}
                  </span>
                </button>
              );
            })}
            <span
              aria-hidden
              className="absolute bottom-0 h-[2px] bg-[#7C3AED] pointer-events-none rounded-full"
              style={{
                left: indicator.left,
                width: indicator.width,
                transition:
                  'left 380ms cubic-bezier(0.22, 1, 0.36, 1), width 380ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div
        key={activeTab}
        className={`px-2.5 pt-4 pb-10 ${
          direction === 'right' ? 'tab-slide-right' : 'tab-slide-left'
        }`}
      >
        {filteredCoupons.length === 0 ? (
          <div className="py-10">
            <EmptyState icon="payment" message="쿠폰이 없습니다" />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 stagger-children">
            {filteredCoupons.map((coupon) => {
              const isAvailable = coupon.status === 'available';
              const isExpired = coupon.status === 'expired';
              const isUsed = coupon.status === 'used';
              const urgent = isAvailable && coupon.daysLeft !== undefined && coupon.daysLeft <= 7;

              return (
                <div
                  key={coupon.id}
                  className="card-press relative bg-white overflow-hidden"
                  style={{
                    borderRadius: 16,
                    border: '1px solid #EFF0F3',
                    boxShadow: isAvailable
                      ? '0 1px 2px rgba(16,24,40,0.03), 0 6px 18px rgba(124,58,237,0.06)'
                      : '0 1px 2px rgba(16,24,40,0.03)',
                    opacity: isAvailable ? 1 : 0.78,
                  }}
                >
                  {/* Top accent line for available */}
                  {isAvailable && (
                    <div
                      className="absolute top-0 left-0 right-0 h-[3px]"
                      style={{
                        background:
                          'linear-gradient(90deg, #7C3AED 0%, #A78BFA 50%, #7C3AED 100%)',
                      }}
                    />
                  )}

                  <div className="px-4 pt-4 pb-3">
                    {/* Header: discount amount + status badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p
                          className="text-[11px] font-bold tracking-wider uppercase mb-1"
                          style={{
                            color: isAvailable ? '#7C3AED' : '#9CA3AF',
                          }}
                        >
                          Discount
                        </p>
                        <p
                          className="leading-none"
                          style={{
                            color: isAvailable ? '#2B313D' : '#6B7280',
                          }}
                        >
                          <span className="text-[28px] font-extrabold tracking-tight">
                            {coupon.discountAmount.toLocaleString()}
                          </span>
                          <span className="text-[14px] font-bold ml-0.5">원</span>
                        </p>
                      </div>

                      {urgent && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                          }}
                        >
                          ⏱ 마감임박 D-{coupon.daysLeft}
                        </span>
                      )}
                      {isUsed && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                          사용완료
                        </span>
                      )}
                      {isExpired && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-400">
                          기간만료
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p
                      className="text-[14px] font-bold leading-snug line-clamp-2"
                      style={{ color: isAvailable ? '#2B313D' : '#6B7280' }}
                    >
                      {coupon.name}
                    </p>
                    {coupon.description && (
                      <p className="text-[12px] text-gray-500 mt-1 line-clamp-1">
                        {coupon.description}
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div
                    className="mx-4"
                    style={{
                      borderTop: '1px dashed #E5E7EB',
                    }}
                  />

                  {/* Footer */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {coupon.expiryDate && (
                        <>
                          <span className="text-[11px] text-gray-400">
                            {coupon.expiryDate}까지
                          </span>
                          {isAvailable && coupon.daysLeft !== undefined && !urgent && (
                            <span className="text-[10px] font-bold text-[#7C3AED] bg-[#F4EFFF] px-1.5 py-0.5 rounded">
                              D-{coupon.daysLeft}
                            </span>
                          )}
                        </>
                      )}
                      {!coupon.expiryDate && isUsed && (
                        <span className="text-[11px] text-gray-400">사용이 완료된 쿠폰입니다</span>
                      )}
                      {!coupon.expiryDate && isExpired && (
                        <span className="text-[11px] text-gray-400">유효기간이 만료되었습니다</span>
                      )}
                    </div>
                    {isAvailable && (
                      <button
                        onClick={() => showToast('결제 시 자동 적용됩니다.')}
                        className="btn-press text-[12px] font-bold px-3 py-1.5 rounded-full flex-shrink-0"
                        style={{
                          color: '#7C3AED',
                          backgroundColor: '#F4EFFF',
                        }}
                      >
                        사용하기
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        {filteredCoupons.length > 0 && (
          <div className="mt-6 px-2">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              · 쿠폰은 결제 시 자동으로 적용됩니다.
              <br />· 유효기간이 지난 쿠폰은 복구되지 않습니다.
              <br />· 일부 상품은 쿠폰 사용이 제한될 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
