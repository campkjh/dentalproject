'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import { resolveDoctorImageUrl } from '@/lib/images';
import MonoIcon from '@/components/common/MonoIcon';

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
      {/* 머리 = 고객 상세 머리(TopBar) — 56 줄 둥근 뒤로 + 아래 큰 제목 */}
      <TopBar title={isNew ? '프로필 등록' : '프로필 수정'} />

      {loading ? (
        <div className="partner-loading small">불러오는 중...</div>
      ) : (
        <main className="px-5 pb-8 pt-2">
          {/* 프로필 사진 — 가운데 동그라미 + 카메라 배지 */}
          <section className="qd-a-item flex flex-col items-center">
            <button
              type="button"
              className="relative h-[96px] w-[96px] rounded-full bg-[#F2F4F6] transition-transform active:scale-[0.97] disabled:opacity-70"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="프로필사진 변경"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveDoctorImageUrl(form.profile_image)} alt="" className="h-full w-full rounded-full object-cover" />
              <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-[#4E5968]">
                <MonoIcon name="camera" size={15} color="#FFFFFF" />
              </span>
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-[12px] font-semibold text-white">올리는 중</span>
              )}
            </button>
            <p className="mt-3 text-center text-[14px] leading-[1.5] text-[#8B95A1]">1:1 비율의 jpg, png, jpeg, avif · 10MB 이하</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.avif,image/jpeg,image/png,image/avif"
              onChange={handlePhotoUpload}
              hidden
            />
          </section>

          <label className="qd-a-item mt-7 block" style={{ animationDelay: '.06s' }}>
            <span className="mb-2 block text-[15px] font-semibold text-[#4E5968]">이름</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="이름"
              className={FIELD}
            />
          </label>

          <label className="qd-a-item mt-5 block" style={{ animationDelay: '.12s' }}>
            <span className="mb-2 block text-[15px] font-semibold text-[#4E5968]">전문의 타이틀</span>
            <input
              value={form.specialty}
              onChange={(event) => setForm((current) => ({ ...current, specialty: event.target.value }))}
              placeholder="치과교정과 전문의"
              className={FIELD}
            />
          </label>

          <section className="qd-a-item mt-5" aria-label="병원설정" style={{ animationDelay: '.18s' }}>
            <h2 className="mb-2 text-[15px] font-semibold text-[#4E5968]">병원설정</h2>
            <div className="flex min-h-14 items-center gap-3 rounded-[14px] bg-[#F2F4F6] py-2 pl-4 pr-2">
              <MonoIcon name="hospital" size={20} color="#8B95A1" />
              <span className="min-w-0 flex-1 truncate text-[16px] text-[#333D4B]">{hospitalName || '소속 병원 미등록'}</span>
              <button type="button" className="h-9 shrink-0 rounded-[10px] bg-white px-3 text-[14px] font-semibold text-[#333D4B]" onClick={() => showToast('병원 변경은 관리자 승인이 필요합니다.')}>변경</button>
              {!isNew && (
                <button type="button" className="h-9 shrink-0 rounded-[10px] bg-white px-3 text-[14px] font-semibold text-[#F04452]" onClick={handleLeave}>탈퇴</button>
              )}
            </div>
          </section>
        </main>
      )}

      {/* 바닥 저장 버튼 — 위 선 대신 흰 그라데이션 */}
      <div className="fixed inset-x-0 bottom-0 z-[75] bg-white px-4 pt-2" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 16px)' }}>
        <div className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-b from-white/0 to-white" />
        <div className="mx-auto max-w-[608px]">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || uploading}
            className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>

    </div>
  );
}

/* 입력 칸 — 회색 면 · 테두리 없음 · 16 글자. .partner-page input 전역 결(테두리·15px)을 ! 로 덮는다 */
const FIELD = 'block w-full !min-h-14 !rounded-[14px] !border-0 !bg-[#F2F4F6] !px-4 !text-[16px] !font-normal !text-[#191F28] outline-none transition-colors focus:!bg-[#EDEFF2] focus:!shadow-none';
