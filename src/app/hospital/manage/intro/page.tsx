'use client';

import { useState } from 'react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { hospitals } from '@/lib/mock-data';

const hospital = hospitals[0];
const MAX_LENGTH = 220;

export default function IntroEditPage() {
  const { showToast } = useStore();
  const [text, setText] = useState(
    hospital.introduction ||
      '참포도나무치과의원은 서울 서초구에 위치한 치과 전문 의원으로, 치아교정, 임플란트, 라미네이트 등 다양한 진료를 제공합니다. 환자 한 분 한 분에게 최선의 진료를 약속드리며, 편안하고 정확한 치료를 위해 항상 노력하겠습니다.'
  );

  const charCount = text.length;
  const isOverLimit = charCount > MAX_LENGTH;

  const handleSave = () => {
    if (isOverLimit) return;
    showToast('병원소개가 저장되었습니다.');
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <TopBar title="병원소개" />

      <div className="flex-1 px-2.5 py-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-gray-900">병원소개</label>
            <span
              className={`text-sm font-medium ${
                isOverLimit ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {charCount}/{MAX_LENGTH}
              {isOverLimit && (
                <span className="ml-2 text-red-500 text-xs font-bold">
                  저장불가
                </span>
              )}
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="병원소개를 입력해주세요"
            className={`w-full h-48 p-4 bg-gray-50 rounded-xl text-sm leading-relaxed border resize-none focus:outline-none focus:ring-1 ${
              isOverLimit
                ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                : 'border-gray-200 focus:ring-[#7C3AED] focus:border-[#7C3AED]'
            }`}
          />
        </div>

        {isOverLimit && (
          <p className="text-xs text-red-500">
            글자 수가 {MAX_LENGTH}자를 초과했습니다. {charCount - MAX_LENGTH}자를 줄여주세요.
          </p>
        )}
      </div>

      {/* Save button */}
      <div className="sticky bottom-0 bg-white px-2.5 py-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={isOverLimit}
          className={`w-full py-3.5 rounded-xl text-base font-bold transition-colors ${
            isOverLimit
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#7C3AED] text-white'
          }`}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
