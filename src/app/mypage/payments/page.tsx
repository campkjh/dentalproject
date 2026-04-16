'use client';

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';
import { IconMapPin, IconCalendarMini } from '@/components/icons/AppIcons';
import { Reservation } from '@/types';

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
  { text: string; bg: string; chipBg: string }
> = {
  pending: { text: 'text-[#FFA04E]', bg: 'bg-[#FFF4E6]', chipBg: 'bg-[#FFF4E6]' },
  confirmed: { text: 'text-[#38B369]', bg: 'bg-[#E6F7EB]', chipBg: 'bg-[#E6F7EB]' },
  completed: { text: 'text-[#1084FD]', bg: 'bg-[#E6F2FF]', chipBg: 'bg-[#E6F2FF]' },
  cancelled: { text: 'text-[#6B7280]', bg: 'bg-[#F3F4F6]', chipBg: 'bg-[#F3F4F6]' },
};

export default function PaymentsPage() {
  const { isLoggedIn, reservations } = useStore();
  const [activeTab, setActiveTab] = useState('전체');
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const prevIdxRef = useRef(0);
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
  }, [activeTab]);

  const counts = useMemo(() => {
    const c: Record<Reservation['status'], number> = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };
    reservations.forEach((r) => (c[r.status] += 1));
    return c;
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <TopBar title="결제내역" />
        <LoginRequired />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto page-enter">
      <TopBar title="결제내역" />

      {/* Summary hero */}
      <div className="bg-white px-2.5 pt-2 pb-5 fade-in-up">
        <p className="text-[22px] font-bold text-gray-900 leading-tight">
          총 <span className="text-[#7C3AED]">{reservations.length}</span>건의 결제내역이 있어요
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {(
            [
              { key: 'pending', label: '결제대기', tab: '결제대기' },
              { key: 'confirmed', label: '결제완료', tab: '결제완료' },
              { key: 'completed', label: '이용완료', tab: '결제완료' },
              { key: 'cancelled', label: '취소', tab: '취소' },
            ] as { key: Reservation['status']; label: string; tab: string }[]
          ).map((s) => {
            const style = statusStyle[s.key];
            return (
              <button
                key={s.key}
                onClick={() => changeTab(s.tab)}
                className={`${style.bg} rounded-2xl px-2 py-3 text-center card-press flex flex-col items-center`}
              >
                <StatusIcon status={s.key} size={30} />
                <p className={`text-[11px] font-medium ${style.text} mt-1`}>{s.label}</p>
                <p className={`text-base font-bold ${style.text} mt-0.5 leading-none`}>
                  {counts[s.key]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky tabs */}
      <div className="sticky top-0 z-10 bg-white px-2.5 pt-3 pb-3 -mt-2">
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
          {paymentTabs.map((t, i) => {
            const isActive = activeTab === t;
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
                {t}
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
        {filtered.length === 0 ? (
          <EmptyState icon="payment" message="결제정보가 존재하지 않아요" />
        ) : (
          <div className="flex flex-col gap-3 stagger-children">
            {filtered.map((payment) => {
              const style = statusStyle[payment.status];
              return (
                <div
                  key={payment.id}
                  className="bg-white rounded-2xl p-3.5 card-press"
                  style={{
                    boxShadow:
                      '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.04)',
                  }}
                >
                  {/* Status chip + date */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full text-[11px] font-semibold ${style.chipBg} ${style.text}`}
                    >
                      <StatusIcon status={payment.status} size={16} />
                      {statusLabel[payment.status]}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {payment.date}
                    </span>
                  </div>

                  {/* Product info */}
                  <div className="flex gap-2.5 mt-2">
                    <div className="w-[64px] h-[64px] rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🦷</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-[14px] font-bold text-gray-900 line-clamp-1 leading-tight">
                        {payment.productTitle}
                      </p>
                      <p className="text-[12px] text-gray-500 leading-tight">
                        {payment.hospitalName}
                      </p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span className="flex-shrink-0">
                          <IconMapPin size={12} />
                        </span>
                        <p className="text-[11px] text-gray-400 truncate leading-tight">
                          {payment.location}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div
                    className="mt-2 pt-2 border-t border-dashed"
                    style={{ borderColor: '#F2F3F5' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <IconCalendarMini size={15} />
                        <span className="text-[12px]">
                          {payment.reservationDate || payment.visitDate}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-[15px] font-extrabold text-gray-900">
                          {payment.amount.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">원</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
