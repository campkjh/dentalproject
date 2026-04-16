'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { products } from '@/lib/mock-data';

const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

const timeGroups: { label: string; slots: string[] }[] = [
  { label: '오전', slots: ['10:00', '10:30', '11:00', '11:30', '12:00'] },
  { label: '오후', slots: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'] },
  { label: '저녁', slots: ['18:00', '18:30', '19:00', '19:30', '20:00'] },
];

const availableDates = [1, 2, 3, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28, 29, 30];

const unavailableTimes = new Set(['12:00', '15:00', '18:30']);

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
  const product = products.find((p) => p.id === productId);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const calendarData = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) currentWeek.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }
    return weeks;
  }, [currentYear, currentMonth]);

  const isAvailable = (day: number) => availableDates.includes(day);

  const isToday = (day: number) =>
    currentYear === today.getFullYear() &&
    currentMonth === today.getMonth() + 1 &&
    day === today.getDate();

  const handleDateSelect = (day: number) => {
    if (!isAvailable(day)) return;
    setSelectedDate(day);
    setSelectedTime(null);
  };

  const handleBooking = () => {
    if (selectedDate && selectedTime) setShowConfirm(true);
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

  const selectedDayLabel = selectedDate
    ? dayLabels[new Date(currentYear, currentMonth - 1, selectedDate).getDay()]
    : '';

  return (
    <div className="pb-32 bg-white min-h-screen lg:max-w-2xl lg:mx-auto lg:py-8">
      <div className="lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-8">
        <TopBar title="내원일 선택" />

        {/* Product summary — line style */}
        {product && (
          <div className="mx-2.5 mt-1 mb-4 py-3 border-y border-gray-100 fade-in-up">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-500 leading-tight">
                  {product.hospitalName}
                </p>
                <p className="text-[13px] font-semibold text-gray-900 line-clamp-1 leading-tight mt-0.5">
                  {product.title}
                </p>
              </div>
              <p className="text-[14px] font-bold text-gray-900 flex-shrink-0">
                {product.price.toLocaleString()}
                <span className="text-[11px] text-gray-500 font-medium ml-0.5">원</span>
              </p>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="px-2.5 mb-3 flex items-center gap-2">
          <StepDot active label="1" title="날짜 선택" />
          <div className="flex-1 h-[2px] bg-gray-200 rounded-full relative overflow-hidden">
            <span
              className="absolute inset-y-0 left-0 bg-gray-900 rounded-full"
              style={{
                width: selectedDate ? '100%' : '0%',
                transition: 'width 360ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>
          <StepDot active={!!selectedDate} label="2" title="시간 선택" />
        </div>

        {/* Calendar Header */}
        <div className="flex items-center justify-between px-2.5 py-3 mb-1">
          <button onClick={goToPrevMonth} className="p-1.5 -m-1.5 btn-press">
            <ChevronLeft size={22} className="text-gray-700" />
          </button>
          <h2 className="text-[18px] font-bold text-gray-900">
            {currentYear}년 {currentMonth}월
          </h2>
          <button onClick={goToNextMonth} className="p-1.5 -m-1.5 btn-press">
            <ChevronRight size={22} className="text-gray-700" />
          </button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 px-2.5 mb-1">
          {dayLabels.map((label, i) => (
            <div
              key={label}
              className={`text-center text-[11px] font-semibold py-1.5 ${
                i === 0 ? 'text-[#EF4444]' : i === 6 ? 'text-[#3B82F6]' : 'text-gray-400'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="px-2.5 mb-3">
          {calendarData.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7">
              {week.map((day, dayIdx) => {
                if (day === null) return <div key={dayIdx} className="aspect-square" />;

                const available = isAvailable(day);
                const isSelected = selectedDate === day;
                const today_ = isToday(day);

                return (
                  <button
                    key={dayIdx}
                    onClick={() => handleDateSelect(day)}
                    disabled={!available}
                    className="aspect-square flex items-center justify-center relative btn-press"
                  >
                    <span
                      className="flex items-center justify-center font-semibold transition-all"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        fontSize: 14,
                        backgroundColor: isSelected ? '#7C3AED' : 'transparent',
                        color: isSelected
                          ? '#fff'
                          : !available
                          ? '#D1D5DB'
                          : today_
                          ? '#7C3AED'
                          : '#2B313D',
                        border: today_ && !isSelected ? '1.5px solid #C4B5FD' : '1.5px solid transparent',
                        boxShadow: isSelected ? '0 4px 12px rgba(124,58,237,0.35)' : 'none',
                        transition: 'background-color 240ms ease, color 240ms ease, box-shadow 240ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                      }}
                    >
                      {day}
                    </span>
                    {available && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 bg-[#7C3AED] rounded-full" />
                    )}
                    {!available && (
                      <span
                        className="absolute w-5 h-px bg-gray-200"
                        style={{ transform: 'rotate(-30deg)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 px-2.5 mb-5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full" />
            <span className="text-[11px] text-gray-500 font-medium">예약가능</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3.5 h-px bg-gray-300"
              style={{ transform: 'rotate(-30deg)' }}
            />
            <span className="text-[11px] text-gray-500 font-medium">예약불가</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ border: '1.5px solid #C4B5FD' }}
            />
            <span className="text-[11px] text-gray-500 font-medium">오늘</span>
          </div>
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div className="px-2.5 mb-6 fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                {currentMonth}월 {selectedDate}일 ({selectedDayLabel}) 시간 선택
              </h3>
            </div>

            <div className="space-y-4">
              {timeGroups.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12px] font-semibold text-gray-700 leading-none">
                      {group.label}
                    </span>
                    <span className="text-[11px] text-gray-400 leading-none">
                      {group.slots.filter((t) => !unavailableTimes.has(t)).length}개 가능
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {group.slots.map((time) => {
                      const unavailable = unavailableTimes.has(time);
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          onClick={() => !unavailable && setSelectedTime(time)}
                          disabled={unavailable}
                          className="py-2.5 rounded-xl text-[13px] font-semibold btn-press relative"
                          style={{
                            backgroundColor: isSelected
                              ? '#7C3AED'
                              : unavailable
                              ? '#F3F4F6'
                              : '#fff',
                            color: isSelected
                              ? '#fff'
                              : unavailable
                              ? '#D1D5DB'
                              : '#2B313D',
                            border: `1.5px solid ${
                              isSelected
                                ? 'transparent'
                                : unavailable
                                ? '#F3F4F6'
                                : '#E5E7EB'
                            }`,
                            boxShadow: isSelected
                              ? '0 3px 10px rgba(124,58,237,0.25)'
                              : 'none',
                            textDecoration: unavailable ? 'line-through' : 'none',
                            transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                          }}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="px-2.5 mb-4">
          <div className="bg-[#F9FAFB] rounded-xl p-3.5">
            <h3 className="text-[13px] font-bold mb-1.5 text-gray-900 leading-tight">안내사항</h3>
            <ul className="space-y-1">
              {[
                '예약 시간 10분 전까지 내원해 주세요.',
                '예약 변경 및 취소는 예약일 3일 전까지 가능합니다.',
                '당일 취소 시 위약금이 발생할 수 있습니다.',
                '공휴일은 예약이 불가합니다.',
                '시술 전 주의사항은 예약 확정 후 문자로 안내드립니다.',
              ].map((note, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span className="text-[12px] text-gray-600 leading-snug">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white z-50 lg:static lg:mt-6 lg:transform-none lg:left-auto lg:max-w-none">
        <div
          className="px-2.5 pt-3 pb-3"
          style={{
            borderTop: '1px solid #F2F3F5',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.04)',
          }}
        >
          {selectedDate && selectedTime && (
            <div className="flex items-center justify-between mb-2.5 px-1 fade-in-up">
              <div>
                <p className="text-[11px] text-gray-500">선택한 일시</p>
                <p className="text-[14px] font-bold text-gray-900">
                  {currentMonth}월 {selectedDate}일 ({selectedDayLabel}) · {selectedTime}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setSelectedTime(null);
                }}
                className="text-[11px] text-gray-400 underline"
              >
                다시 선택
              </button>
            </div>
          )}
          <button
            onClick={handleBooking}
            disabled={!selectedDate || !selectedTime}
            className="w-full py-3.5 rounded-xl font-bold text-[15px] btn-press transition-colors"
            style={{
              backgroundColor: selectedDate && selectedTime ? '#7C3AED' : '#F3F4F6',
              color: selectedDate && selectedTime ? '#fff' : '#A4ABBA',
              boxShadow:
                selectedDate && selectedTime
                  ? '0 6px 16px rgba(124,58,237,0.3)'
                  : 'none',
            }}
          >
            {selectedDate && selectedTime ? '예약 확정하고 결제하기' : '날짜와 시간을 선택해 주세요'}
          </button>
        </div>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 modal-overlay-enter">
          <div className="bg-white rounded-2xl mx-6 w-full max-w-sm overflow-hidden modal-content-enter">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-[#7C3AED] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={26} strokeWidth={3} className="text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">예약을 확정할까요?</h3>
              <p className="text-sm text-gray-600 mb-1">
                {currentYear}년 {currentMonth}월 {selectedDate}일 ({selectedDayLabel})
              </p>
              <p className="text-lg font-bold text-[#7C3AED]">{selectedTime}</p>
              {product && (
                <p className="text-[12px] text-gray-500 mt-3 line-clamp-1">
                  {product.title}
                </p>
              )}
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 text-sm font-medium text-gray-500"
              >
                다시 선택
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3.5 text-sm font-bold text-white bg-[#7C3AED]"
              >
                결제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDot({ active, label, title }: { active: boolean; label: string; title: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold leading-none"
        style={{
          backgroundColor: active ? '#2B313D' : '#E5E7EB',
          color: active ? '#fff' : '#9CA3AF',
          transition: 'background-color 300ms ease',
        }}
      >
        {label}
      </span>
      <span
        className="text-[12px] font-semibold leading-none"
        style={{ color: active ? '#2B313D' : '#9CA3AF' }}
      >
        {title}
      </span>
    </div>
  );
}
