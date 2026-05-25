'use client';

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useStore } from '@/store';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';
import { IconMapPin, IconCalendarMini } from '@/components/icons/AppIcons';
import { Reservation } from '@/types';
import { resolveProductImageUrl } from '@/lib/images';

const statusIconSrc: Record<Reservation['status'], string> = {
  pending: '/icons/status-pending.svg',
  confirmed: '/icons/status-confirmed.svg',
  completed: '/icons/status-completed.svg',
  cancelled: '/icons/status-cancelled.svg',
};

function StatusIcon({ status, size = 16 }: { status: Reservation['status']; size?: number }) {
  return (
    <img
      src={statusIconSrc[status]}
      alt=""
      width={size}
      height={size}
      style={{ display: 'inline-block' }}
    />
  );
}

const paymentTabs = ['전체', '결제완료', '결제대기', '취소'];

const tabToStatus: Record<string, Reservation['status'][] | null> = {
  '전체': null,
  '결제완료': ['confirmed', 'completed'],
  '결제대기': ['pending'],
  '취소': ['cancelled'],
};

const statusLabel: Record<Reservation['status'], string> = {
  pending: '결제대기',
  confirmed: '결제완료',
  completed: '이용완료',
  cancelled: '취소됨',
};

const statusStyle: Record<
  Reservation['status'],
  { text: string; chipBg: string }
> = {
  pending: { text: 'text-[#FFA04E]', chipBg: 'bg-[#FFF4E6]' },
  confirmed: { text: 'text-[#38B369]', chipBg: 'bg-[#E6F7EB]' },
  completed: { text: 'text-[#1084FD]', chipBg: 'bg-[#E6F2FF]' },
  cancelled: { text: 'text-[#6B7280]', chipBg: 'bg-[#F3F4F6]' },
};

export default function PaymentsPage() {
  const router = useRouter();
  const { isLoggedIn, reservations } = useStore();
  const [activeTab, setActiveTab] = useState('전체');
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const prevIdxRef = useRef(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const activeIdx = paymentTabs.indexOf(activeTab);

  const changeTab = (t: string) => {
    const nextIdx = paymentTabs.indexOf(t);
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

  const filtered = useMemo(() => {
    const target = tabToStatus[activeTab];
    if (!target) return reservations;
    return reservations.filter((r) => target.includes(r.status));
  }, [activeTab, reservations]);

  return (
    <div className="pb-[86px] lg:pb-0 bg-white min-h-screen page-enter">
      {/* Header — same 22px extrabold pattern as 예약내역, plus a back chevron
          since this page is reached from mypage rather than the bottom nav. */}
      <div className="sticky top-0 z-40 bg-white flex items-center gap-1 px-2.5 lg:hidden" style={{ height: 56 }}>
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1"
          aria-label="뒤로가기"
        >
          <ChevronLeft size={26} strokeWidth={2.4} className="text-[#2B313D]" />
        </button>
        <h1 className="text-[22px] font-extrabold text-gray-900 leading-none">결제내역</h1>
      </div>

      {!isLoggedIn ? (
        <LoginRequired />
      ) : (
        <>
          {/* Sticky tabs */}
          <div className="partner-community-category-shell sticky top-[56px] z-[45] bg-white">
            <div ref={tabsRef} className="partner-community-categories hide-scrollbar">
              <span
                aria-hidden
                className="partner-community-category-indicator"
                style={{
                  width: indicator.width,
                  transform: `translateX(${indicator.left}px)`,
                  opacity: indicator.width > 0 ? 1 : 0,
                }}
              />
              {paymentTabs.map((tab, i) => {
                const isActive = activeTab === tab;
                const showActive = isActive && indicator.width > 0;
                return (
                  <button
                    key={tab}
                    ref={(el) => {
                      tabBtnRefs.current[i] = el;
                    }}
                    type="button"
                    onClick={() => changeTab(tab)}
                    className={showActive ? 'is-active' : undefined}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment list */}
          <div
            key={activeTab}
            className={`px-2.5 pb-6 lg:max-w-5xl lg:mx-auto lg:px-6 lg:py-6 ${
              direction === 'right' ? 'tab-slide-right' : 'tab-slide-left'
            }`}
          >
            {filtered.length === 0 ? (
              <EmptyState icon="payment" message="결제정보가 존재하지 않아요" />
            ) : (
              <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 stagger-children">
                {filtered.map((payment) => {
                  const style = statusStyle[payment.status];
                  const productImage = resolveProductImageUrl(
                    payment.productImage,
                    payment.productId ?? payment.id
                  );
                  return (
                    <Link
                      key={payment.id}
                      href={`/reservations/${payment.id}`}
                      className="block card-press"
                    >
                      <div
                        className="bg-white rounded-3xl p-3.5"
                        style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.04)' }}
                      >
                        {/* Status chip + date */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full text-[11px] font-semibold ${style.chipBg} ${style.text}`}
                          >
                            <StatusIcon status={payment.status} size={16} />
                            {statusLabel[payment.status]}
                          </span>
                          <span className="text-[15px] text-gray-400 font-medium">
                            {payment.date}
                          </span>
                        </div>

                        {/* Product info */}
                        <div className="flex gap-2.5 mt-2">
                          <div className="w-[72px] h-[72px] rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                            <img src={productImage} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                            <p className="text-[18px] font-bold text-gray-900 line-clamp-1 leading-tight">
                              {payment.productTitle}
                            </p>
                            <p className="text-[15px] text-gray-500 leading-tight">
                              {payment.hospitalName}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="flex-shrink-0"><IconMapPin size={15} /></span>
                              <p className="text-[15px] text-gray-400 truncate leading-tight">
                                {payment.location}
                              </p>
                              {/* 결제 방식 태그 (앱결제 vs 현장결제) — text only, no icon */}
                              {(() => {
                                const isApp = payment.paymentMethod === '앱결제';
                                return (
                                  <span
                                    className="ml-auto flex-shrink-0 inline-flex items-center rounded-md"
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: '2px 8px',
                                      color: isApp ? '#8037FF' : '#51535C',
                                      backgroundColor: isApp ? '#F4EFFF' : '#F2F3F5',
                                    }}
                                  >
                                    {isApp ? '앱결제' : '현장결제'}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Meta row */}
                        <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: '#F2F3F5' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <IconCalendarMini size={16} />
                              <span className="text-[15px]">{payment.reservationDate || payment.visitDate}</span>
                            </div>
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-[15px] font-bold text-gray-900">
                                {payment.amount.toLocaleString()}
                              </span>
                              <span className="text-[11px] text-gray-500 font-medium">원</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
