'use client';

// 프로필 설정 — 프리티풀 마이 > 프로필 수정 결: 사진 원(편집 배지) · 칸마다 라벨 위·값 아래 카드(qd-card) · 관심 진료과목 타일 · 아래 회색 '회원탈퇴'.
//  · 칸을 누르면 바텀 시트(qd-input + qd-cta 저장 / 고르기 줄). 저장·업로드·탈퇴 흐름은 예전 그대로.
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import Avatar from '@/components/common/Avatar';
import { QdBody, MySectionTitle, MY_CARD } from '@/components/detail/QdKit';
import { Screen, Sheet, NeedLogin } from '@/components/mypage/screens/ScreenKit';

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

type SheetType = 'name' | 'phone' | 'gender' | 'year' | 'country' | null;

export default function ProfilePage() {
  const router = useRouter();
  const {
    isLoggedIn,
    isDoctor,
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
  // 시트가 내려가는 동안에도 내용이 남게 마지막 종류를 기억한다
  const [lastSheet, setLastSheet] = useState<Exclude<SheetType, null>>('name');
  if (sheet && sheet !== lastSheet) setLastSheet(sheet);
  const closeSheet = useCallback(() => setSheet(null), []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  if (!isLoggedIn) {
    return (
      <Screen>
        <TopBar title="프로필 설정" />
        <NeedLogin />
      </Screen>
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
    { label: '전화번호', value: user?.phone ?? '-', ...(isDoctor ? { onClick: () => setSheet('phone') } : { readonly: true }) },
    { label: '성별', value: user?.gender ?? '-', onClick: () => setSheet('gender') },
    { label: '출생년도', value: user?.birthYear ?? '-', onClick: () => setSheet('year') },
    { label: '국가', value: user?.country ?? '대한민국', onClick: () => setSheet('country') },
  ];

  return (
    <Screen>
      <TopBar title="프로필 설정" sub="내 정보를 확인하고 바꿀 수 있어요" />

      <QdBody className="space-y-8 px-6 pt-1 pc:px-8">
        {/* 사진 원 + 편집 배지 */}
        <div className="flex flex-col items-center pt-1">
          <label className={`relative block cursor-pointer rounded-full transition-transform active:scale-[0.97] ${uploadingPhoto ? 'pointer-events-none' : ''}`} aria-label="프로필 사진 바꾸기">
            <span className="flex h-[96px] w-[96px] items-center justify-center overflow-hidden rounded-full bg-[#F2F4F6]">
              <Avatar src={user?.profileImage} gender={user?.gender} size={96} alt={user?.name || '프로필'} />
            </span>
            {uploadingPhoto && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/60">
                <span className="h-6 w-6 animate-spin rounded-full border-[2.5px] border-[#3180F7] border-t-transparent" />
              </span>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-[34px] w-[34px] items-center justify-center rounded-full border-[2.5px] border-white bg-[#F2F4F6] shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/toss/picture.svg" alt="" width={18} height={18} />
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={onAvatarChange} />
          </label>
          <p className="mt-3.5 text-[20px] font-bold text-[#191F28]">{user?.name}</p>
          <p className="mt-0.5 text-[14px] text-[#8B95A1]">{user?.loginType === 'kakao' ? '카카오' : '애플'} 계정으로 로그인했어요</p>
        </div>

        {/* 고객정보 — 라벨 위 · 값 아래 칸 */}
        <section>
          <MySectionTitle>고객정보</MySectionTitle>
          <div className="space-y-2.5">
            {infoItems.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={item.readonly}
                onClick={item.onClick}
                className={`${MY_CARD} flex min-h-[64px] w-full items-center gap-3 px-[18px] py-3 text-left transition-colors active:bg-[#F8F9FA] disabled:cursor-default disabled:bg-[#F9FAFB] disabled:active:bg-[#F9FAFB] pc:hover:bg-[#FAFBFC] pc:disabled:hover:bg-[#F9FAFB]`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] text-[#8B95A1]">{item.label}</span>
                  <span className={`truncate text-[17px] font-semibold ${item.readonly ? 'text-[#6B7684]' : 'text-[#191F28]'}`}>{item.value}</span>
                </span>
                {item.readonly ? (
                  <span className="shrink-0 text-[13px] text-[#B0B8C1]">변경 불가</span>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                    <path d="M9 6l6 6-6 6" stroke="#B0B8C1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 관심있는 진료과목 */}
        <section>
          <div className="flex items-baseline justify-between">
            <MySectionTitle>관심있는 진료과목</MySectionTitle>
            <span className="pb-2.5 pr-1 text-[13px] font-semibold text-[#3180F7]">{interestedCategories.length}개 선택</span>
          </div>
          <p className="-mt-1 mb-3.5 break-keep px-1 text-[14px] leading-[1.5] text-[#8B95A1]">
            관심 있는 카테고리를 선택하면 홈에서 관련 시술과 병원을 더 많이 만날 수 있어요.
          </p>
          <div className="grid grid-cols-4 gap-2 pc:grid-cols-6">
            {categories.map((cat) => {
              const selected = interestedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleInterestedCategory(cat.id)}
                  aria-pressed={selected}
                  className="relative flex flex-col items-center gap-1.5 rounded-[16px] py-2.5 transition-transform active:scale-95"
                >
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-[16px] transition-all duration-200"
                    style={{
                      backgroundColor: selected ? '#EDF4FF' : '#F2F4F6',
                      boxShadow: selected ? 'inset 0 0 0 1.5px #3180F7' : 'none',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.icon} alt="" className="h-9 w-9" />
                  </span>
                  <span className={`text-[13px] ${selected ? 'font-semibold text-[#3180F7]' : 'text-[#4E5968]'}`}>{cat.name}</span>
                  {selected && (
                    <span className="check-pop absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#3180F7] shadow-[0_2px_6px_rgba(49,128,247,0.3)]">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 회원탈퇴 — 아래 회색 글자 */}
        <div className="flex justify-center pb-4 pt-2">
          <button type="button" onClick={handleWithdraw} className="rounded-[10px] px-3 py-2 text-[14px] text-[#8B95A1] underline decoration-[#D1D6DB] underline-offset-4 active:bg-[#F2F4F6]">
            회원탈퇴
          </button>
        </div>
      </QdBody>

      <Sheet open={!!sheet} title={SHEET_TITLE[lastSheet]} onClose={closeSheet}>
        <EditSheetBody
          key={lastSheet + String(!!sheet)}
          type={lastSheet}
          user={user}
          onSave={(patch) => {
            updateUser(patch);
            setSheet(null);
            showToast('저장되었습니다.');
          }}
        />
      </Sheet>
    </Screen>
  );
}

const SHEET_TITLE: Record<Exclude<SheetType, null>, string> = {
  name: '이름 변경',
  phone: '전화번호 변경',
  gender: '성별 선택',
  year: '출생년도 선택',
  country: '국가 선택',
};

function EditSheetBody({
  type,
  user,
  onSave,
}: {
  type: Exclude<SheetType, null>;
  user: import('@/types').User | null;
  onSave: (patch: Partial<import('@/types').User>) => void;
}) {
  if (type === 'name') return <NameEditor name={user?.name ?? ''} onSave={(v) => onSave({ name: v })} />;
  if (type === 'phone') return <NameEditor name={user?.phone ?? ''} phone onSave={(v) => onSave({ phone: v })} />;
  if (type === 'gender') return <ListChoice options={GENDERS} value={user?.gender} onSelect={(v) => onSave({ gender: v })} />;
  if (type === 'year') return <ListChoice options={YEARS} value={user?.birthYear} onSelect={(v) => onSave({ birthYear: v })} />;
  return <ListChoice options={COUNTRIES} value={user?.country} onSelect={(v) => onSave({ country: v })} />;
}

function NameEditor({ name, onSave, phone = false }: { name: string; onSave: (v: string) => void; phone?: boolean }) {
  const [val, setVal] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // 시트가 올라온 뒤 포커스(올라오는 중에 키보드가 뜨면 덜컹인다)
    const t = setTimeout(() => inputRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, []);
  const max = phone ? 20 : 12;
  return (
    <div className="flex flex-col gap-2 pb-1">
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value.slice(0, max))}
        placeholder={phone ? '전화번호 입력' : '이름 입력'}
        aria-label={phone ? '전화번호' : '이름'}
        inputMode={phone ? 'tel' : 'text'}
        className="qd-input"
      />
      <p className="pr-1 text-right text-[13px] tabular-nums text-[#B0B8C1]">{val.length}/{max}</p>
      <button type="button" disabled={!val.trim()} onClick={() => onSave(val.trim())} className="qd-cta mt-2">
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
    <div className="-mx-2 pb-1">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            aria-pressed={selected}
            className={`flex min-h-[56px] w-full items-center justify-between rounded-[14px] px-4 text-left transition-colors active:bg-[#F2F4F6] pc:hover:bg-[#F9FAFB] ${selected ? 'bg-[#F2F7FF]' : ''}`}
          >
            <span className={`text-[17px] ${selected ? 'font-semibold text-[#3180F7]' : 'text-[#333D4B]'}`}>{opt}</span>
            {selected && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#3180F7" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
