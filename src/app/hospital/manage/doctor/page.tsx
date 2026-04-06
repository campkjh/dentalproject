'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Phone, User } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { hospitals } from '@/lib/mock-data';

const hospital = hospitals[0];

interface DoctorOption {
  id: string;
  name: string;
  title: string;
  specialty: string;
  isOwner: boolean;
  available: boolean;
}

const doctorOptions: DoctorOption[] = hospital.doctors.map((d, idx) => ({
  id: d.id,
  name: d.name,
  title: d.title,
  specialty: d.specialty,
  isOwner: d.isOwner || false,
  // Some doctors are unavailable for the time slot
  available: idx !== 3 && idx !== 5,
}));

export default function DoctorAssignPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <DoctorAssignPage />
    </Suspense>
  );
}

function DoctorAssignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aptId = searchParams.get('apt');
  const { showToast } = useStore();

  // Mock appointment info
  const appointment = {
    time: '10:00',
    patientName: '홍길동',
    gender: '남',
    age: 32,
    phone: '010-1245-2189',
    treatmentName: '원데이 치아미백 3회',
    paymentType: '앱결제',
    bookingType: '앱예약',
    currentDoctor: aptId ? '이양구' : null,
  };

  const isChanging = !!appointment.currentDoctor;
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(
    appointment.currentDoctor
      ? doctorOptions.find((d) => d.name === appointment.currentDoctor)?.id || null
      : null
  );

  const handleSelectDoctor = (doctor: DoctorOption) => {
    if (!doctor.available) {
      showToast('해당 시간에 스케줄이 존재합니다.');
      return;
    }
    setSelectedDoctor(doctor.id);
  };

  const handleComplete = () => {
    if (!selectedDoctor) return;
    const doctor = doctorOptions.find((d) => d.id === selectedDoctor);
    showToast(`${doctor?.name} 원장님이 지정되었습니다.`);
    router.back();
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <TopBar title="담당지정" />

      {/* Patient info */}
      <div className="px-4 py-4 bg-gray-50 border-b border-gray-100">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#7C3AED]">
              {appointment.time}
            </span>
            <span className="font-bold text-sm">{appointment.patientName}</span>
            <span className="text-xs text-gray-500">
              {appointment.gender}/{appointment.age}세
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Phone size={12} />
            <span>{appointment.phone}</span>
          </div>
          <p className="text-sm text-gray-700 font-medium">
            {appointment.treatmentName}
          </p>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">
              {appointment.paymentType}
            </span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
              {appointment.bookingType}
            </span>
          </div>
        </div>
      </div>

      {/* Doctor list */}
      <div className="flex-1 px-4 py-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3">의사 선택</h3>
        <div className="space-y-2">
          {doctorOptions.map((doctor) => {
            const isSelected = selectedDoctor === doctor.id;
            const isUnavailable = !doctor.available;

            return (
              <button
                key={doctor.id}
                onClick={() => handleSelectDoctor(doctor)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                  isSelected
                    ? 'border-[#7C3AED] bg-[#EDE9FE]/30'
                    : isUnavailable
                      ? 'border-gray-100 bg-gray-50'
                      : 'border-gray-200 bg-white hover:border-[#7C3AED]/50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'bg-[#7C3AED]'
                      : isUnavailable
                        ? 'bg-gray-100'
                        : 'bg-gray-100'
                  }`}
                >
                  {isSelected ? (
                    <Check size={18} className="text-white" />
                  ) : (
                    <User
                      size={18}
                      className={isUnavailable ? 'text-gray-300' : 'text-gray-400'}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold text-sm ${
                        isUnavailable ? 'text-gray-300' : 'text-gray-900'
                      }`}
                    >
                      {doctor.name}
                    </span>
                    <span
                      className={`text-xs ${
                        isUnavailable ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {doctor.title}
                    </span>
                    {doctor.isOwner && (
                      <span className="px-1.5 py-0.5 bg-[#7C3AED] text-white text-[10px] rounded font-medium">
                        대표
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isUnavailable ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    {doctor.specialty}
                  </p>
                  {isUnavailable && (
                    <p className="text-xs text-red-400 mt-0.5">
                      해당 시간 스케줄 있음
                    </p>
                  )}
                </div>

                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-[#7C3AED] rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom button */}
      <div className="sticky bottom-0 bg-white px-4 py-4 border-t border-gray-100">
        <button
          onClick={handleComplete}
          disabled={!selectedDoctor}
          className={`w-full py-3.5 rounded-xl text-base font-bold transition-colors ${
            selectedDoctor
              ? 'bg-[#7C3AED] text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isChanging ? '변경완료' : '지정완료'}
        </button>
      </div>
    </div>
  );
}
