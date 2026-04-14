'use client';

import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';
import { reservations } from '@/lib/mock-data';
import { MapPin } from 'lucide-react';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: '결제대기', className: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '결제완료', className: 'bg-green-100 text-green-600' },
  completed: { label: '이용완료', className: 'bg-blue-100 text-blue-600' },
  cancelled: { label: '취소됨', className: 'bg-red-100 text-red-500' },
};

export default function PaymentsPage() {
  const { isLoggedIn } = useStore();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <TopBar title="결제내역" />
        <LoginRequired />
      </div>
    );
  }

  // Use reservations as payment data
  const payments = reservations;

  if (payments.length === 0) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <TopBar title="결제내역" />
        <EmptyState icon="payment" message="결제정보가 존재하지 않아요" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto">
      <TopBar title="결제내역" />

      <div className="px-2.5 py-4 space-y-3">
        {payments.map((payment) => {
          const status = statusConfig[payment.status];
          return (
            <div key={payment.id} className="bg-white rounded-xl p-4 border border-gray-100">
              {/* Status & Date */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.className}`}>
                  {status.label}
                </span>
                <span className="text-xs text-gray-400">{payment.date}</span>
              </div>

              {/* Product Info */}
              <div className="flex gap-3 mb-3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🦷</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                    {payment.productTitle}
                  </p>
                  <p className="text-xs text-gray-500">{payment.hospitalName}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-1.5 pt-3 border-t border-gray-50">
                <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-400 line-clamp-1">{payment.location}</p>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-500">결제금액</span>
                <span className="text-sm font-bold text-gray-900">{payment.amount.toLocaleString()}원</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
