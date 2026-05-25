'use client';

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { IconMapPin, IconCalendarMini } from '@/components/icons/AppIcons';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useReservationRealtimeRefresh } from '@/lib/realtime/reservations';
import { useStore } from '@/store';
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

const statusTabs = ['전체', '예약확인중', '예약확정', '완료', '취소'];

const statusMap: Record<string, Reservation['status'] | null> = {
  '전체': null,
  '예약확인중': 'pending',
  '예약확정': 'confirmed',
  '완료': 'completed',
  '취소': 'cancelled',
};

const statusLabel: Record<Reservation['status'], string> = {
  pending: '예약확인중',
  confirmed: '예약확정',
  completed: '완료',
  cancelled: '취소',
};

const statusStyle: Record<
  Reservation['status'],
  { text: string; bg: string; chipBg: string }
> = {
  pending: {
    text: 'text-[#FFA04E]',
    bg: 'bg-[#FFF4E6]',
    chipBg: 'bg-[#FFF4E6]',
  },
  confirmed: {
    text: 'text-[#38B369]',
    bg: 'bg-[#E6F7EB]',
    chipBg: 'bg-[#E6F7EB]',
  },
  completed: {
    text: 'text-[#1084FD]',
    bg: 'bg-[#E6F2FF]',
    chipBg: 'bg-[#E6F2FF]',
  },
  cancelled: {
    text: 'text-[#6B7280]',
    bg: 'bg-[#F3F4F6]',
    chipBg: 'bg-[#F3F4F6]',
  },
};

export default function ReservationsPage() {
  const router = useRouter();
  const { authUser } = useSession();
  const { isLoggedIn, reservations, showModal, showToast, updateReservationStatus, hydrateMe } = useStore();
  const [activeTab, setActiveTab] = useState('전체');
  const prevIndexRef = useRef(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const activeIndex = statusTabs.indexOf(activeTab);

  useReservationRealtimeRefresh({
    enabled: Boolean(isLoggedIn && authUser?.id),
    userId: authUser?.id,
    onChange: hydrateMe,
  });

  const changeTab = (tab: string) => {
    const nextIdx = statusTabs.indexOf(tab);
    setDirection(nextIdx >= prevIndexRef.current ? 'right' : 'left');
    prevIndexRef.current = nextIdx;
    setActiveTab(tab);
  };

  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[activeIndex];
    const container = tabsRef.current;
    if (!btn || !container) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeIndex]);

  useEffect(() => {
    const handleResize = () => {
      const btn = tabBtnRefs.current[activeIndex];
      if (!btn) return;
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndex]);

  const filtered = useMemo(
    () =>
      reservations.filter((r) => {
        const target = statusMap[activeTab];
        if (!target) return true;
        return r.status === target;
      }),
    [reservations, activeTab]
  );

  const handleCancel = (id: string) => {
    showModal('예약 취소', '예약을 취소하시겠습니까?', () => {
      updateReservationStatus(id, 'cancelled');
      showToast('예약이 취소되었습니다.');
    });
  };

  return (
    <div className="pb-[86px] lg:pb-0 bg-white min-h-screen page-enter">
      {/* Header — community-style: 22px extrabold */}
      <div className="sticky top-0 z-40 bg-white flex items-center px-2.5 lg:hidden" style={{ height: 56 }}>
        <h1 className="text-[22px] font-extrabold text-gray-900 leading-none">예약내역</h1>
      </div>

      {!isLoggedIn ? (
        <LoginRequired />
      ) : (
        <>
          {/* Sticky tabs (no docking — hero/summary removed) */}
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
              {statusTabs.map((tab, i) => {
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

          {/* Reservation list */}
          <div
            key={activeTab}
            className={`px-2.5 pb-6 lg:max-w-5xl lg:mx-auto lg:px-6 lg:py-6 ${
              direction === 'right' ? 'tab-slide-right' : 'tab-slide-left'
            }`}
          >
            {filtered.length === 0 ? (
              <EmptyState icon="calendar" message="내역이 존재하지 않아요" />
            ) : (
              <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 stagger-children">
                {filtered.map((reservation) => {
                  const style = statusStyle[reservation.status];
                  const isPending = reservation.status === 'pending';
                  const isCompleted = reservation.status === 'completed';
                  const productImage = resolveProductImageUrl(
                    reservation.productImage,
                    reservation.productId ?? reservation.id
                  );

                  return (
                    <Link
                      key={reservation.id}
                      href={`/reservations/${reservation.id}`}
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
                            <StatusIcon status={reservation.status} size={16} />
                            {statusLabel[reservation.status]}
                          </span>
                          <span className="text-[15px] text-gray-400 font-medium">
                            {reservation.date}
                          </span>
                        </div>

                        {/* Product info */}
                        <div className="flex gap-2.5 mt-2">
                          <div className="w-[72px] h-[72px] rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                            <img src={productImage} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                            <p className="text-[18px] font-bold text-gray-900 line-clamp-1 leading-tight">
                              {reservation.productTitle}
                            </p>
                            <p className="text-[15px] text-gray-500 leading-tight">
                              {reservation.hospitalName}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="flex-shrink-0"><IconMapPin size={15} /></span>
                              <p className="text-[15px] text-gray-400 truncate leading-tight">
                                {reservation.location}
                              </p>
                              {/* 결제 방식 태그 (앱결제 vs 현장결제) */}
                              {(() => {
                                const isApp = reservation.paymentMethod === '앱결제';
                                return (
                                  <span
                                    className="ml-auto flex-shrink-0 inline-flex items-center gap-1 rounded-md"
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: '2px 6px',
                                      color: isApp ? '#8037FF' : '#51535C',
                                      backgroundColor: isApp ? '#F4EFFF' : '#F2F3F5',
                                    }}
                                  >
                                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                      <rect x="2" y="5" width="20" height="14" rx="2" />
                                      <path d="M2 10h20" />
                                    </svg>
                                    {isApp ? '앱결제' : '현장결제'}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Meta row - visit date + amount */}
                        <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: '#F2F3F5' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <IconCalendarMini size={15} />
                              <span className="text-[12px]">{reservation.reservationDate || reservation.visitDate}</span>
                            </div>
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-[15px] font-bold text-gray-900">
                                {reservation.amount.toLocaleString()}
                              </span>
                              <span className="text-[11px] text-gray-500 font-medium">원</span>
                            </div>
                          </div>
                          {reservation.scheduleHistory?.[0] && (
                            <p className="mt-1.5 text-[11px] font-semibold text-[#8037FF] line-clamp-1">
                              변경내역: {reservation.scheduleHistory[0].content}
                            </p>
                          )}
                        </div>

                        {/* Action area — 상세보기 left, 예약취소 right (48px / 18px / weight 700 / radius 12) */}
                        {isPending && (
                          <div className="mt-3 flex gap-2">
                            <div
                              className="btn-press flex-1 flex items-center justify-center text-white"
                              style={{
                                height: 48,
                                borderRadius: 12,
                                backgroundColor: '#292A2E',
                                fontSize: 18,
                                fontWeight: 700,
                              }}
                            >
                              상세보기
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCancel(reservation.id);
                              }}
                              className="btn-press flex-1 flex items-center justify-center"
                              style={{
                                height: 48,
                                borderRadius: 12,
                                backgroundColor: '#F2F3F5',
                                color: '#51535C',
                                fontSize: 18,
                                fontWeight: 700,
                              }}
                            >
                              예약취소
                            </button>
                          </div>
                        )}

                        {isCompleted && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(
                                `/mypage/reviews/write?productId=${reservation.productId ?? ''}&reservationId=${reservation.id}`
                              );
                            }}
                            className="btn-press mt-2.5 w-full py-2.5 bg-[#8037FF] text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5"
                          >
                            리뷰작성하고 500P 받기
                            <ChevronRight size={14} />
                          </button>
                        )}
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
