'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  PartnerButton,
  PartnerField,
  PartnerInput,
  PartnerModal,
  PartnerSelect,
  PartnerTextarea,
} from '@/components/partner/tds';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doctor = {
  id: string;
  name: string;
  title: string | null;
  specialty: string | null;
  bio: string | null;
  profile_image: string | null;
  is_owner: boolean;
};

export default function PartnerDoctorsPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitalName, setHospitalName] = useState('참포도나무치과의원');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', title: '원장', specialty: '', bio: '', profileImage: '' });

  const reload = async () => {
    const res = await fetch('/api/my-hospital', { cache: 'no-store' });
    if (!res.ok) return;
    const { hospital } = await res.json();
    setHospitalName(hospital?.name ?? '참포도나무치과의원');
    setDoctors(hospital?.doctors ?? []);
  };

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const openAdd = () => {
    setForm({ name: '', title: '원장', specialty: '', bio: '', profileImage: '' });
    setEditingId(null);
    setShowModal('add');
  };

  const openEdit = (d: Doctor) => {
    setForm({
      name: d.name,
      title: d.title ?? '원장',
      specialty: d.specialty ?? '',
      bio: d.bio ?? '',
      profileImage: d.profile_image ?? '',
    });
    setEditingId(d.id);
    setShowModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('의사명을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const isEdit = showModal === 'edit' && editingId;
      const url = isEdit ? `/api/my-hospital/doctors/${editingId}` : '/api/my-hospital/doctors';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '저장에 실패했습니다.');
      } else {
        showToast(isEdit ? '의료진 정보가 수정되었습니다.' : '의료진이 추가되었습니다.');
        setForm({ name: '', title: '원장', specialty: '', bio: '', profileImage: '' });
        setShowModal(null);
        setEditingId(null);
        await reload();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!authUser) {
    return (
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#3182F6] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="partner-mobile-screen">
      <header className="partner-screen-title with-action">
        <h1>병원관리</h1>
        <nav className="partner-inline-segment" aria-label="병원관리 탭">
          <Link href="/partner/hospital-info">병원</Link>
          <Link href="/partner/doctors" className="is-active">{`멤버(${doctors.length.toLocaleString()})`}</Link>
          <Link href="/partner/reviews">리뷰</Link>
        </nav>
      </header>
      {loading ? (
        <div className="partner-loading small">불러오는 중...</div>
      ) : doctors.length === 0 ? (
        <section className="partner-member-content">
          <button className="partner-member-empty" type="button" onClick={openAdd}>
            <span>멤버 추가</span>
          </button>
        </section>
      ) : (
        <section className="partner-member-content">
          {doctors.map((d) => (
            <article key={d.id} className="partner-member-row">
                <div className="partner-member-avatar">
                  {d.profile_image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={d.profile_image} alt={d.name} />
                  ) : (
                    <img src="/partner-template/doctor-avatar.png" alt="" />
                  )}
                </div>
                <div className="partner-member-summary">
                  <div>
                    <h2>
                      {d.name}
                      {d.is_owner ? <span>My</span> : null}
                    </h2>
                    <p>{d.specialty || d.title || '치과교정과 전문의'}</p>
                  </div>
                  <p>{hospitalName}</p>
                </div>
                <button className="partner-edit-button" type="button" aria-label={`${d.name} 수정`} onClick={() => openEdit(d)}>
                  <img src="/partner-template/edit.svg" alt="" />
                </button>
            </article>
          ))}
        </section>
      )}

      {showModal && (
        <PartnerModal
          title={showModal === 'edit' ? '의료진 수정' : '의사 추가'}
          onClose={() => { setShowModal(null); setEditingId(null); }}
          footer={
            <>
              <PartnerButton type="button" variant="weak" tone="neutral" className="flex-1" onClick={() => { setShowModal(null); setEditingId(null); }}>
                취소
              </PartnerButton>
              <PartnerButton type="button" disabled={saving} className="flex-1" onClick={handleSave}>
                {saving ? '저장 중…' : showModal === 'edit' ? '수정' : '추가'}
              </PartnerButton>
            </>
          }
        >
            <div className="space-y-3">
              <PartnerField label="이름 *">
                <PartnerInput
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </PartnerField>
              <PartnerField label="직함">
                <PartnerSelect
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                >
                  {['대표원장', '원장', '부원장', '수석원장'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </PartnerSelect>
              </PartnerField>
              <PartnerField label="전문 분야">
                <PartnerInput
                  value={form.specialty}
                  onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                  placeholder="예) 보존과 전문의, 치과교정과 전문의"
                />
              </PartnerField>
              <PartnerField label="소개 (선택)">
                <PartnerTextarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                />
              </PartnerField>
              <PartnerField label="프로필 이미지 URL (선택)">
                <PartnerInput
                  value={form.profileImage}
                  onChange={(e) => setForm((f) => ({ ...f, profileImage: e.target.value }))}
                  placeholder="https://..."
                />
              </PartnerField>
            </div>
        </PartnerModal>
      )}
    </div>
  );
}
