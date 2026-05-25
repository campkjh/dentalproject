'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';

const tabs = ['전체', '적립', '사용'] as const;
type Tab = (typeof tabs)[number];

export default function PointsPage() {
  const { isLoggedIn, user, pointHistory } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('전체');
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <TopBar title="내 포인트" />
        <LoginRequired />
      </div>
    );
  }

  const filteredHistory = pointHistory.filter((item) => {
    if (activeTab === '전체') return true;
    if (activeTab === '적립') return item.type === 'earn';
    if (activeTab === '사용') return item.type === 'use';
    return true;
  });

  const formattedPoints = (user?.points ?? 0).toLocaleString();

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto page-enter">
      <TopBar title="내 포인트" />

      {/* Hero: balance on the left, seal+hexagon illustration on the right */}
      <div className="px-5 pt-6 pb-7 flex items-center justify-between gap-4">
        <div className="flex-shrink-0 fade-in-up">
          <p className="text-[14px] text-[#6B7280]">보유중인 포인트</p>
          <p className="mt-1 text-[34px] font-extrabold text-[#2B313D] leading-none">
            {formattedPoints}P
          </p>
        </div>
        <img
          src="/images/point-seal-hero.png"
          alt=""
          aria-hidden
          width={148}
          height={120}
          className="flex-shrink-0 select-none"
          style={{ height: 120, width: 'auto', objectFit: 'contain' }}
        />
      </div>

      {/* Tabs: underline indicator (전체/적립/사용) */}
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
          {/* Sliding underline */}
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

      {/* History */}
      <div
        key={activeTab}
        className={`${direction === 'right' ? 'tab-slide-right' : 'tab-slide-left'}`}
      >
        {filteredHistory.length === 0 ? (
          <EmptyState icon="point" message="포인트가 없어요" />
        ) : (
          <div className="bg-white divide-y divide-gray-50">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="px-5 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-[15px] font-medium text-[#2B313D]">
                    {item.description}
                  </p>
                  <p className="text-[12px] text-[#A4ABBA] mt-1">{item.date}</p>
                </div>
                <span
                  className={`text-[15px] font-bold ${
                    item.amount > 0 ? 'text-[#8037FF]' : 'text-[#6B7280]'
                  }`}
                >
                  {item.amount > 0 ? '+' : ''}
                  {item.amount.toLocaleString()}P
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
