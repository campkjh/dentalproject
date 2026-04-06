'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Navigation, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { Reservation } from '@/types';
import { hospitals } from '@/lib/mock-data';

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

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { reservations, showModal, showToast } = useStore();
  const [showPolicy, setShowPolicy] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const reservation = reservations.find((r) => r.id === params.id);

  if (!reservation) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar title="정보" />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400">예약 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const hospital = hospitals.find((h) => h.id === reservation.hospitalId);

  const handleCancel = () => {
    showModal('예약 취소', '정말 예약을 취소하시겠습니까?', () => {
      showToast('예약이 취소되었습니다.');
      router.back();
    });
  };

  const handleScheduleChange = () => {
    if (!selectedDate || !selectedTime) {
      showToast('날짜와 시간을 선택해주세요.');
      return;
    }
    showToast('스케줄이 변경되었습니다.');
    setShowSchedulePicker(false);
  };

  // Generate dates for calendar picker
  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30',
  ];

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <TopBar title="정보" />

      {/* Status + date */}
      <div className="bg-white px-2.5 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              statusColor[reservation.status]
            }`}
          >
            {statusLabel[reservation.status]}
          </span>
          <span className="text-sm text-gray-500">{reservation.date}</span>
        </div>
      </div>

      {/* Product card */}
      <div className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
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
      </div>

      {/* Dates info */}
      <div className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">날짜 정보</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">방문일시</span>
            <span className="text-sm text-gray-700">{reservation.visitDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">예약일시</span>
            <span className="text-sm text-gray-700">
              {reservation.reservationDate}
            </span>
          </div>
          {reservation.status === 'cancelled' && reservation.cancelDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">취소일시</span>
              <span className="text-sm text-red-500">
                {reservation.cancelDate}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">금액</span>
          <span className="text-lg font-bold text-gray-900">
            {reservation.amount.toLocaleString()}원
          </span>
        </div>
      </div>

      {/* Cancel button or disabled state */}
      {(reservation.status === 'pending' ||
        reservation.status === 'confirmed') && (
        <div className="mx-4 mt-3">
          {reservation.status === 'pending' ? (
            <button
              onClick={handleCancel}
              className="w-full py-3 border border-red-400 text-red-500 rounded-xl text-sm font-medium bg-white"
            >
              취소하기
            </button>
          ) : (
            <button
              disabled
              className="w-full py-3 border border-gray-200 text-gray-400 rounded-xl text-sm font-medium bg-gray-50 cursor-not-allowed"
            >
              취소불가
            </button>
          )}
        </div>
      )}

      {/* Cancel reason for cancelled */}
      {reservation.status === 'cancelled' && reservation.cancelReason && (
        <div className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-2">취소내용</h3>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-sm text-gray-600 leading-relaxed">
              {reservation.cancelReason}
            </p>
          </div>
        </div>
      )}

      {/* Schedule change for confirmed */}
      {reservation.status === 'confirmed' && (
        <div className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
          <button
            onClick={() => setShowSchedulePicker(!showSchedulePicker)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-[#7C3AED]" />
              <span className="text-sm font-bold text-gray-900">
                스케줄 변경
              </span>
            </div>
            {showSchedulePicker ? (
              <ChevronUp size={18} className="text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-400" />
            )}
          </button>

          {showSchedulePicker && (
            <div className="mt-4">
              {/* Date picker */}
              <p className="text-xs text-gray-500 mb-2">날짜 선택</p>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                {dates.map((date) => {
                  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                  const isSelected = selectedDate === key;
                  const dayName = dayNames[date.getDay()];
                  const isSunday = date.getDay() === 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[52px] text-xs transition-colors ${
                        isSelected
                          ? 'bg-[#7C3AED] text-white'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span
                        className={`text-[10px] ${
                          isSelected
                            ? 'text-white/80'
                            : isSunday
                            ? 'text-red-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {dayName}
                      </span>
                      <span className="font-bold mt-0.5">
                        {date.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Time picker */}
              <p className="text-xs text-gray-500 mb-2 mt-3">시간 선택</p>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedTime === time
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              <button
                onClick={handleScheduleChange}
                className="w-full mt-4 py-3 bg-[#7C3AED] text-white rounded-xl text-sm font-medium"
              >
                스케줄변경
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hospital info */}
      <div className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">병원정보</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">병원명</span>
            <span className="text-sm text-gray-700">
              {reservation.hospitalName}
            </span>
          </div>
          <div className="flex items-start justify-between">
            <span className="text-sm text-gray-500 flex-shrink-0">위치</span>
            <span className="text-sm text-gray-700 text-right ml-4">
              {reservation.location}
            </span>
          </div>
          {hospital?.tags && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {hospital.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-[#EDE9FE] text-[#7C3AED] text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <button className="w-full mt-2 py-2.5 border border-[#7C3AED] text-[#7C3AED] rounded-xl text-sm font-medium flex items-center justify-center gap-1.5">
            <Navigation size={14} />
            찾아가는길
          </button>
        </div>
      </div>

      {/* Customer info */}
      <div className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">고객정보</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">이름</span>
            <span className="text-sm text-gray-700">
              {reservation.customerName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">휴대폰</span>
            <span className="text-sm text-gray-700">
              {reservation.customerPhone}
            </span>
          </div>
          {reservation.paymentType && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">결제유형</span>
              <span className="px-2.5 py-0.5 bg-[#EDE9FE] text-[#7C3AED] text-xs rounded-full font-medium">
                {reservation.paymentType}
              </span>
            </div>
          )}
          {reservation.paymentMethod && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">결제수단</span>
              <span className="text-sm text-gray-700">
                {reservation.paymentMethod}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hospital policy */}
      <div className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
        <button
          onClick={() => setShowPolicy(!showPolicy)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="text-sm font-bold text-gray-900">병원정책</h3>
          {showPolicy ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </button>
        {showPolicy && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              - 예약 확정 후 취소 시 취소 수수료가 발생할 수 있습니다.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mt-1">
              - 방문일 기준 3일 전까지 무료 취소 가능합니다.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mt-1">
              - 방문일 기준 2일 전: 예약금의 50% 차감
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mt-1">
              - 방문일 기준 1일 전 ~ 당일: 예약금 전액 차감
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mt-1">
              - 노쇼(No-show) 시 예약금 전액 차감 및 향후 예약이 제한될 수
              있습니다.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mt-1">
              - 병원 사정에 의한 취소 시 전액 환불됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
