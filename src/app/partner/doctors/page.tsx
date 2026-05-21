'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { UserPlus } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doctor = {
  id: string;
  name: string;
  title: string | null;
  specialty: string | null;
  bio: string | null;
  profile_image: string | null;
  is_owner: boolean;
  is_active: boolean;
};

export default function PartnerDoctorsPage() {
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [hospitalName, setHospitalName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!hasSupabaseEnv() || !authUser) return;
    const sb = createClient();
    const { data: hospital } = await sb
      .from('hospitals')
      .select('id, name, doctors(*)')
      .eq('owner_id', authUser.id)
      .maybeSingle();
    if (hospital) {
      setHospitalId(hospital.id);
      setHospitalName(hospital.name ?? '');
      setIsOwner(true);
      setDoctors((hospital as any).doctors ?? []);
    } else {
      // 멤버인 경우: user_id로 소속 병원 찾기
      const { data: doc } = await sb
        .from('doctors')
        .select('id, hospital_id, is_owner')
        .eq('user_id', authUser.id)
        .maybeSingle();
      if (doc?.hospital_id) {
        setHospitalId(doc.hospital_id);
        setIsOwner(doc.is_owner ?? false);
        const { data: hosp } = await sb
          .from('hospitals')
          .select('name, doctors(*)')
          .eq('id', doc.hospital_id)
          .maybeSingle();
        setHospitalName((hosp as any)?.name ?? '');
        setDoctors((hosp as any)?.doctors ?? []);
      }
    }
  };

  useEffect(() => {
    (async () => {
      try { await reload(); }
      finally { setLoading(false); }
    })();
  }, [authUser]);

  const handleFire = async (doctor: Doctor) => {
    if (!window.confirm(`${doctor.name}을(를) 해고하시겠습니까?`)) return;
    const res = await fetch(`/api/my-hospital/doctors/${doctor.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      showToast((j as any).error || '해고 처리에 실패했습니다.');
      return;
    }
    showToast(`${doctor.name}이(가) 해고 처리되었습니다.`);
    await reload();
  };

  const handleAdd = () => router.push('/partner/doctors/new');

  const active = doctors.filter((d) => d.is_active !== false);
  const owners = active.filter((d) => d.is_owner);
  const members = active.filter((d) => !d.is_owner);

  if (!authUser) return (
    <div className="bg-white rounded-xl p-10 text-center">
      <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
      <Link href="/partner/login" className="inline-block px-5 py-2.5 bg-[#3182F6] text-white text-sm font-bold rounded-xl">로그인</Link>
    </div>
  );

  return (
    <div className="partner-mobile-screen">
      <header className="partner-screen-title with-action">
        <h1>병원관리</h1>
        <nav className="partner-inline-segment" aria-label="병원관리 탭">
          <Link href="/partner/hospital-info">병원</Link>
          <Link href="/partner/doctors" className="is-active">{`멤버(${active.length})`}</Link>
          <Link href="/partner/reviews">리뷰</Link>
        </nav>
      </header>

      {loading ? (
        <div className="partner-loading small">불러오는 중...</div>
      ) : (
        <section className="partner-member-content">
          {/* 파티장 */}
          {owners.map((d) => (
            <article key={d.id} className="partner-member-row">
              <div className="partner-member-avatar">
                <img src={d.profile_image || '/partner-template/doctor-avatar.png'} alt={d.name} />
              </div>
              <div className="partner-member-summary">
                <div>
                  <h2>
                    {d.name}
                    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#8037FF', background: '#F3EEFF', padding: '2px 7px', borderRadius: 20 }}>파티장</span>
                    {d.is_owner && d.id === doctors.find(x => x.is_owner)?.id && (
                      <span style={{ marginLeft: 4, fontSize: 11, color: '#3182F6', background: '#EFF6FF', padding: '2px 7px', borderRadius: 20 }}>My</span>
                    )}
                  </h2>
                  <p>{d.specialty || d.title || '전문분야 미등록'}</p>
                </div>
                <p>{hospitalName}</p>
              </div>
              {isOwner && (
                <button className="partner-edit-button" type="button" onClick={() => router.push(`/partner/doctors/${d.id}`)}>
                  <img src="/partner-template/edit.svg" alt="수정" />
                </button>
              )}
            </article>
          ))}

          {/* 멤버 */}
          {members.map((d) => (
            <article key={d.id} className="partner-member-row">
              <div className="partner-member-avatar">
                <img src={d.profile_image || '/partner-template/doctor-avatar.png'} alt={d.name} />
              </div>
              <div className="partner-member-summary">
                <div>
                  <h2>
                    {d.name}
                    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 20 }}>멤버</span>
                  </h2>
                  <p>{d.specialty || d.title || '전문분야 미등록'}</p>
                </div>
                <p>{hospitalName}</p>
              </div>
              {isOwner && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="partner-edit-button" type="button" onClick={() => router.push(`/partner/doctors/${d.id}`)}>
                    <img src="/partner-template/edit.svg" alt="수정" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFire(d)}
                    style={{ fontSize: 12, color: '#EF4444', background: '#FEF2F2', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    해고
                  </button>
                </div>
              )}
            </article>
          ))}

          {active.length === 0 && (
            <button className="partner-member-empty" type="button" onClick={handleAdd}>
              <span>멤버 추가</span>
            </button>
          )}
        </section>
      )}

      {isOwner && active.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            type="button"
            onClick={handleAdd}
            style={{ width: '100%', height: 48, borderRadius: 14, border: '1.5px dashed #C8CEDA', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, color: '#6B7280', cursor: 'pointer' }}
          >
            <UserPlus size={16} />
            멤버 추가
          </button>
        </div>
      )}
    </div>
  );
}
