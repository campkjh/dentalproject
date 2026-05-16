'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  PartnerButton,
  PartnerEmpty,
  PartnerField,
  PartnerInput,
  PartnerModal,
  PartnerPanel,
  PartnerSelect,
  PartnerStatusBadge,
  PartnerTextarea,
  PartnerTop,
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', title: '원장', specialty: '', bio: '', profileImage: '' });

  const reload = async () => {
    const res = await fetch('/api/my-hospital', { cache: 'no-store' });
    if (!res.ok) return;
    const { hospital } = await res.json();
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

  const handleDelete = async (d: Doctor) => {
    if (d.is_owner) {
      showToast('대표원장은 삭제할 수 없습니다.');
      return;
    }
    if (!confirm(`${d.name} 원장님을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/my-hospital/doctors/${d.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '삭제에 실패했습니다.');
      } else {
        showToast('의료진이 삭제되었습니다.');
        await reload();
      }
    } catch {
      showToast('네트워크 오류');
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
    <div className="space-y-5">
      <PartnerTop
        eyebrow="병원 관리"
        title="의료진 관리"
        description={`총 ${doctors.length}명의 의사가 등록되어 있습니다.`}
        icon={<UserRound size={28} />}
        action={
          <PartnerButton type="button" size="m" leftIcon={<Plus size={16} />} onClick={openAdd}>
            추가
          </PartnerButton>
        }
      />

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : doctors.length === 0 ? (
        <PartnerEmpty
          icon={<UserRound size={24} />}
          title="등록된 의료진이 없습니다."
          action={<PartnerButton type="button" variant="weak" size="m" onClick={openAdd}>첫 의사 추가하기</PartnerButton>}
        />
      ) : (
        <PartnerPanel className="overflow-hidden">
          {doctors.map((d) => (
            <article key={d.id} className="partner-list-row items-start">
                <div className="h-[60px] w-[60px] flex-shrink-0 overflow-hidden rounded-[18px] bg-[#E8F3FF] text-[#3182F6] flex items-center justify-center font-bold">
                  {d.profile_image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={d.profile_image} alt={d.name} className="w-full h-full object-cover" />
                  ) : (
                    d.name.slice(-2)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[17px] font-bold leading-[23px] text-[#191F28]">{d.name}</span>
                    {d.title && <PartnerStatusBadge tone="info">{d.title}</PartnerStatusBadge>}
                    {d.is_owner && <PartnerStatusBadge tone="brand">대표</PartnerStatusBadge>}
                  </div>
                  {d.specialty && <p className="mt-1 text-[13px] text-[rgba(0,19,43,0.58)]">{d.specialty}</p>}
                  {d.bio && <p className="mt-1 line-clamp-2 text-[13px] leading-[18px] text-[rgba(3,24,50,0.46)]">{d.bio}</p>}
                  <div className="mt-3 flex gap-2">
                    <PartnerButton type="button" variant="weak" tone="neutral" size="s" leftIcon={<Pencil size={13} />} className="flex-1" onClick={() => openEdit(d)}>
                      수정
                    </PartnerButton>
                    {!d.is_owner && (
                      <PartnerButton type="button" variant="weak" tone="danger" size="s" leftIcon={<Trash2 size={13} />} className="flex-1" onClick={() => handleDelete(d)}>
                        삭제
                      </PartnerButton>
                    )}
                  </div>
                </div>
            </article>
          ))}
        </PartnerPanel>
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
