'use client';

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  IconClock,
  IconCheckCircle,
  IconXCircle,
  IconPending,
  IconMapPin,
  IconCalendarMini,
} from '@/components/icons/AppIcons';
import TopBar from '@/components/common/TopBar';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';
import { useStore } from '@/store';
import { Reservation } from '@/types';

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
  { text: string; bg: string; dot: string; icon: React.ReactNode }
> = {
  pending: {
    text: 'text-[#F59E0B]',
    bg: 'bg-[#FFFBEB]',
    dot: 'text-[#F59E0B]',
    icon: <IconPending size={14} />,
  },
  confirmed: {
    text: 'text-[#7C3AED]',
    bg: 'bg-[#EDE9FE]',
    dot: 'text-[#7C3AED]',
    icon: <IconClock size={14} />,
  },
  completed: {
    text: 'text-[#10B981]',
    bg: 'bg-[#ECFDF5]',
    dot: 'text-[#10B981]',
    icon: <IconCheckCircle size={14} />,
  },
  cancelled: {
    text: 'text-gray-500',
    bg: 'bg-gray-100',
    dot: 'text-gray-400',
    icon: <IconXCircle size={14} />,
  },
};

export default function ReservationsPage() {
  const router = useRouter();
  const { isLoggedIn, reservations, showModal, showToast, updateReservationStatus } = useStore();
  const [activeTab, setActiveTab] = useState('전체');
  const prevIndexRef = useRef(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const activeIndex = statusTabs.indexOf(activeTab);

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

  const counts = useMemo(() => {
    const c: Record<Reservation['status'], number> = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };
    reservations.forEach((r) => (c[r.status] += 1));
    return c;
  }, [reservations]);

  const handleCancel = (id: string) => {
    showModal('예약 취소', '예약을 취소하시겠습니까?', () => {
      updateReservationStatus(id, 'cancelled');
      showToast('예약이 취소되었습니다.');
    });
  };

  return (
    <div className="pb-[86px] lg:pb-0 bg-white min-h-screen page-enter">
      <TopBar title="예약내역" showBack={false} />

      {!isLoggedIn ? (
        <LoginRequired />
      ) : (
        <>
          {/* Summary hero */}
          <div className="bg-white px-2.5 pt-2 pb-5 fade-in-up">
            <p className="text-[22px] font-bold text-gray-900 leading-tight">
              총 <span className="text-[#7C3AED]">{reservations.length}</span>건의 예약이 있어요
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {(
                [
                  { key: 'pending', label: '확인중' },
                  { key: 'confirmed', label: '확정' },
                  { key: 'completed', label: '완료' },
                  { key: 'cancelled', label: '취소' },
                ] as { key: Reservation['status']; label: string }[]
              ).map((s) => {
                const style = statusStyle[s.key];
                return (
                  <button
                    key={s.key}
                    onClick={() => changeTab(statusLabel[s.key])}
                    className={`${style.bg} rounded-2xl px-2 py-3 text-center card-press`}
                  >
                    <p className={`text-[11px] font-medium ${style.text}`}>{s.label}</p>
                    <p className={`text-lg font-bold ${style.text} mt-0.5`}>
                      {counts[s.key]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sticky tabs with sliding indicator */}
          <div className="sticky top-0 z-10 bg-white px-2.5 pt-3 pb-3 -mt-2">
            <div ref={tabsRef} className="relative flex gap-1.5 overflow-x-auto hide-scrollbar">
              {/* Animated indicator pill */}
              <span
                aria-hidden
                className="absolute top-0 bottom-0 rounded-full bg-gray-900 pointer-events-none"
                style={{
                  left: indicator.left,
                  width: indicator.width,
                  transition:
                    'left 400ms cubic-bezier(0.22, 1, 0.36, 1), width 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
              {statusTabs.map((tab, i) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    ref={(el) => {
                      tabBtnRefs.current[i] = el;
                    }}
                    onClick={() => changeTab(tab)}
                    className={`pill-tab relative z-10 px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}
                    style={{
                      transition: 'color 280ms ease',
                      border: isActive ? '1px solid transparent' : '1px solid #E5E7EB',
                      background: isActive ? 'transparent' : '#fff',
                    }}
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

                  return (
                    <Link
                      key={reservation.id}
                      href={`/reservations/${reservation.id}`}
                      className="block card-press"
                    >
                      <div
                        className="bg-white rounded-2xl p-4"
                        style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.04)' }}
                      >
                        {/* Status chip + date */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${style.bg} ${style.text}`}
                          >
                            {style.icon}
                            {statusLabel[reservation.status]}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {reservation.date}
                          </span>
                        </div>

                        {/* Product info */}
                        <div className="flex gap-3 mt-3">
                          <div className="w-[72px] h-[72px] rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-3xl">🦷</span>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <p className="text-[15px] font-bold text-gray-900 line-clamp-1 leading-snug">
                                {reservation.productTitle}
                              </p>
                              <p className="text-[12px] text-gray-500 mt-0.5">
                                {reservation.hospitalName}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="flex-shrink-0"><IconMapPin size={13} /></span>
                              <p className="text-[11px] text-gray-400 truncate">
                                {reservation.location}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Meta row - visit date + amount */}
                        <div className="mt-3 pt-3 border-t border-dashed border-gray-150" style={{ borderColor: '#F2F3F5' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <IconCalendarMini size={15} />
                              <span className="text-[12px]">{reservation.reservationDate || reservation.visitDate}</span>
                            </div>
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-[15px] font-extrabold text-gray-900">
                                {reservation.amount.toLocaleString()}
                              </span>
                              <span className="text-[11px] text-gray-500 font-medium">원</span>
                            </div>
                          </div>
                        </div>

                        {/* Action area */}
                        {isPending && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCancel(reservation.id);
                              }}
                              className="btn-press flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[13px] font-semibold bg-white hover:bg-gray-50"
                            >
                              예약취소
                            </button>
                            <div className="btn-press flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1">
                              상세보기
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        )}

                        {isCompleted && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/mypage/reviews/write?productId=${reservation.hospitalId}`);
                            }}
                            className="btn-press mt-3 w-full py-3 bg-[#7C3AED] text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5"
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
