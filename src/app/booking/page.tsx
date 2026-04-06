'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TopBar from '@/components/common/TopBar';

const timeSlots = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

// Available dates in April 2026 (weekdays mostly, some excluded)
const availableDates = [1, 2, 3, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30];

const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

export default function BookingPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <BookingPage />
    </Suspense>
  );
}

function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') ?? '1';
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // April
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const calendarData = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    // Fill leading empty cells
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill trailing empty cells
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentYear, currentMonth]);

  const isAvailable = (day: number) => availableDates.includes(day);

  const handleDateSelect = (day: number) => {
    if (!isAvailable(day)) return;
    setSelectedDate(day);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleBooking = () => {
    if (selectedDate && selectedTime) {
      setShowConfirm(true);
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    router.push(`/payment?productId=${productId}`);
  };

  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
    setSelectedTime(null);
  };

  return (
    <div className="pb-28 bg-white min-h-screen lg:max-w-2xl lg:mx-auto lg:py-8 lg:bg-gray-50">
      <div className="lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-8">
      <TopBar title="내원일 선택" />

      {/* Calendar Header */}
      <div className="flex items-center justify-between px-2.5 py-3">
        <button onClick={goToPrevMonth} className="p-1">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="text-base font-bold">
          {currentYear}년 {currentMonth}월
        </h2>
        <button onClick={goToNextMonth} className="p-1">
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 px-2.5 mb-1">
        {dayLabels.map((label, i) => (
          <div
            key={label}
            className={`text-center text-xs font-medium py-2 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="px-2.5 mb-4">
        {calendarData.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7">
            {week.map((day, dayIdx) => {
              if (day === null) {
                return <div key={dayIdx} className="aspect-square" />;
              }

              const available = isAvailable(day);
              const isSelected = selectedDate === day;

              return (
                <button
                  key={dayIdx}
                  onClick={() => handleDateSelect(day)}
                  disabled={!available}
                  className={`aspect-square flex items-center justify-center text-sm relative ${
                    isSelected
                      ? 'bg-[#7C3AED] text-white rounded-full font-bold'
                      : available
                      ? 'text-gray-900 font-medium hover:bg-purple-50 rounded-full'
                      : 'text-gray-300'
                  }`}
                >
                  {day}
                  {available && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 bg-[#7C3AED] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 px-2.5 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#7C3AED] rounded-full" />
          <span className="text-xs text-gray-500">예약가능</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-200 rounded-full" />
          <span className="text-xs text-gray-500">예약불가</span>
        </div>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div className="px-2.5 mb-6">
          <h3 className="font-bold text-sm mb-3">
            {currentMonth}월 {selectedDate}일 시간 선택
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => handleTimeSelect(time)}
                className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                  selectedTime === time
                    ? 'bg-[#7C3AED] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-purple-50'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="px-2.5 mb-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-bold mb-2">안내사항</h3>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-[#7C3AED] mt-0.5">&#8226;</span>
              <span className="text-xs text-gray-600">예약 시간 10분 전까지 내원해 주세요.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#7C3AED] mt-0.5">&#8226;</span>
              <span className="text-xs text-gray-600">예약 변경 및 취소는 예약일 3일 전까지 가능합니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#7C3AED] mt-0.5">&#8226;</span>
              <span className="text-xs text-gray-600">당일 취소 시 위약금이 발생할 수 있습니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#7C3AED] mt-0.5">&#8226;</span>
              <span className="text-xs text-gray-600">공휴일은 예약이 불가합니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#7C3AED] mt-0.5">&#8226;</span>
              <span className="text-xs text-gray-600">
                시술 전 주의사항은 예약 확정 후 문자로 안내드립니다.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-2.5 py-3 z-50 lg:static lg:mt-6 lg:transform-none lg:left-auto lg:border-0 lg:px-2.5 lg:max-w-none">
        <button
          onClick={handleBooking}
          disabled={!selectedDate || !selectedTime}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors ${
            selectedDate && selectedTime
              ? 'bg-[#7C3AED] text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          예약하기
        </button>
      </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl mx-6 w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="text-lg font-bold mb-2">예약 확인</h3>
              <p className="text-sm text-gray-600 mb-1">
                {currentYear}년 {currentMonth}월 {selectedDate}일
              </p>
              <p className="text-lg font-bold text-[#7C3AED]">{selectedTime}</p>
              <p className="text-sm text-gray-400 mt-2">위 일시로 예약하시겠습니까?</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 text-sm font-medium text-gray-500"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3.5 text-sm font-bold text-[#7C3AED] border-l border-gray-100"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
