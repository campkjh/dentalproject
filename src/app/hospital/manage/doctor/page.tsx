'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Avatar from '@/components/common/Avatar';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useStore } from '@/store';

interface DoctorOption {
  id: string;
  name: string;
  title: string;
  specialty: string;
  isOwner: boolean;
  available: boolean;
  profileImage?: string | null;
}

export default function DoctorAssignPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-[15px] text-[#8B95A1]">불러오는 중…</div>}>
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
          (hospital.doctors ?? []).map((d: { id: string; name: string; title?: string; specialty?: string; is_owner?: boolean; profile_image?: string | null }) => ({
            id: d.id,
            name: d.name,
            title: d.title ?? '원장',
            specialty: d.specialty ?? '',
            isOwner: d.is_owner ?? false,
            available: true,
            profileImage: d.profile_image ?? null,
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

  // 체크 동그라미 — 켤 때 톡 튀며 체크가 그려진다(globals .chk-dot)
  const checkDot = (on: boolean) => (
    <span key={String(on)} className={`chk-dot flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? 'is-on bg-[#2F6FE4]' : 'is-off border-2 border-[#E5E8EB]'}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={on ? '#fff' : '#D1D6DB'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  );

  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 96px), 104px)' }}>
      <TopBar title="담당지정" />

      {/* 예약 정보 */}
      {appointment ? (
        <div className="px-5 pb-7 pt-2">
          <div className="flex items-center gap-2">
            {appointment.time && (
              <span className="inline-flex h-7 items-center rounded-[6px] bg-[#E8F3FF] px-2 text-[14px] font-bold tabular-nums text-[#3180F7]">{appointment.time}</span>
            )}
            <span className="min-w-0 truncate text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">{appointment.patientName}</span>
          </div>
          <div className="mt-3">
            {[
              ...(appointment.phone ? [{ label: '전화', value: appointment.phone }] : []),
              ...(appointment.treatmentName ? [{ label: '시술', value: appointment.treatmentName }] : []),
            ].map((r) => (
              <p key={r.label} className="flex min-h-11 items-center py-1.5">
                <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">{r.label}</span>
                <span className="min-w-0 flex-1 break-keep text-[17px] text-[#333D4B]">{r.value}</span>
              </p>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {appointment.paymentType && (
              <span className="inline-flex h-6 items-center rounded-[6px] bg-[#EFF5FE] px-2 text-[13.5px] font-semibold text-[#2F6FE4]">{appointment.paymentType}</span>
            )}
            <span className="inline-flex h-6 items-center rounded-[6px] bg-[#F2F4F6] px-2 text-[13.5px] font-semibold text-[#6B7684]">{appointment.bookingType}</span>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-5 pt-2">
          <p className="flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
            <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
            담당할 의료진을 골라 주세요.
          </p>
        </div>
      )}

      <div className="h-2.5 bg-[#F2F4F6]" />

      {/* 의사 선택 */}
      <div className="flex-1 px-5 py-7">
        <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">
          의사 선택 <span className="text-[#3180F7]">{doctorOptions.length}</span>
        </h2>
        {loading && <p className="mt-4 text-[15px] text-[#8B95A1]">불러오는 중…</p>}
        <div className="-mx-1 mt-3 space-y-1">
          {doctorOptions.map((doctor, i) => {
            const isSelected = selectedDoctor === doctor.id;
            const isUnavailable = !doctor.available;

            return (
              <button
                key={doctor.id}
                type="button"
                onClick={() => handleSelectDoctor(doctor)}
                className={`qd-a-item flex w-full items-center gap-3.5 rounded-[16px] px-3 py-3 text-left transition-colors ${
                  isSelected ? 'bg-[#EFF5FE]' : 'bg-white active:bg-[#F9FAFB]'
                }`}
                style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
              >
                <Avatar
                  src={doctor.profileImage ?? undefined}
                  role="doctor"
                  seed={doctor.name}
                  size={48}
                  alt=""
                  className={`shrink-0 ${isUnavailable ? 'opacity-40' : ''}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5">
                    <span className={`truncate text-[17px] font-bold ${isUnavailable ? 'text-[#B0B8C1]' : isSelected ? 'text-[#3180F7]' : 'text-[#191F28]'}`}>
                      {doctor.name}
                    </span>
                    <span className={`shrink-0 text-[14px] ${isUnavailable ? 'text-[#B0B8C1]' : 'text-[#6B7684]'}`}>{doctor.title}</span>
                    {doctor.isOwner && (
                      <span className="inline-flex h-5 shrink-0 items-center rounded-[5px] bg-[#DCE9FD] px-1.5 text-[12px] font-bold text-[#2F6FE4]">대표</span>
                    )}
                  </p>
                  {doctor.specialty && (
                    <p className={`mt-0.5 truncate text-[14px] ${isUnavailable ? 'text-[#B0B8C1]' : 'text-[#8B95A1]'}`}>{doctor.specialty}</p>
                  )}
                  {isUnavailable && <p className="mt-0.5 text-[13px] text-[#F04452]">해당 시간 스케줄 있음</p>}
                </div>
                {checkDot(isSelected)}
              </button>
            );
          })}
        </div>
      </div>

      {/* 바닥 버튼 — 위 선 대신 흰 그라데이션 */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white px-4 pt-2" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 16px)' }}>
        <div className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-b from-white/0 to-white" />
        <div className="mx-auto max-w-[608px]">
          <button
            type="button"
            onClick={handleComplete}
            disabled={!selectedDoctor}
            className={`flex h-14 w-full items-center justify-center rounded-[18px] text-[17px] font-bold transition-all active:scale-[0.98] ${
              selectedDoctor ? 'bg-[#4A82EE] text-white' : 'cursor-not-allowed bg-[#F2F4F6] text-[#B0B8C1]'
            }`}
          >
            {isChanging ? '변경완료' : '지정완료'}
          </button>
        </div>
      </div>
    </div>
  );
}
