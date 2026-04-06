'use client';

import { useState } from 'react';
import { Bell, MapPin } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { useStore } from '@/store';
import { Reservation } from '@/types';

const statusLabel: Record<Reservation['status'], string> = {
  pending: '새로운예약',
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

export default function HospitalHomePage() {
  const { reservations, showModal, showToast, updateReservationStatus } = useStore();
  const [activeTab, setActiveTab] = useState('전체');

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
  const cancelledCount = reservations.filter((r) => r.status === 'cancelled').length;

  const tabs = [
    { label: '전체', count: reservations.length },
    { label: '새로운예약', count: pendingCount },
    { label: '확정된예약', count: confirmedCount },
    { label: '취소된예약', count: cancelledCount },
  ];

  const filtered = reservations.filter((r) => {
    if (activeTab === '전체') return true;
    if (activeTab === '새로운예약') return r.status === 'pending';
    if (activeTab === '확정된예약') return r.status === 'confirmed';
    if (activeTab === '취소된예약') return r.status === 'cancelled';
    return true;
  });

  const handleConfirm = (id: string) => {
    showModal('예약 확정', '해당 예약을 확정하시겠습니까?', () => {
      updateReservationStatus(id, 'confirmed');
      showToast('예약이 확정되었습니다.');
    });
  };

  const handleCancel = (id: string) => {
    showModal('예약 취소', '해당 예약을 취소하시겠습니까?', () => {
      updateReservationStatus(id, 'cancelled', '병원측 취소');
      showToast('예약이 취소되었습니다.');
    });
  };

  return (
    <div className="pb-[86px] bg-gray-50 min-h-screen">
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 40 }} className="bg-white flex items-center justify-between h-12 px-4">
        <h1 className="text-lg font-bold">홈</h1>
        <button className="p-1">
          <Bell size={22} className="text-gray-700" />
        </button>
      </div>

      {/* Tab filters */}
      <div className="bg-white px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.label
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {tab.label} {tab.count}
            </button>
          ))}
        </div>
      </div>

      {/* Reservation list */}
      <div className="px-4 py-4">
        {filtered.length === 0 ? (
          <EmptyState icon="calendar" message="예약내역이 존재하지 않아요" />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
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

                {/* Reservation details */}
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">예약자</span>
                    <span className="text-gray-700">{reservation.customerName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">예약일시</span>
                    <span className="text-gray-700">{reservation.reservationDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">금액</span>
                    <span className="font-bold text-gray-900">
                      {reservation.amount.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* Action buttons for pending */}
                {reservation.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleCancel(reservation.id)}
                      className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium"
                    >
                      예약취소
                    </button>
                    <button
                      onClick={() => handleConfirm(reservation.id)}
                      className="flex-1 py-2.5 bg-[#7C3AED] text-white rounded-xl text-sm font-medium"
                    >
                      예약확정
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
