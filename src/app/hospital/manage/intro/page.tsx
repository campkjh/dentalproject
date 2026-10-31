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

  const disabled = isOverLimit || saving || loading;

  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 96px), 104px)' }}>
      <TopBar title="병원소개" sub="환자에게 보이는 병원 소개 글이에요." />

      <div className="flex-1 px-5 pb-6 pt-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={loading ? '불러오는 중…' : '병원소개를 입력해 주세요'}
          disabled={loading}
          className={`block h-[240px] w-full resize-none rounded-[14px] px-4 py-3.5 text-[16px] leading-[1.6] text-[#191F28] outline-none transition-colors placeholder:text-[#B0B8C1] ${
            isOverLimit ? 'bg-[#FFEEEF]' : 'bg-[#F2F4F6] focus:bg-[#EDEFF2]'
          }`}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="min-w-0 text-[14px] text-[#F04452]">
            {isOverLimit && `${MAX_LENGTH}자를 넘었어요. ${charCount - MAX_LENGTH}자를 줄여 주세요.`}
          </p>
          <p className="shrink-0 text-[14px] tabular-nums text-[#8B95A1]">
            <span className={`font-semibold ${isOverLimit ? 'text-[#F04452]' : 'text-[#333D4B]'}`}>{charCount}</span>/{MAX_LENGTH}
            {isOverLimit && <span className="ml-1.5 font-semibold text-[#F04452]">저장불가</span>}
          </p>
        </div>
      </div>

      {/* 바닥 저장 버튼 — 위 선 대신 흰 그라데이션 */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white px-4 pt-2" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 16px)' }}>
        <div className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-b from-white/0 to-white" />
        <div className="mx-auto max-w-[608px]">
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled}
            className={`flex h-14 w-full items-center justify-center rounded-[18px] text-[17px] font-bold transition-all active:scale-[0.98] ${
              disabled ? 'cursor-not-allowed bg-[#F2F4F6] text-[#B0B8C1]' : 'bg-[#4A82EE] text-white'
            }`}
          >
            {saving ? '저장 중…' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
