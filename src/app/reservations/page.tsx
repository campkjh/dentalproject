'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
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

const statusColor: Record<Reservation['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-[#EDE9FE] text-[#7C3AED]',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function ReservationsPage() {
  const router = useRouter();
  const { isLoggedIn, reservations, showModal, showToast, updateReservationStatus } = useStore();
  const [activeTab, setActiveTab] = useState('전체');

  const filtered = reservations.filter((r) => {
    const target = statusMap[activeTab];
    if (!target) return true;
    return r.status === target;
  });

  const handleCancel = (id: string) => {
    showModal('예약 취소', '예약을 취소하시겠습니까?', () => {
      updateReservationStatus(id, 'cancelled');
      showToast('예약이 취소되었습니다.');
    });
  };

  return (
    <div className="pb-[86px] lg:pb-0 bg-gray-50 min-h-screen">
      <TopBar title="예약내역" showBack={false} />

      {!isLoggedIn ? (
        <LoginRequired />
      ) : (
        <>
          {/* Status tabs - horizontal scrollable */}
          <div className="bg-white px-2.5 pb-3">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {statusTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Reservation list */}
          <div className="px-2.5 py-4 lg:max-w-5xl lg:mx-auto lg:px-6 lg:py-6">
            {filtered.length === 0 ? (
              <EmptyState icon="calendar" message="내역이 존재하지 않아요" />
            ) : (
              <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
                {filtered.map((reservation) => (
                  <Link
                    key={reservation.id}
                    href={`/reservations/${reservation.id}`}
                    className="block"
                  >
                    <div className="bg-white rounded-2xl p-4 shadow-sm lg:bg-white lg:rounded-xl lg:shadow-sm">
                      {/* Status badge + date */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            statusColor[reservation.status]
                          }`}
                        >
                          {statusLabel[reservation.status]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {reservation.date}
                        </span>
                      </div>

                      {/* Product info */}
                      <div className="flex gap-3">
                        <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative">
                          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center"><span className="text-2xl">🦷</span></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 line-clamp-2">
                            {reservation.productTitle}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {reservation.hospitalName}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                            <p className="text-xs text-gray-400 truncate">
                              {reservation.location}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Extra info for pending */}
                      {reservation.status === 'pending' && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">예약일시</span>
                            <span className="text-gray-700">
                              {reservation.reservationDate}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-gray-500">금액</span>
                            <span className="font-bold text-gray-900">
                              {reservation.amount.toLocaleString()}원
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCancel(reservation.id);
                            }}
                            className="mt-3 w-full py-2.5 border border-red-400 text-red-500 rounded-xl text-sm font-medium"
                          >
                            취소하기
                          </button>
                        </div>
                      )}

                      {/* Review button for completed */}
                      {reservation.status === 'completed' && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/mypage/reviews/write?productId=${reservation.hospitalId}`);
                            }}
                            className="w-full py-2.5 bg-[#7C3AED] text-white rounded-xl text-sm font-medium"
                          >
                            리뷰작성 +500P
                          </button>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
