'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import { resolveDoctorImageUrl } from '@/lib/images';

const MAX_PROFILE_IMAGE_SIZE = 10 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/avif'];

export default function DoctorEditPage() {
  const params = useParams();
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);
  const showConfirm = useStore((s) => s.showConfirm);
  const id = params.id as string;
  const isNew = id === 'new';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    title: '원장',
    specialty: '',
    bio: '',
    profile_image: '',
    is_owner: false,
  });
  const [hospitalName, setHospitalName] = useState('');
  const [selfDoctorId, setSelfDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    document.body.classList.add('partner-profile-editing');
    return () => { document.body.classList.remove('partner-profile-editing'); };
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setLoading(false);
      return;
    }

    const sb = createClient();
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: selfDoctor } = await sb
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        setSelfDoctorId(selfDoctor?.id ?? null);
      }

      if (!isNew) {
        const { data } = await sb
          .from('doctors')
          .select('*, hospital:hospitals(name)')
          .eq('id', id)
          .single();

        if (data) {
          setForm({
            name: data.name ?? '',
            title: data.title ?? '원장',
            specialty: data.specialty ?? '',
            bio: data.bio ?? '',
            profile_image: data.profile_image ?? '',
            is_owner: data.is_owner ?? false,
          });
          const hospital = Array.isArray(data.hospital) ? data.hospital[0] : data.hospital;
          setHospitalName(hospital?.name ?? '');
        }
      } else if (user) {
        const { data: hospital } = await sb
          .from('hospitals')
          .select('name')
          .eq('owner_id', user.id)
          .maybeSingle();
        setHospitalName(hospital?.name ?? '');
      }

      setLoading(false);
    })();
  }, [id, isNew]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
      showToast('jpg, png, jpeg, avif 형식만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      showToast('10mb 이하 이미지만 업로드할 수 있습니다.');
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('folder', 'doctor-profiles');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('업로드 실패');
      const blob = await res.json();
      setForm((current) => ({ ...current, profile_image: blob.url }));
    } catch {
      showToast('사진 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        title: form.title.trim() || '원장',
        specialty: form.specialty.trim() || null,
        bio: form.bio.trim() || null,
        profileImage: form.profile_image || null,
      };
      const res = await fetch(isNew ? '/api/my-hospital/doctors' : `/api/my-hospital/doctors/${id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as any).error || '저장에 실패했습니다.');
      }
      showToast(isNew ? '멤버가 추가되었습니다.' : '프로필이 저장되었습니다.');
      router.back();
    } catch (e: any) {
      showToast(e?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = () => {
    if (leaving) return;
    showConfirm(
      '정말로 병원을 탈퇴 하시겠습니까?',
      '탈퇴처리가 되며 목록에서 사라집니다.',
      async () => {
        setLeaving(true);
        try {
          const res = await fetch(`/api/my-hospital/doctors/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error((j as any).error || '탈퇴 처리에 실패했습니다.');
          }
          showToast('병원에서 탈퇴했습니다.');
          if (id === selfDoctorId) {
            useStore.setState({ isDoctor: false });
            router.replace('/');
            return;
          }
          router.replace('/partner/doctors');
        } catch (e: any) {
          showToast(e?.message || '탈퇴 처리에 실패했습니다.');
        } finally {
          setLeaving(false);
        }
      }
    );
  };

  return (
    <div className="partner-mobile-screen partner-profile-edit-screen">
      <header className="partner-profile-edit-head">
        <button type="button" onClick={() => router.back()} aria-label="뒤로">
          <img src="/partner-template/chevron-left.svg" alt="" />
        </button>
        <h1>{isNew ? '프로필 등록' : '프로필 수정'}</h1>
      </header>

      {loading ? (
        <div className="partner-loading small">불러오는 중...</div>
      ) : (
        <main className="partner-profile-edit-content">
          <section className="partner-profile-photo-section">
            <h2>프로필사진</h2>
            <p>1:1규격의 jpg, png, jpeg, avif 10mb이하 이미지 파일</p>
            <button
              type="button"
              className="partner-profile-photo-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="프로필사진 변경"
            >
              <img src={resolveDoctorImageUrl(form.profile_image)} alt="" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.avif,image/jpeg,image/png,image/avif"
              onChange={handlePhotoUpload}
              hidden
            />
          </section>

          <label className="partner-profile-edit-field">
            <span>이름</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="이름"
            />
          </label>

          <label className="partner-profile-edit-field">
            <span>전문의 타이틀</span>
            <input
              value={form.specialty}
              onChange={(event) => setForm((current) => ({ ...current, specialty: event.target.value }))}
              placeholder="치과교정과 전문의"
            />
          </label>

          <section className="partner-profile-hospital-field" aria-label="병원설정">
            <h2>병원설정</h2>
            <div>
              <span>{hospitalName || '소속 병원 미등록'}</span>
              <button type="button" className="change" onClick={() => showToast('병원 변경은 관리자 승인이 필요합니다.')}>변경</button>
              {!isNew && (
                <button type="button" className="leave" onClick={handleLeave}>탈퇴</button>
              )}
            </div>
          </section>
        </main>
      )}

      <button className="partner-profile-save" type="button" onClick={handleSave} disabled={saving || loading || uploading}>
        {saving ? '저장 중...' : '저장하기'}
      </button>

    </div>
  );
}
