'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

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
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">이벤트 Q&amp;A</h1>
        <p className="text-[12px] text-gray-500 mt-1">환자가 이벤트에 남긴 질문에 응답합니다.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex gap-1">
        {(['전체', '미답변', '답변완료'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              backgroundColor: filter === f ? '#2B313D' : '#F4F5F7',
              color: filter === f ? '#fff' : '#51535C',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <MessageSquare size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">해당하는 질문이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((q) => (
            <li key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[12px] font-bold text-gray-900">{q.user?.name ?? '익명'}</span>
                <span className="text-[10px] text-gray-400">{new Date(q.created_at).toLocaleString('ko-KR')}</span>
                {q.event?.title && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4EFFF] text-[#7C3AED]">
                    {q.event.title}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-gray-700 mb-3">{q.question}</p>

              {q.answer ? (
                <div className="bg-[#F4EFFF] rounded-lg p-3">
                  <p className="text-[11px] font-bold text-[#7C3AED] mb-1">병원 답변</p>
                  <p className="text-[12px] text-gray-700">{q.answer}</p>
                  {q.answered_at && (
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(q.answered_at).toLocaleString('ko-KR')}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={draftAnswer[q.id] ?? ''}
                    onChange={(e) => setDraftAnswer((d) => ({ ...d, [q.id]: e.target.value }))}
                    placeholder="답변을 입력해주세요"
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 rounded-lg outline-none focus:bg-white focus:border-[#7C3AED] border border-transparent resize-none"
                  />
                  <button
                    onClick={() => submitAnswer(q.id)}
                    disabled={pending.has(q.id)}
                    className="ml-auto block px-4 py-1.5 bg-[#7C3AED] text-white text-[12px] font-bold rounded-lg disabled:opacity-50"
                  >
                    {pending.has(q.id) ? '등록 중…' : '답변 등록'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
