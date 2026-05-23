'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

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

function formatCount(value: number) {
  return value.toLocaleString('ko-KR');
}

export default function PartnerDoctorsPage() {
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [hospitalName, setHospitalName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
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

    if (hospital?.id) {
      const { count } = await sb
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('hospital_id', hospital.id);
      setReviewCount(count ?? 0);
    } else {
      setReviewCount(0);
    }
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
    setReviewCount(0);
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

  const handleLeave = async (doctor: Doctor) => {
    const isSelf = doctor.id === currentDoctorId || doctor.user_id === authUser?.id;
    const message = isSelf
      ? '병원을 탈퇴하시겠습니까?'
      : `${doctor.name} 원장을 병원에서 탈퇴 처리할까요?`;
    if (!window.confirm(message)) return;

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
  };

  const visibleDoctors = doctors.filter((doctor) => getMemberStatus(doctor) === 'active' && doctor.is_active !== false);
  const pendingRequests = doctors.filter((doctor) => getMemberStatus(doctor) === 'pending');
  const orderedDoctors = [
    ...visibleDoctors.filter((doctor) => doctor.is_owner),
    ...visibleDoctors.filter((doctor) => !doctor.is_owner),
  ];

  const isCurrentDoctor = (doctor: Doctor) => doctor.id === currentDoctorId || doctor.user_id === authUser?.id;

  if (!authUser) return (
    <div className="bg-white rounded-xl p-10 text-center">
      <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
      <Link href="/partner/login" className="inline-block px-5 py-2.5 bg-[#8037FF] text-white text-sm font-bold rounded-xl">로그인</Link>
    </div>
  );

  return (
    <div className="partner-mobile-screen has-fixed-title">
      <header className="partner-screen-title with-action">
        <h1>병원관리</h1>
        <nav className="partner-inline-segment" aria-label="병원관리 탭">
          <Link href="/partner/hospital-info">병원</Link>
          <Link href="/partner/doctors" className="is-active">멤버({formatCount(visibleDoctors.length)})</Link>
          <Link href="/partner/reviews">리뷰({formatCount(reviewCount)})</Link>
        </nav>
      </header>

      {loading ? (
        <div className="partner-loading small">불러오는 중...</div>
      ) : (
        <section className="partner-member-content">
          <div className="partner-member-list" aria-label="병원 멤버 목록">
            {orderedDoctors.map((doctor) => {
              const current = isCurrentDoctor(doctor);
              const canEdit = isOwner && doctor.is_owner && current;
              const canLeave = !doctor.is_owner && (isOwner || current);
              const title = doctor.is_owner ? '병원장' : doctor.title || '원장';

              return (
                <article key={doctor.id} className="partner-member-row">
                  <div className="partner-member-avatar">
                    <img src={doctor.profile_image || '/partner-template/doctor-avatar.png'} alt={doctor.name} />
                  </div>
                  <div className="partner-member-summary">
                    <h2>
                      <span className="partner-member-name">{doctor.name}</span>
                      <span className="partner-member-role">{title}</span>
                      {current && <span className="partner-member-my">My</span>}
                    </h2>
                    <p>{doctor.specialty || doctor.bio || '전문분야 미등록'}</p>
                    <p>{hospitalName || '소속 병원 미등록'}</p>
                  </div>
                  <div className="partner-member-actions">
                    {canEdit && (
                      <button
                        className="partner-member-edit"
                        type="button"
                        onClick={() => router.push(`/partner/doctors/${doctor.id}`)}
                        aria-label={`${doctor.name} 정보 수정`}
                      >
                        <img src="/partner-template/edit.svg" alt="" />
                      </button>
                    )}
                    {canLeave && (
                      <button
                        className="partner-member-leave-button"
                        type="button"
                        onClick={() => handleLeave(doctor)}
                        disabled={actingId === doctor.id}
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
            <div className="partner-member-empty">
              <span>{hospitalId ? '등록된 멤버가 없습니다.' : '연결된 병원이 없습니다.'}</span>
            </div>
          )}

          {isOwner && pendingRequests.length > 0 && (
            <section className="partner-member-request-section" aria-label="새로운 멤버 요청">
              <h2>새로운 요청</h2>
              <div className="partner-member-list">
                {pendingRequests.map((doctor) => (
                  <article key={doctor.id} className="partner-member-row request">
                    <div className="partner-member-avatar">
                      <img src={doctor.profile_image || '/partner-template/doctor-avatar.png'} alt={doctor.name} />
                    </div>
                    <div className="partner-member-summary">
                      <h2>
                        <span className="partner-member-name">{doctor.name}</span>
                        <span className="partner-member-role">{doctor.title || '원장'}</span>
                      </h2>
                      <p>{doctor.specialty || doctor.bio || '전문분야 미등록'}</p>
                    </div>
                    <div className="partner-member-request-actions">
                      <button
                        className="partner-member-accept-button"
                        type="button"
                        onClick={() => patchMembership(doctor, 'accept')}
                        disabled={actingId === doctor.id}
                      >
                        수락
                      </button>
                      <button
                        className="partner-member-reject-button"
                        type="button"
                        onClick={() => patchMembership(doctor, 'reject')}
                        disabled={actingId === doctor.id}
                      >
                        거절
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      )}
    </div>
  );
}
