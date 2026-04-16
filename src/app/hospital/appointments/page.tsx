'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  User,
  MessageSquare,
} from 'lucide-react';
import TabBar from '@/components/common/TabBar';
import { useStore } from '@/store';

interface TimeSlot {
  time: string;
  enabled: boolean;
}

const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let h = 10; h <= 20; h++) {
    slots.push({ time: `${String(h).padStart(2, '0')}:00`, enabled: true });
    if (h < 20) {
      slots.push({ time: `${String(h).padStart(2, '0')}:30`, enabled: true });
    }
  }
  return slots;
};

interface AppointmentData {
  id: string;
  time: string;
  patientName: string;
  gender: string;
  age: number;
  phone: string;
  treatmentName: string;
  paymentType: string;
  bookingType: string;
  assignedDoctor: string;
  memo: string;
  date: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

const statusLabel: Record<AppointmentData['status'], { label: string; bg: string; text: string }> = {
  pending: { label: '확인 대기', bg: 'bg-[#FFF4E6]', text: 'text-[#FFA04E]' },
  confirmed: { label: '확정', bg: 'bg-[#E6F7EB]', text: 'text-[#38B369]' },
  completed: { label: '시술 완료', bg: 'bg-[#E6F2FF]', text: 'text-[#1084FD]' },
  cancelled: { label: '취소됨', bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]' },
};

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

/* eslint-disable @typescript-eslint/no-explicit-any */
function reservationToAppointment(r: any): AppointmentData {
  const visitDate = r.visit_at ? new Date(r.visit_at) : null;
  return {
    id: r.id,
    time: visitDate
      ? visitDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '',
    patientName: r.user?.name ?? r.customer_name ?? '환자',
    gender: '',
    age: 0,
    phone: r.user?.phone ?? r.customer_phone ?? '',
    treatmentName: r.product?.title ?? '예약',
    paymentType: r.payment_type ?? '현장결제',
    bookingType: '앱예약',
    assignedDoctor: r.doctor?.name ?? '미지정',
    memo: '',
    date: visitDate ? visitDate.getDate() : 0,
    status: (r.status as AppointmentData['status']) ?? 'pending',
  };
}

export default function AppointmentsPage() {
  const { showModal, showToast } = useStore();
  const today = new Date();
  const [activeTab, setActiveTab] = useState('병원예약');
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [currentMonth] = useState(today.getMonth());
  const [currentYear] = useState(today.getFullYear());
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [timeSlots, setTimeSlots] = useState<Record<number, TimeSlot[]>>({});
  const [disabledDays, setDisabledDays] = useState<Set<number>>(new Set());
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital', { cache: 'no-store' });
        if (!res.ok) return;
        const { reservations } = await res.json();
        if (cancelled) return;
        const monthAppts = (reservations ?? [])
          .map(reservationToAppointment)
          .filter((a: AppointmentData) => {
            const visitDate = (reservations as { id: string; visit_at?: string }[]).find((r) => r.id === a.id)?.visit_at;
            if (!visitDate) return false;
            const d = new Date(visitDate);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
          });
        setAppointments(monthAppts);
      } catch {/* ignore */}
    })();
    return () => {
      cancelled = true;
    };
  }, [currentYear, currentMonth]);

  const appointmentDates = useMemo(
    () => new Set(appointments.map((a) => a.date)),
    [appointments]
  );

  const selectedAppointments = appointments.filter((a) => a.date === selectedDate);

  const updateApptStatus = async (id: string, status: AppointmentData['status'], cancelReason?: string) => {
    // Optimistic
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cancelReason }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '상태 변경 실패');
      } else {
        showToast(
          status === 'confirmed' ? '예약을 확정했습니다.'
            : status === 'cancelled' ? '예약을 취소했습니다.'
            : status === 'completed' ? '시술 완료 처리했습니다.'
            : '상태가 변경되었습니다.'
        );
      }
    } catch {
      showToast('네트워크 오류');
    }
  };

  const getSlotsForDate = (date: number): TimeSlot[] => {
    if (timeSlots[date]) return timeSlots[date];
    return generateTimeSlots();
  };

  const handleToggleSlot = (date: number, slotTime: string) => {
    const current = getSlotsForDate(date);
    const slot = current.find((s) => s.time === slotTime);
    if (!slot) return;

    const action = slot.enabled ? '비활성화' : '활성화';
    showModal(
      '시간 설정',
      `${slotTime} 시간을 ${action}하시겠습니까?`,
      () => {
        const updated = current.map((s) =>
          s.time === slotTime ? { ...s, enabled: !s.enabled } : s
        );
        setTimeSlots((prev) => ({ ...prev, [date]: updated }));
        showToast(`${slotTime} ${action}되었습니다.`);
      }
    );
  };

  const handleDisableDay = (date: number) => {
    const isDisabled = disabledDays.has(date);
    const action = isDisabled ? '활성화' : '비활성화';
    showModal(
      '진료일 설정',
      `4월 ${date}일을 ${action}하시겠습니까?`,
      () => {
        setDisabledDays((prev) => {
          const next = new Set(prev);
          if (isDisabled) {
            next.delete(date);
          } else {
            next.add(date);
          }
          return next;
        });
        showToast(`4월 ${date}일이 ${action}되었습니다.`);
      }
    );
  };

  const renderCalendar = () => {
    const cells: React.ReactNode[] = [];

    // Day headers
    for (const day of DAYS) {
      cells.push(
        <div
          key={`header-${day}`}
          className={`text-center text-xs font-medium py-2 ${
            day === '일' ? 'text-red-400' : day === '토' ? 'text-blue-400' : 'text-gray-500'
          }`}
        >
          {day}
        </div>
      );
    }

    // Empty cells for first week
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} />);
    }

    // Date cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = (firstDayOfMonth + d - 1) % 7;
      const hasAppointment = appointmentDates.has(d);
      const isSelected = d === selectedDate;
      const isDisabled = disabledDays.has(d);

      cells.push(
        <button
          key={d}
          onClick={() => setSelectedDate(d)}
          className={`relative flex flex-col items-center justify-center py-1.5 rounded-lg text-sm transition-colors ${
            isSelected
              ? 'bg-[#7C3AED] text-white'
              : isDisabled
                ? 'text-gray-300 line-through'
                : dayOfWeek === 0
                  ? 'text-red-400'
                  : dayOfWeek === 6
                    ? 'text-blue-400'
                    : 'text-gray-700'
          }`}
        >
          {d}
          {hasAppointment && !isSelected && (
            <div className="w-1 h-1 bg-[#7C3AED] rounded-full mt-0.5" />
          )}
          {hasAppointment && isSelected && (
            <div className="w-1 h-1 bg-white rounded-full mt-0.5" />
          )}
        </button>
      );
    }

    return cells;
  };

  return (
    <div className="pb-[86px] bg-white min-h-screen">
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 40 }} className="bg-white flex items-center justify-between h-12 px-2.5">
        <h1 className="text-lg font-bold">예약관리</h1>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white px-2.5">
        <TabBar
          tabs={['병원예약', '예약설정']}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="underline"
        />
      </div>

      {/* Calendar */}
      <div className="bg-white px-2.5 py-4">
        <div className="flex items-center justify-between mb-4">
          <button className="p-1">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <h2 className="font-bold text-base">
            {currentYear}년 {currentMonth + 1}월
          </h2>
          <button className="p-1">
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
      </div>

      {/* Content based on tab */}
      {activeTab === '병원예약' ? (
        <div className="py-3 space-y-3">
          <div className="px-2.5">
            <h3 className="text-sm font-bold text-gray-900">
              4월 {selectedDate}일 예약 ({selectedAppointments.length}건)
            </h3>
          </div>

          {selectedAppointments.length === 0 ? (
            <div className="bg-white px-2.5 py-10 flex flex-col items-center">
              <p className="text-gray-400 text-sm">해당 날짜에 예약이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedAppointments.map((apt) => (
                <div key={apt.id} className="bg-white px-2.5 py-4 space-y-3">
                  {/* Time + patient info */}
                  <div className="flex items-start gap-3">
                    <div className="w-14 text-center flex-shrink-0">
                      <span className="text-sm font-bold text-[#7C3AED]">
                        {apt.time}
                      </span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{apt.patientName}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${statusLabel[apt.status].bg} ${statusLabel[apt.status].text}`}>
                          {statusLabel[apt.status].label}
                        </span>
                      </div>
                      {apt.phone && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone size={12} />
                          <span>{apt.phone}</span>
                        </div>
                      )}
                      <p className="text-sm text-gray-700 font-medium">
                        {apt.treatmentName}
                      </p>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">
                          {apt.paymentType}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                          {apt.bookingType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons by status */}
                  {apt.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateApptStatus(apt.id, 'cancelled', '병원 사정으로 거절되었습니다.')}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border border-red-300 text-red-600 btn-press"
                      >
                        거절
                      </button>
                      <button
                        onClick={() => updateApptStatus(apt.id, 'confirmed')}
                        className="flex-1 py-2 rounded-lg text-xs font-bold bg-[#7C3AED] text-white btn-press"
                      >
                        예약 확정
                      </button>
                    </div>
                  )}
                  {apt.status === 'confirmed' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateApptStatus(apt.id, 'cancelled', '병원 사정으로 취소되었습니다.')}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 btn-press"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => updateApptStatus(apt.id, 'completed')}
                        className="flex-1 py-2 rounded-lg text-xs font-bold bg-[#1084FD] text-white btn-press"
                      >
                        시술 완료 처리
                      </button>
                    </div>
                  )}

                  {/* Assigned doctor */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                        <User size={14} className="text-gray-400" />
                      </div>
                      <span className="text-sm font-medium">
                        {apt.assignedDoctor} 원장
                      </span>
                    </div>
                    <a
                      href={`/hospital/manage/doctor?apt=${apt.id}`}
                      className="text-xs text-[#7C3AED] font-medium"
                    >
                      변경
                    </a>
                  </div>

                  {/* Memo */}
                  <div className="flex items-start gap-2">
                    <MessageSquare size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <textarea
                      placeholder="메모를 입력해주세요"
                      value={memos[apt.id] ?? apt.memo}
                      onChange={(e) =>
                        setMemos((prev) => ({
                          ...prev,
                          [apt.id]: e.target.value,
                        }))
                      }
                      className="flex-1 text-sm bg-gray-50 rounded-lg p-2 border-0 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 예약설정 tab */
        <div className="py-3 space-y-3">
          <div className="px-2.5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">
              4월 {selectedDate}일 시간 설정
            </h3>
            <button
              onClick={() => handleDisableDay(selectedDate)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                disabledDays.has(selectedDate)
                  ? 'bg-[#7C3AED] text-white'
                  : 'border border-red-300 text-red-500'
              }`}
            >
              {disabledDays.has(selectedDate)
                ? '진료일 활성화'
                : '진료일 비활성화'}
            </button>
          </div>

          <div className="bg-white px-2.5 py-4">
            {disabledDays.has(selectedDate) ? (
              <div className="py-8 text-center">
                <p className="text-gray-400 text-sm">
                  해당일은 비활성화 상태입니다.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {getSlotsForDate(selectedDate).map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => handleToggleSlot(selectedDate, slot.time)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      slot.enabled
                        ? 'bg-[#EDE9FE] text-[#7C3AED] border border-[#7C3AED]/20'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
