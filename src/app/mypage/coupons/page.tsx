'use client';

import { useState } from 'react';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import TabBar from '@/components/common/TabBar';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';
import { Ticket } from 'lucide-react';

const tabs = ['사용가능', '사용완료', '기간만료'];

const statusMap: Record<string, 'available' | 'used' | 'expired'> = {
  '사용가능': 'available',
  '사용완료': 'used',
  '기간만료': 'expired',
};

export default function CouponsPage() {
  const { isLoggedIn, user } = useStore();
  const [activeTab, setActiveTab] = useState('사용가능');

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white max-w-[430px] mx-auto">
        <TopBar title="쿠폰함" />
        <LoginRequired />
      </div>
    );
  }

  const allCoupons = user?.coupons ?? [];
  const filteredCoupons = allCoupons.filter(c => c.status === statusMap[activeTab]);

  const tabCounts: Record<string, number> = {
    '사용가능': allCoupons.filter(c => c.status === 'available').length,
    '사용완료': allCoupons.filter(c => c.status === 'used').length,
    '기간만료': allCoupons.filter(c => c.status === 'expired').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-[430px] mx-auto">
      <TopBar title="쿠폰함" />

      <div className="bg-white px-4 py-3">
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="underline"
          counts={tabCounts}
        />
      </div>

      {filteredCoupons.length === 0 ? (
        <EmptyState icon="payment" message="쿠폰이 없습니다" />
      ) : (
        <div className="px-4 py-4 space-y-3">
          {filteredCoupons.map((coupon) => {
            const isAvailable = coupon.status === 'available';
            return (
              <div
                key={coupon.id}
                className={`bg-white rounded-xl border overflow-hidden ${
                  isAvailable ? 'border-[#7C3AED]/20' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex">
                  {/* Left: discount amount */}
                  <div className={`w-28 flex flex-col items-center justify-center py-5 border-r border-dashed ${
                    isAvailable ? 'border-[#7C3AED]/20 bg-[#7C3AED]/5' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <Ticket size={20} className={isAvailable ? 'text-[#7C3AED] mb-1' : 'text-gray-400 mb-1'} />
                    <span className={`text-lg font-bold ${isAvailable ? 'text-[#7C3AED]' : 'text-gray-400'}`}>
                      {coupon.discountAmount.toLocaleString()}원
                    </span>
                    <span className={`text-[11px] ${isAvailable ? 'text-[#7C3AED]/70' : 'text-gray-400'}`}>
                      할인
                    </span>
                  </div>

                  {/* Right: coupon info */}
                  <div className="flex-1 px-4 py-4 flex flex-col justify-center">
                    <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                      {coupon.name}
                    </p>
                    {coupon.expiryDate && (
                      <p className="text-xs text-gray-400 mb-1">
                        {coupon.expiryDate}까지
                      </p>
                    )}
                    {coupon.daysLeft !== undefined && isAvailable && (
                      <span className="inline-block text-[11px] text-[#7C3AED] bg-[#7C3AED]/10 px-2 py-0.5 rounded-full w-fit">
                        D-{coupon.daysLeft}
                      </span>
                    )}
                    {coupon.status === 'used' && (
                      <span className="inline-block text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full w-fit">
                        사용완료
                      </span>
                    )}
                    {coupon.status === 'expired' && (
                      <span className="inline-block text-[11px] text-red-400 bg-red-50 px-2 py-0.5 rounded-full w-fit">
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
  );
}
