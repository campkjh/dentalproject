'use client';

import { useState } from 'react';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useStore } from '@/store';

interface PhotoSlot {
  id: string;
  url: string | null;
}

export default function PhotosEditPage() {
  const { showToast } = useStore();

  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { id: '1', url: null },
    { id: '2', url: '/images/hospital1.jpg' },
    { id: '3', url: '/images/product1.jpg' },
    { id: '4', url: null },
  ]);

  const handleAddPhoto = (id: string) => {
    // In production, this would open a file picker
    showToast('이미지 선택 기능은 준비 중입니다.');
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, url: null } : p))
    );
    showToast('이미지가 삭제되었습니다.');
  };

  const handleSave = () => {
    showToast('대문사진이 저장되었습니다.');
  };

  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 96px), 104px)' }}>
      <TopBar title="대문사진" sub="병원 홈 맨 위에 넘겨 보는 사진이에요." />

      <div className="flex-1 px-5 pb-6 pt-2">
        <p className="flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
          <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
          <span>
            3:1 비율 사진으로 올려 주세요.
            <br />
            jpg, png, jpeg, avif · 10MB 이하
          </span>
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {photos.map((photo, i) => (
            <div key={photo.id} className="qd-a-item relative" style={{ animationDelay: `${i * 0.04}s` }}>
              {photo.url ? (
                <div className="group relative aspect-[3/1] overflow-hidden rounded-[14px] bg-[#F2F4F6]">
                  <div className="flex h-full w-full items-center justify-center">
                    <MonoIcon name="hospital" size={22} color="#B0B8C1" />
                  </div>
                  {/* 마우스를 올리면 바꾸기·지우기 */}
                  <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/0 opacity-0 transition md:flex md:group-hover:bg-black/30 md:group-hover:opacity-100">
                    <button type="button" aria-label="사진 바꾸기" onClick={() => handleAddPhoto(photo.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                      <MonoIcon name="camera" size={15} color="#4E5968" />
                    </button>
                    <button type="button" aria-label="사진 지우기" onClick={() => handleDeletePhoto(photo.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                      <MonoIcon name="bin" size={15} color="#F04452" />
                    </button>
                  </div>
                  {/* 휴대폰 = 지우기 버튼 늘 보임 */}
                  <button
                    type="button"
                    aria-label="사진 지우기"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 md:hidden"
                  >
                    <MonoIcon name="bin" size={14} color="#FFFFFF" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAddPhoto(photo.id)}
                  className="flex aspect-[3/1] w-full items-center justify-center gap-1.5 rounded-[14px] bg-[#F2F4F6] transition-colors active:bg-[#E5E8EB]"
                >
                  <MonoIcon name="camera" size={18} color="#8B95A1" />
                  <span className="text-[14px] font-semibold text-[#6B7684]">사진 추가</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 바닥 저장 버튼 — 위 선 대신 흰 그라데이션 */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white px-4 pt-2" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 16px)' }}>
        <div className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-b from-white/0 to-white" />
        <div className="mx-auto max-w-[608px]">
          <button
            type="button"
            onClick={handleSave}
            className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
