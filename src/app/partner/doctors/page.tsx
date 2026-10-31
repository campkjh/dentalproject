'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { resolveDoctorImageUrl } from '@/lib/images';
import MonoIcon from '@/components/common/MonoIcon';

/* eslint-disable @typescript-eslint/no-explicit-any */
type MemberStatus = 'pending' | 'active' | 'rejected' | 'left';

type Doctor = {
  id: string;
  user_id?: string | null;
  name: string;
  title: string | null;
  specialty: string | null;
  bio: string | null;
  profile_image: string | null;
  is_owner: boolean;
  is_active?: boolean | null;
  member_status?: MemberStatus | null;
};

function isMissingDoctorColumn(error: { message?: string; details?: string | null; hint?: string | null } | null, column: string) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes(column.toLowerCase()) || text.includes(`doctors.${column.toLowerCase()}`);
}

function getMemberStatus(doctor: Doctor) {
  if (doctor.member_status) return doctor.member_status;
  return doctor.is_active === false ? 'pending' : 'active';
}

export default function PartnerDoctorsPage() {
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const showConfirm = useStore((s) => s.showConfirm);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [hospitalName, setHospitalName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const setHospitalState = async (sb: ReturnType<typeof createClient>, hospital: any, ownerMode: boolean, selfDoctorId?: string | null) => {
    const nextDoctors = ((hospital?.doctors ?? []) as Doctor[]).filter(Boolean);
    const selfDoctor = nextDoctors.find((doctor) => doctor.user_id === authUser?.id)
      ?? nextDoctors.find((doctor) => doctor.is_owner)
      ?? null;

    setHospitalId(hospital?.id ?? null);
    setHospitalName(hospital?.name ?? '');
    setIsOwner(ownerMode);
    setCurrentDoctorId(selfDoctorId ?? selfDoctor?.id ?? null);
    setDoctors(nextDoctors);
  };

  const reload = async () => {
    if (!hasSupabaseEnv() || !authUser) return;
    const sb = createClient();
    const { data: ownedHospital } = await sb
      .from('hospitals')
      .select('id, name, doctors(*)')
      .eq('owner_id', authUser.id)
      .maybeSingle();

    if (ownedHospital) {
      await setHospitalState(sb, ownedHospital, true);
      return;
    }

    let memberDoctorRes = await sb
      .from('doctors')
      .select('id, hospital_id, is_owner, member_status, is_active')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (
      memberDoctorRes.error &&
      (isMissingDoctorColumn(memberDoctorRes.error, 'member_status') || isMissingDoctorColumn(memberDoctorRes.error, 'is_active'))
    ) {
      memberDoctorRes = await sb
        .from('doctors')
        .select('id, hospital_id, is_owner')
        .eq('user_id', authUser.id)
        .maybeSingle();
    }

    const memberDoctor = memberDoctorRes.data as { id?: string; hospital_id?: string | null; is_owner?: boolean | null } | null;
    if (memberDoctor?.hospital_id) {
      const { data: memberHospital } = await sb
        .from('hospitals')
        .select('id, name, doctors(*)')
        .eq('id', memberDoctor.hospital_id)
        .maybeSingle();
      await setHospitalState(sb, memberHospital, Boolean(memberDoctor.is_owner), memberDoctor.id ?? null);
      return;
    }

    setHospitalId(null);
    setHospitalName('');
    setIsOwner(false);
    setCurrentDoctorId(null);
    setDoctors([]);
  };

  useEffect(() => {
    (async () => {
      try {
        await reload();
      } finally {
        setLoading(false);
      }
    })();
  }, [authUser]);

  const patchMembership = async (doctor: Doctor, action: 'accept' | 'reject') => {
    setActingId(doctor.id);
    try {
      const res = await fetch(`/api/my-hospital/doctors/${doctor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast((j as any).error || '처리에 실패했습니다.');
        return;
      }
      showToast(action === 'accept' ? '멤버 요청을 수락했습니다.' : '멤버 요청을 거절했습니다.');
      await reload();
    } finally {
      setActingId(null);
    }
  };

  const handleLeave = (doctor: Doctor) => {
    const isSelf = doctor.id === currentDoctorId || doctor.user_id === authUser?.id;
    const title = isSelf ? '병원 탈퇴' : '원장 탈퇴';
    const message = isSelf
      ? '병원을 탈퇴하시겠습니까?'
      : `${doctor.name} 원장을 병원에서 탈퇴 처리할까요?`;
    showConfirm(title, message, async () => {
      setActingId(doctor.id);
      try {
        const res = await fetch(`/api/my-hospital/doctors/${doctor.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          showToast((j as any).error || '탈퇴 처리에 실패했습니다.');
          return;
        }
        showToast(isSelf ? '병원에서 탈퇴했습니다.' : `${doctor.name} 원장을 탈퇴 처리했습니다.`);
        if (isSelf && !isOwner) {
          useStore.setState({ isDoctor: false });
          router.replace('/');
          return;
        }
        await reload();
      } finally {
        setActingId(null);
      }
    });
  };

  const visibleDoctors = doctors.filter((doctor) => getMemberStatus(doctor) === 'active' && doctor.is_active !== false);
  const pendingRequests = doctors.filter((doctor) => getMemberStatus(doctor) === 'pending');
  const orderedDoctors = [
    ...visibleDoctors.filter((doctor) => doctor.is_owner),
    ...visibleDoctors.filter((doctor) => !doctor.is_owner),
  ];

  const isCurrentDoctor = (doctor: Doctor) => doctor.id === currentDoctorId || doctor.user_id === authUser?.id;

  if (!authUser) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
      <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
        <MonoIcon name="lock" size={34} color="#B0B8C1" />
      </span>
      <p className="qd-a-item mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>로그인이 필요해요</p>
      <Link
        href="/partner/login"
        className="qd-a-item mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold tracking-[-0.3px] text-[#3180F7] active:bg-[#DCEBFF]"
        style={{ animationDelay: '.12s' }}
      >
        로그인
      </Link>
    </div>
  );

  return (
    <div className="partner-mobile-screen has-fixed-title">
      {loading ? (
        <div className="partner-loading small">불러오는 중...</div>
      ) : (
        <section className="pb-10">
          <div className="px-5 pt-1">
            <h2 className="flex items-center gap-1.5 text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">
              멤버 <span className="text-[#3180F7]">{orderedDoctors.length}</span>
            </h2>
            <div className="-mx-2 mt-2" aria-label="병원 멤버 목록">
              {orderedDoctors.map((doctor, i) => {
                const current = isCurrentDoctor(doctor);
                const canEdit = isOwner && doctor.is_owner && current;
                const canLeave = !doctor.is_owner && (isOwner || current);
                const title = doctor.is_owner ? '병원장' : doctor.title || '원장';

                return (
                  <article key={doctor.id} className="qd-a-item flex items-center gap-3.5 rounded-[16px] px-2 py-3" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveDoctorImageUrl(doctor.profile_image)} alt={doctor.name} className="h-[52px] w-[52px] shrink-0 rounded-full bg-[#F2F4F6] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[17px] font-bold text-[#191F28]">{doctor.name}</span>
                        <span className="shrink-0 text-[14px] text-[#6B7684]">{title}</span>
                        {current && <span className="inline-flex h-5 shrink-0 items-center rounded-[5px] bg-[#EFF5FE] px-1.5 text-[12px] font-bold text-[#2F6FE4]">나</span>}
                      </p>
                      <p className="mt-0.5 truncate text-[14px] text-[#8B95A1]">{doctor.specialty || doctor.bio || '전문분야 미등록'}</p>
                      <p className="truncate text-[14px] text-[#B0B8C1]">{hospitalName || '소속 병원 미등록'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => router.push(`/partner/doctors/${doctor.id}`)}
                          aria-label={`${doctor.name} 정보 수정`}
                          className="inline-flex h-9 items-center gap-1 rounded-[10px] bg-[#F2F4F6] px-3 text-[14px] font-semibold text-[#333D4B]"
                        >
                          <MonoIcon name="pencil" size={15} color="#6B7684" />
                          수정
                        </button>
                      )}
                      {canLeave && (
                        <button
                          type="button"
                          onClick={() => handleLeave(doctor)}
                          disabled={actingId === doctor.id}
                          className="inline-flex h-9 items-center rounded-[10px] bg-[#F2F4F6] px-3 text-[14px] font-semibold text-[#F04452] disabled:opacity-60"
                        >
                          탈퇴
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {orderedDoctors.length === 0 && (
              <div className="flex flex-col items-center py-14 text-center">
                <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
                  <MonoIcon name="hospital" size={34} color="#B0B8C1" />
                </span>
                <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">{hospitalId ? '등록된 멤버가 없어요' : '연결된 병원이 없어요'}</p>
              </div>
            )}
          </div>

          {isOwner && pendingRequests.length > 0 && (
            <>
              <div className="mt-5 h-2.5 bg-[#F2F4F6]" />
              <section className="px-5 pt-7" aria-label="새로운 멤버 요청">
                <h2 className="flex items-center gap-1.5 text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">
                  새로운 요청 <span className="text-[#3180F7]">{pendingRequests.length}</span>
                </h2>
                <div className="mt-2 space-y-2">
                  {pendingRequests.map((doctor) => (
                    <article key={doctor.id} className="qd-a-item py-3">
                      <div className="flex items-center gap-3.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveDoctorImageUrl(doctor.profile_image)} alt={doctor.name} className="h-[52px] w-[52px] shrink-0 rounded-full bg-[#F2F4F6] object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-[17px] font-bold text-[#191F28]">{doctor.name}</span>
                            <span className="shrink-0 text-[14px] text-[#6B7684]">{doctor.title || '원장'}</span>
                          </p>
                          <p className="mt-0.5 truncate text-[14px] text-[#8B95A1]">{doctor.specialty || doctor.bio || '전문분야 미등록'}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => patchMembership(doctor, 'reject')}
                          disabled={actingId === doctor.id}
                          className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-[#F2F4F6] text-[15px] font-semibold text-[#4E5968] disabled:opacity-60"
                        >
                          거절
                        </button>
                        <button
                          type="button"
                          onClick={() => patchMembership(doctor, 'accept')}
                          disabled={actingId === doctor.id}
                          className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-[#4A82EE] text-[15px] font-semibold text-white disabled:opacity-60"
                        >
                          수락
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </section>
      )}
    </div>
  );
}
