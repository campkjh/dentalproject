'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import LoginRequired from '@/components/common/LoginRequired';
import Avatar from '@/components/common/Avatar';
import { Camera, ChevronRight, Check, X } from 'lucide-react';

const GENDERS = ['남성', '여성', '선택안함'];

const COUNTRIES = [
  '대한민국',
  '일본',
  '중국',
  '미국',
  '베트남',
  '기타',
];

const YEAR_START = 1940;
const YEARS = Array.from(
  { length: new Date().getFullYear() - YEAR_START + 1 },
  (_, i) => String(new Date().getFullYear() - i)
);

type SheetType = 'name' | 'gender' | 'year' | 'country' | null;

export default function ProfilePage() {
  const router = useRouter();
  const {
    isLoggedIn,
    user,
    showModal,
    hideModal,
    logout,
    showToast,
    updateUser,
    interestedCategories,
    toggleInterestedCategory,
    categories,
  } = useStore();

  const [sheet, setSheet] = useState<SheetType>(null);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white max-w-[500px] mx-auto">
        <TopBar title="프로필 설정" />
        <LoginRequired />
      </div>
    );
  }

  const handleWithdraw = () => {
    showModal('회원탈퇴', '정말 탈퇴하시겠습니까? 모든 데이터가 영구 삭제됩니다.', async () => {
      hideModal();
      try {
        const res = await fetch('/api/auth/withdraw', { method: 'DELETE' });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({}));
          showToast(error || '탈퇴 처리 중 오류가 발생했습니다.');
          return;
        }
        logout();
        router.push('/');
      } catch {
        showToast('네트워크 오류가 발생했습니다.');
      }
    });
  };

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('이미지 파일만 선택해주세요.'); return; }
    if (f.size > 5 * 1024 * 1024) { showToast('5MB 이하 이미지만 등록할 수 있습니다.'); return; }

    // 미리보기 즉시 표시
    const previewUrl = URL.createObjectURL(f);
    updateUser({ profileImage: previewUrl });

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', f);
      formData.append('folder', 'profile-images');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('업로드 실패');
      const blob = await res.json();
      const url = blob.url as string;
      updateUser({ profileImage: url });
      showToast('프로필 사진이 변경되었습니다.');
    } catch {
      showToast('사진 업로드에 실패했습니다.');
      updateUser({ profileImage: undefined });
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploadingPhoto(false);
    }
  };

  const infoItems: { label: string; value: string; onClick?: () => void; readonly?: boolean }[] = [
    { label: '이름', value: user?.name ?? '-', onClick: () => setSheet('name') },
    {
      label: '로그인 유형',
      value: user?.loginType === 'kakao' ? '카카오' : '애플',
      readonly: true,
    },
    { label: '전화번호', value: user?.phone ?? '-', readonly: true },
    { label: '성별', value: user?.gender ?? '-', onClick: () => setSheet('gender') },
    { label: '출생년도', value: user?.birthYear ?? '-', onClick: () => setSheet('year') },
    { label: '국가', value: user?.country ?? '대한민국', onClick: () => setSheet('country') },
  ];

  return (
    <div className="min-h-screen bg-white max-w-[500px] mx-auto page-enter">
      <TopBar title="프로필 설정" />

      {/* Profile Avatar */}
      <div className="bg-white pt-5 pb-4 flex flex-col items-center fade-in-up">
        <div className="relative mb-2.5">
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: '#F3F4F6' }}
          >
            <Avatar
              src={user?.profileImage}
              gender={user?.gender}
              size={58}
              alt={user?.name || '프로필'}
            />
          </div>
          <label className={`absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer btn-press ${uploadingPhoto ? 'bg-gray-400' : 'bg-[#8037FF]'}`}>
            {uploadingPhoto ? <span className="text-white text-[10px]">...</span> : <Camera size={14} className="text-white" />}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onAvatarChange}
            />
          </label>
        </div>
        <h2 className="text-[16px] font-semibold text-gray-900">{user?.name}</h2>
      </div>

      {/* Customer Info */}
      <div className="mt-1 bg-white">
        <div className="px-5 pt-4 pb-1.5">
          <h3 className="text-[15px] font-semibold text-gray-900">고객정보</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {infoItems.map((item) => (
            <button
              key={item.label}
              disabled={item.readonly}
              onClick={item.onClick}
              className="w-full flex min-h-11 items-center justify-between px-5 py-2.5 text-left disabled:cursor-default hover:bg-gray-50 disabled:hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-medium text-gray-500">{item.label}</span>
              <div className="flex min-w-0 items-center gap-1.5 pl-4">
                <span className="truncate text-right text-[14px] font-medium text-gray-900">{item.value}</span>
                {!item.readonly && <ChevronRight size={16} strokeWidth={1.8} className="h-4 w-4 flex-none text-gray-300" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Interested categories */}
      <div className="h-2 bg-gray-50 mt-1" />
      <div className="bg-white pb-4">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-[15px] font-semibold text-gray-900">관심있는 진료과목</h3>
          <span className="text-[11px] text-gray-400 font-medium">
            {interestedCategories.length}개 선택
          </span>
        </div>
        <p className="text-[12px] text-gray-500 px-5 mb-3 leading-snug">
          관심 있는 카테고리를 선택하면 홈에서 관련 시술과 병원을 더 많이 만날 수 있어요.
        </p>
        <div className="px-5 grid grid-cols-4 gap-2">
          {categories.map((cat) => {
            const selected = interestedCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleInterestedCategory(cat.id)}
                className="flex flex-col items-center gap-1.5 card-press relative"
                style={{ transition: 'transform 180ms ease' }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: selected ? '#F4EFFF' : '#F4F5F7',
                    boxShadow: selected ? '0 4px 12px rgba(49,130,246,0.2)' : 'none',
                    transform: selected ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  <img src={cat.icon} alt={cat.name} className="w-9 h-9" />
                </div>
                <span
                  className="text-[12px] font-medium"
                  style={{ color: selected ? '#8037FF' : '#4B5563' }}
                >
                  {cat.name}
                </span>
                {selected && (
                  <span
                    className="absolute top-0 right-0 w-5 h-5 bg-[#8037FF] rounded-full flex items-center justify-center check-pop"
                    style={{ boxShadow: '0 2px 6px rgba(49,130,246,0.3)' }}
                  >
                    <Check size={11} strokeWidth={3} className="text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Withdraw Button */}
      <div className="px-5 py-6">
        <button
          onClick={handleWithdraw}
          className="w-full py-3 text-sm text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          회원탈퇴
        </button>
      </div>

      {sheet && (
        <EditSheet
          type={sheet}
          user={user}
          onClose={() => setSheet(null)}
          onSave={(patch) => {
            updateUser(patch);
            setSheet(null);
            showToast('저장되었습니다.');
          }}
        />
      )}
    </div>
  );
}

function EditSheet({
  type,
  user,
  onClose,
  onSave,
}: {
  type: 'name' | 'gender' | 'year' | 'country';
  user: import('@/types').User | null;
  onClose: () => void;
  onSave: (patch: Partial<import('@/types').User>) => void;
}) {
  const title = {
    name: '이름 변경',
    gender: '성별 선택',
    year: '출생년도 선택',
    country: '국가 선택',
  }[type];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-end justify-center lg:items-center modal-overlay-enter"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[500px] rounded-t-2xl lg:rounded-2xl max-h-[80vh] flex flex-col modal-content-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
          <button onClick={onClose}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        {type === 'name' && <NameEditor name={user?.name ?? ''} onSave={(v) => onSave({ name: v })} />}
        {type === 'gender' && (
          <ListChoice
            options={GENDERS}
            value={user?.gender}
            onSelect={(v) => onSave({ gender: v })}
          />
        )}
        {type === 'year' && (
          <ListChoice
            options={YEARS}
            value={user?.birthYear}
            onSelect={(v) => onSave({ birthYear: v })}
          />
        )}
        {type === 'country' && (
          <ListChoice
            options={COUNTRIES}
            value={user?.country}
            onSelect={(v) => onSave({ country: v })}
          />
        )}
      </div>
    </div>
  );
}

function NameEditor({ name, onSave }: { name: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <div className="p-5 flex flex-col gap-3">
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value.slice(0, 12))}
        placeholder="이름 입력"
        className="w-full px-4 py-3 bg-gray-50 rounded-xl text-[15px] outline-none focus:bg-[#F4EFFF]"
      />
      <p className="text-[11px] text-gray-400 text-right">{val.length}/12</p>
      <button
        disabled={!val.trim()}
        onClick={() => onSave(val.trim())}
        className="w-full py-3.5 rounded-xl font-bold text-[15px] btn-press"
        style={{
          backgroundColor: val.trim() ? '#8037FF' : '#E5E7EB',
          color: val.trim() ? '#fff' : '#A4ABBA',
        }}
      >
        저장
      </button>
    </div>
  );
}

function ListChoice({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value?: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto py-2">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
            style={{ backgroundColor: selected ? '#F4EFFF' : 'transparent' }}
          >
            <span
              className="text-[14px]"
              style={{
                color: selected ? '#8037FF' : '#2B313D',
                fontWeight: selected ? 700 : 500,
              }}
            >
              {opt}
            </span>
            {selected && <Check size={16} strokeWidth={3} className="text-[#8037FF]" />}
          </button>
        );
      })}
    </div>
  );
}
