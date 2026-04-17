'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

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
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">의료진 관리</h1>
          <p className="text-[12px] text-gray-500 mt-1">
            총 <span className="text-gray-900 font-semibold">{doctors.length}</span>명의 의사가 등록되어 있습니다.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#7C3AED] text-white text-[13px] font-bold rounded-lg btn-press"
        >
          <Plus size={14} />
          의사 추가
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400 mb-4">등록된 의료진이 없습니다.</p>
          <button onClick={openAdd} className="text-[#7C3AED] text-sm font-bold">
            첫 의사 추가하기
          </button>
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-3">
          {doctors.map((d) => (
            <li key={d.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-full bg-[#F4EFFF] flex items-center justify-center text-[#7C3AED] font-bold flex-shrink-0 overflow-hidden">
                  {d.profile_image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={d.profile_image} alt={d.name} className="w-full h-full object-cover" />
                  ) : (
                    d.name.slice(-2)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[15px] font-bold text-gray-900">{d.name}</span>
                    <span className="text-[12px] text-[#7C3AED] font-semibold">{d.title}</span>
                    {d.is_owner && (
                      <span className="text-[10px] bg-[#7C3AED] text-white rounded px-1.5 py-0.5 font-bold">대표</span>
                    )}
                  </div>
                  {d.specialty && <p className="text-[12px] text-gray-500 mb-1">{d.specialty}</p>}
                  {d.bio && <p className="text-[12px] text-gray-600 line-clamp-2 leading-relaxed">{d.bio}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => openEdit(d)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-[12px] font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={12} /> 수정
                </button>
                {!d.is_owner && (
                  <button
                    onClick={() => handleDelete(d)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-[12px] font-bold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={12} /> 삭제
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add/Edit doctor modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-bold text-gray-900">
                {showModal === 'edit' ? '의료진 수정' : '의사 추가'}
              </h3>
              <button onClick={() => { setShowModal(null); setEditingId(null); }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="이름 *">
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
                />
              </Field>
              <Field label="직함">
                <select
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
                >
                  {['대표원장', '원장', '부원장', '수석원장'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="전문 분야">
                <input
                  value={form.specialty}
                  onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                  placeholder="예) 보존과 전문의, 치과교정과 전문의"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
                />
              </Field>
              <Field label="소개 (선택)">
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED] resize-none"
                />
              </Field>
              <Field label="프로필 이미지 URL (선택)">
                <input
                  value={form.profileImage}
                  onChange={(e) => setForm((f) => ({ ...f, profileImage: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
                />
              </Field>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setShowModal(null); setEditingId(null); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#7C3AED] text-white rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {saving ? '저장 중…' : showModal === 'edit' ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
