'use client';

import { useState } from 'react';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import TabBar from '@/components/common/TabBar';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';
import { pointHistory } from '@/lib/mock-data';
import { Coins } from 'lucide-react';

const tabs = ['전체', '적립', '사용'];

export default function PointsPage() {
  const { isLoggedIn, user } = useStore();
  const [activeTab, setActiveTab] = useState('전체');

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <TopBar title="내 포인트" />
        <LoginRequired />
      </div>
    );
  }

  const filteredHistory = pointHistory.filter(item => {
    if (activeTab === '전체') return true;
    if (activeTab === '적립') return item.type === 'earn';
    if (activeTab === '사용') return item.type === 'use';
    return true;
  });

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto">
      <TopBar title="내 포인트" />

      {/* Total Points */}
      <div className="bg-white px-2.5 py-8 text-center">
        <div className="w-14 h-14 bg-[#7C3AED]/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Coins size={26} className="text-[#7C3AED]" />
        </div>
        <p className="text-sm text-gray-500 mb-1">보유 포인트</p>
        <p className="text-3xl font-bold text-[#7C3AED]">
          {(user?.points ?? 0).toLocaleString()}P
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white mt-2 px-2.5 py-3">
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="underline"
        />
      </div>

      {/* Point History */}
      {filteredHistory.length === 0 ? (
        <EmptyState icon="payment" message="포인트 내역이 없습니다" />
      ) : (
        <div className="bg-white mt-2">
          <div className="divide-y divide-gray-50">
            {filteredHistory.map((item) => (
              <div key={item.id} className="px-2.5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.date}</p>
                </div>
                <span className={`text-sm font-bold ${
                  item.amount > 0 ? 'text-[#7C3AED]' : 'text-gray-500'
                }`}>
                  {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}P
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
