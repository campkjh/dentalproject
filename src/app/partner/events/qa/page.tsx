'use client';

// 이벤트 Q&A — 상품 상세(261031) 톤: 세그먼트 탭(미끄러지는 흰 알약) · 테두리 없는 질문 줄 · 연파랑 병원 답변 칸 · 회색 입력 칸.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

const FILTERS = ['전체', '미답변', '답변완료'] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Qa = {
  id: string;
  event_id: string;
  user_id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  user?: { name?: string } | null;
  event?: { title?: string } | null;
};

export default function PartnerQaPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [items, setItems] = useState<Qa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'전체' | '미답변' | '답변완료'>('전체');
  const [draftAnswer, setDraftAnswer] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());

  const reload = async () => {
    const res = await fetch('/api/my-hospital/event-qa', { cache: 'no-store' });
    if (!res.ok) return;
    const { qa } = await res.json();
    setItems(qa ?? []);
  };

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const filtered = items.filter((q) => {
    if (filter === '미답변') return !q.answer;
    if (filter === '답변완료') return !!q.answer;
    return true;
  });

  const submitAnswer = async (id: string) => {
    const text = (draftAnswer[id] ?? '').trim();
    if (!text) {
      showToast('답변을 입력해주세요.');
      return;
    }
    setPending((p) => new Set(p).add(id));
    try {
      const res = await fetch(`/api/event-qa/${id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: text }),
      });
      if (!res.ok) {
        showToast('답변 등록 실패');
      } else {
        showToast('답변이 등록되었습니다.');
        setDraftAnswer((d) => ({ ...d, [id]: '' }));
        await reload();
      }
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(id);
        return next;
      });
    }
  };

  if (!authUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
          <MonoIcon name="lock" size={34} color="#B0B8C1" />
        </span>
        <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">로그인이 필요해요</p>
        <Link href="/login" className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7]">
          로그인
        </Link>
      </div>
    );
  }

  const tabIdx = Math.max(0, FILTERS.indexOf(filter));

  return (
    <div className="bg-white pb-12">
      <TopBar title="이벤트 Q&A" sub="환자가 이벤트에 남긴 질문에 답해요." />

      {/* 탭 — 회색 트랙 위 흰 알약이 미끄러진다 */}
      <div className="qd-a-item px-5 pt-1">
        <div className="relative flex rounded-[12px] bg-[#F2F4F6] p-1">
          <span
            aria-hidden
            className="absolute bottom-1 top-1 rounded-[10px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-transform duration-300"
            style={{ left: 4, width: `calc((100% - 8px) / ${FILTERS.length})`, transform: `translateX(${tabIdx * 100}%)`, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
          {FILTERS.map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`relative z-[1] flex h-10 flex-1 items-center justify-center text-[15.5px] transition-colors ${isActive ? 'font-bold text-[#191F28]' : 'font-semibold text-[#8B95A1]'}`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="qd-a-item px-5 pt-2" style={{ animationDelay: '.06s' }}>
        {loading ? (
          <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
              <MonoIcon name="chat-bubble-question" size={34} color="#B0B8C1" />
            </span>
            <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">해당하는 질문이 없어요</p>
          </div>
        ) : (
          <div>
            {filtered.map((q, i) => (
              <div key={q.id}>
                {i > 0 && <div className="-mx-5 h-2.5 bg-[#F2F4F6]" />}
                <div className="py-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold text-[#191F28]">{q.user?.name ?? '익명'}</span>
                    <span className="text-[13.5px] text-[#B0B8C1]">{new Date(q.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                  {q.event?.title && (
                    <span className="mt-2 inline-flex h-6 max-w-full items-center truncate rounded-[6px] bg-[#E8F3FF] px-2 text-[13.5px] font-semibold text-[#3180F7]">
                      {q.event.title}
                    </span>
                  )}
                  <p className="mt-2.5 whitespace-pre-line text-[16px] leading-[1.6] text-[#333D4B]">{q.question}</p>

                  {q.answer ? (
                    <div className="mt-4 rounded-[14px] bg-[#EFF5FE] px-4 py-3.5">
                      <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13px] font-bold text-white">병원 답변</span>
                      <p className="mt-2.5 whitespace-pre-line text-[15px] leading-[1.6] text-[#1E3A78]">{q.answer}</p>
                      {q.answered_at && (
                        <p className="mt-1.5 text-[13px] text-[#1E3A78]/50">{new Date(q.answered_at).toLocaleString('ko-KR')}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <textarea
                        value={draftAnswer[q.id] ?? ''}
                        onChange={(e) => setDraftAnswer((d) => ({ ...d, [q.id]: e.target.value }))}
                        placeholder="답변을 입력해주세요"
                        rows={3}
                        className="!min-h-0 w-full resize-none !rounded-[14px] !border-0 !bg-[#F2F4F6] !px-4 !py-3.5 !text-[16px] !font-medium !leading-[1.6] !text-[#191F28] outline-none transition-colors placeholder:!text-[#B0B8C1] focus:!bg-[#EDEFF2] focus:!shadow-none"
                      />
                      <button
                        type="button"
                        onClick={() => submitAnswer(q.id)}
                        disabled={pending.has(q.id)}
                        className="flex h-12 w-full items-center justify-center rounded-[14px] bg-[#4A82EE] text-[16px] font-bold text-white transition-all active:scale-[0.98] disabled:bg-[#E5E8EB] disabled:text-[#B0B8C1]"
                      >
                        {pending.has(q.id) ? '등록 중…' : '답변 등록'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
