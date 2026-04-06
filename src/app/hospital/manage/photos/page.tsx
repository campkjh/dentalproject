'use client';

import { useState } from 'react';
import { Camera, Plus, X } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
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
    <div className="bg-white min-h-screen flex flex-col">
      <TopBar title="대문사진" />

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Guidelines */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-1">
          <p className="text-sm text-gray-700 font-medium">
            이미지는 3:1비율의 사진으로 첨부해주세요.
          </p>
          <p className="text-xs text-gray-500">
            jpg, png, jpeg, avif 10mb이하의 이미지 파일
          </p>
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative">
              {photo.url ? (
                <div className="aspect-[3/1] rounded-xl bg-gray-100 overflow-hidden relative group">
                  <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center"><span className="text-2xl">🦷</span></div>
                  {/* Overlay buttons */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => handleAddPhoto(photo.id)}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm"
                    >
                      <Camera size={14} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm"
                    >
                      <X size={14} className="text-red-500" />
                    </button>
                  </div>
                  {/* Delete button always visible on mobile */}
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center md:hidden"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleAddPhoto(photo.id)}
                  className="aspect-[3/1] w-full rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-[#7C3AED] transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Plus size={20} className="text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-400">사진추가</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="sticky bottom-0 bg-white px-4 py-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          className="w-full py-3.5 bg-[#7C3AED] text-white rounded-xl text-base font-bold"
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
