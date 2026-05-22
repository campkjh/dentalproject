'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { ChevronLeft, Camera } from 'lucide-react';
import { compressImage } from '@/lib/compressImage';
import {
  PartnerButton,
  PartnerField,
  PartnerInput,
  PartnerSelect,
  PartnerTextarea,
} from '@/components/partner/tds';

const TITLES = ['대표원장', '원장', '부원장', '수석원장', '전문의', '레지던트'];

export default function DoctorEditPage() {
  const params = useParams();
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const id = params.id as string;
  const isNew = id === 'new';

  const [form, setForm] = useState({ name: '', title: '원장', specialty: '', bio: '', profile_image: '', is_owner: false });
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv()) { setLoading(false); return; }
    const sb = createClient();

    // Get hospital for current user
    sb.from('hospitals').select('id').eq('owner_id', (sb as any).auth?._currentUser?.id ?? '').maybeSingle()
      .then(async ({ data }) => {
        if (data) setHospitalId(data.id);
      });

    if (!isNew) {
      sb.from('doctors').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setForm({
            name: data.name ?? '',
            title: data.title ?? '원장',
            specialty: data.specialty ?? '',
            bio: data.bio ?? '',
            profile_image: data.profile_image ?? '',
            is_owner: data.is_owner ?? false,
          });
          setHospitalId(data.hospital_id);
        }
        setLoading(false);
      });
    } else {
      // Get hospital_id from current user
      sb.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        sb.from('hospitals').select('id').eq('owner_id', user.id).maybeSingle()
          .then(({ data }) => { if (data) setHospitalId(data.id); });
      });
      setLoading(false);
    }
  }, [id, isNew]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('folder', 'doctor-profiles');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('업로드 실패');
      const blob = await res.json();
      setForm((f) => ({ ...f, profile_image: blob.url }));
    } catch {
      showToast('사진 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('이름을 입력해주세요.'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name,
        title: form.title,
        specialty: form.specialty || null,
        bio: form.bio || null,
        profileImage: form.profile_image || null,
      };
      let res: Response;
      if (isNew) {
        res = await fetch('/api/my-hospital/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/my-hospital/doctors/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as any).error || '저장에 실패했습니다.');
      }
      showToast(isNew ? '멤버가 추가되었습니다.' : '멤버 정보가 수정되었습니다.');
      router.back();
    } catch (e: any) {
      showToast(e?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="partner-mobile-screen partner-doctor-edit" style={{ paddingBottom: 88 }}>
      <header className="partner-doctor-edit-header">
        <button
          onClick={() => router.back()}
          aria-label="뒤로"
          className="partner-doctor-edit-back"
        >
          <ChevronLeft size={20} strokeWidth={2.1} />
        </button>
        <h1>{isNew ? '멤버 추가' : '프로필 설정'}</h1>
      </header>

      {loading ? (
        <div className="partner-loading small">불러오는 중...</div>
      ) : (
        <div className="partner-doctor-edit-form">
          {/* Profile photo */}
          <div className="partner-doctor-photo-field">
            <div className="partner-doctor-photo-wrap">
              <img
                src={form.profile_image || '/partner-template/doctor-avatar.png'}
                alt=""
              />
              <label>
                <Camera size={12} color="white" />
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          <PartnerField label="이름 *">
            <PartnerInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="이름을 입력하세요" />
          </PartnerField>

          <PartnerField label="직함">
            <PartnerSelect value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}>
              {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
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
            <PartnerTextarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} rows={4} placeholder="간단한 소개를 입력하세요" />
          </PartnerField>
        </div>
      )}

      <div className="partner-doctor-savebar">
        <PartnerButton type="button" size="m" disabled={saving || loading} onClick={handleSave} className="w-full">
          {saving ? '저장 중...' : isNew ? '멤버 추가' : '수정 완료'}
        </PartnerButton>
      </div>
    </div>
  );
}
