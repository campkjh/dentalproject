'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Phone, User } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';

interface DoctorOption {
  id: string;
  name: string;
  title: string;
  specialty: string;
  isOwner: boolean;
  available: boolean;
}

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

  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [appointment, setAppointment] = useState<{
    time: string;
    patientName: string;
    phone: string;
    treatmentName: string;
    paymentType: string;
    bookingType: string;
    currentDoctorId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital', { cache: 'no-store' });
        if (!res.ok) return;
        const { hospital, reservations } = await res.json();
        if (cancelled) return;
        if (!hospital) {
          showToast('등록된 병원이 없습니다.');
          router.push('/hospital/register');
          return;
        }
        setDoctorOptions(
          (hospital.doctors ?? []).map((d: { id: string; name: string; title?: string; specialty?: string; is_owner?: boolean }) => ({
            id: d.id,
            name: d.name,
            title: d.title ?? '원장',
            specialty: d.specialty ?? '',
            isOwner: d.is_owner ?? false,
            available: true,
          }))
        );
        if (aptId) {
          const apt = (reservations ?? []).find((r: { id: string }) => r.id === aptId);
          if (apt) {
            setAppointment({
              time: apt.visit_at ? new Date(apt.visit_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '',
              patientName: apt.user?.name ?? apt.customer_name ?? '',
              phone: apt.user?.phone ?? apt.customer_phone ?? '',
              treatmentName: apt.product?.title ?? '',
              paymentType: apt.payment_type ?? '',
              bookingType: '앱예약',
              currentDoctorId: apt.doctor_id ?? null,
            });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aptId, router, showToast]);

  const isChanging = !!appointment?.currentDoctorId;
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);

  useEffect(() => {
    if (appointment?.currentDoctorId) setSelectedDoctor(appointment.currentDoctorId);
  }, [appointment?.currentDoctorId]);

  const handleSelectDoctor = (doctor: DoctorOption) => {
    if (!doctor.available) {
      showToast('해당 시간에 스케줄이 존재합니다.');
      return;
    }
    setSelectedDoctor(doctor.id);
  };

  const handleComplete = async () => {
    if (!selectedDoctor) return;
    const doctor = doctorOptions.find((d) => d.id === selectedDoctor);
    if (aptId) {
      try {
        await fetch(`/api/reservations/${aptId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doctorId: selectedDoctor }),
        });
      } catch {/* ignore */}
    }
    showToast(`${doctor?.name} 원장님이 지정되었습니다.`);
    router.back();
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <TopBar title="담당지정" />

      {/* Patient info */}
      {appointment ? (
        <div className="px-2.5 py-4 bg-gray-50 border-b border-gray-100">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {appointment.time && (
                <span className="text-sm font-bold text-[#7C3AED]">{appointment.time}</span>
              )}
              <span className="font-bold text-sm">{appointment.patientName}</span>
            </div>
            {appointment.phone && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Phone size={12} />
                <span>{appointment.phone}</span>
              </div>
            )}
            {appointment.treatmentName && (
              <p className="text-sm text-gray-700 font-medium">{appointment.treatmentName}</p>
            )}
            <div className="flex gap-2">
              {appointment.paymentType && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">
                  {appointment.paymentType}
                </span>
              )}
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                {appointment.bookingType}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-2.5 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-500">의료진을 선택해주세요</p>
        </div>
      )}

      {/* Doctor list */}
      <div className="flex-1 px-2.5 py-4">
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
      <div className="sticky bottom-0 bg-white px-2.5 py-4 border-t border-gray-100">
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
