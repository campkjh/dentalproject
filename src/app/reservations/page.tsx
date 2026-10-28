'use client';

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import ToneListCard from '@/components/common/ToneListCard';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useReservationRealtimeRefresh } from '@/lib/realtime/reservations';
import { useStore } from '@/store';
import { Reservation } from '@/types';
import { resolveProductImageUrl } from '@/lib/images';

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

/** 상태 배지 점 색 */
const statusDot: Record<Reservation['status'], string> = {
  pending: '#FFB331',
  confirmed: '#3DD598',
  completed: '#4D9CFF',
  cancelled: '#B0B8C1',
};

export default function ReservationsPage() {
  const router = useRouter();
  const { authUser } = useSession();
  const { isLoggedIn, reservations, showConfirm, showAlert, showToast, updateReservationStatus, hydrateMe } = useStore();
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
    showConfirm(
      '예약 취소',
      '예약을 취소하시겠습니까?\n결제한 금액은 함께 취소돼요.',
      async () => {
        // 결제 취소까지 몇 초 걸리므로 처리 중임을 바로 알린다
        showToast('예약을 취소하고 있어요…');
        const { error } = await updateReservationStatus(id, 'cancelled');
        if (error) showAlert('예약을 취소하지 못했어요', error);
        else showAlert('예약이 취소되었습니다', '앱에서 결제한 금액은 결제수단에 따라 영업일 기준 3~5일 안에 환불돼요.');
      },
      { confirmText: '예약 취소', cancelText: '닫기' }
    );
  };

  return (
    <div className="pb-[86px] lg:pb-0 bg-white min-h-screen page-enter">
      {/* 탭 머리 — 프리티풀 탭 머리 표준(왼쪽 16 · 20 굵게) */}
      <div className="sticky top-0 z-40 flex items-center bg-white px-4 lg:hidden" style={{ height: 56 }}>
        <h1 className="text-[20px] font-bold leading-none text-[#191F28]">예약내역</h1>
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
            className={`px-4 pb-6 lg:max-w-5xl lg:mx-auto lg:px-6 lg:py-6 ${
              direction === 'right' ? 'tab-slide-right' : 'tab-slide-left'
            }`}
          >
            {filtered.length === 0 ? (
              <EmptyState icon="calendar" message="내역이 존재하지 않아요" />
            ) : (
              <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 stagger-children">
                {filtered.map((reservation, index) => {
                  const isPending = reservation.status === 'pending';
                  const isCompleted = reservation.status === 'completed';
                  const productImage = resolveProductImageUrl(reservation.productImage, reservation.productId ?? reservation.id);
                  return (
                    <ToneListCard
                      key={reservation.id}
                      index={index}
                      href={`/reservations/${reservation.id}`}
                      image={productImage}
                      name={reservation.productTitle}
                      badge={{ label: statusLabel[reservation.status], dot: statusDot[reservation.status] }}
                      meta={[reservation.hospitalName, reservation.reservationDate || reservation.visitDate || reservation.date].filter(Boolean)}
                      rows={[
                        { label: reservation.paymentMethod === '앱결제' ? '앱결제' : '현장결제', value: `${reservation.amount.toLocaleString()}원` },
                        ...(reservation.scheduleHistory?.[0] ? [{ label: '변경내역', value: <span className="text-[13px] font-semibold">{reservation.scheduleHistory[0].content}</span> }] : []),
                      ]}
                      footer={
                        isPending ? (
                          <div className="mt-3 flex gap-2">
                            <span className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-white/70 text-[15px] font-bold text-[#333D4B]">상세보기</span>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancel(reservation.id); }}
                              className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-white/70 text-[15px] font-bold text-[#F04452] transition-transform active:scale-[0.98]"
                            >
                              예약취소
                            </button>
                          </div>
                        ) : isCompleted ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/mypage/reviews/write?productId=${reservation.productId ?? ''}&reservationId=${reservation.id}`);
                            }}
                            className="mt-3 flex h-12 w-full items-center justify-center gap-1 rounded-[14px] bg-[#3180F7] text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
                          >
                            리뷰 쓰고 500P 받기 <ChevronRight size={16} />
                          </button>
                        ) : null
                      }
                    />
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
