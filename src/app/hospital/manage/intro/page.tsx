'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';

const MAX_LENGTH = 220;

export default function IntroEditPage() {
  const router = useRouter();
  const { showToast } = useStore();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital', { cache: 'no-store' });
        if (!res.ok) return;
        const { hospital } = await res.json();
        if (cancelled) return;
        if (!hospital) {
          showToast('등록된 병원이 없습니다.');
          router.push('/hospital/register');
          return;
        }
        setText(hospital.introduction ?? '');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, showToast]);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_LENGTH;

  const handleSave = async () => {
    if (isOverLimit || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/my-hospital', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ introduction: text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '저장에 실패했습니다.');
      } else {
        showToast('병원소개가 저장되었습니다.');
      }
    } finally {
      setSaving(false);
    }
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
            placeholder={loading ? '불러오는 중…' : '병원소개를 입력해주세요'}
            disabled={loading}
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
          disabled={isOverLimit || saving || loading}
          className={`w-full py-3.5 rounded-xl text-base font-bold transition-colors ${
            isOverLimit || saving || loading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#7C3AED] text-white'
          }`}
        >
          {saving ? '저장 중…' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
