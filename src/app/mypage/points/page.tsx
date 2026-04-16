'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';
import { Coins } from 'lucide-react';

const tabs = ['전체', '적립', '사용'];

export default function PointsPage() {
  const { isLoggedIn, user, pointHistory } = useStore();
  const [activeTab, setActiveTab] = useState('전체');
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

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto page-enter">
      <TopBar title="내 포인트" />

      {/* Total Points */}
      <div className="bg-white px-2.5 py-8 text-center fade-in-up">
        <div className="w-14 h-14 bg-[#7C3AED]/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Coins size={26} className="text-[#7C3AED]" />
        </div>
        <p className="text-sm text-gray-500 mb-1">보유 포인트</p>
        <p className="text-3xl font-bold text-[#7C3AED]">
          {(user?.points ?? 0).toLocaleString()}P
        </p>
      </div>

      {/* Tabs with sliding pill indicator */}
      <div className="bg-white px-2.5 pt-2 pb-3">
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

      {/* Point History */}
      <div
        key={activeTab}
        className={`${direction === 'right' ? 'tab-slide-right' : 'tab-slide-left'}`}
      >
        {filteredHistory.length === 0 ? (
          <EmptyState icon="payment" message="포인트 내역이 없습니다" />
        ) : (
          <div className="bg-white">
            <div className="divide-y divide-gray-50">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="px-2.5 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{item.date}</p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      item.amount > 0 ? 'text-[#7C3AED]' : 'text-gray-500'
                    }`}
                  >
                    {item.amount > 0 ? '+' : ''}
                    {item.amount.toLocaleString()}P
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
