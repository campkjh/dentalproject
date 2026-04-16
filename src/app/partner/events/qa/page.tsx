'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

type Qa = {
  id: number;
  eventId: string;
  eventTitle: string;
  createdAt: string;
  question: string;
  answer?: string;
  answeredAt?: string;
};

const INITIAL: Qa[] = [
  {
    id: 1041,
    eventId: 'evt-1041',
    eventTitle: '눈매교정 + 쌍꺼풀 자연유착',
    createdAt: '2026-04-16 11:30',
    question: '제가 쌍꺼풀이 짝짝이인데 눈매교정과 같이 할 수 있을까요? 회복 기간도 궁금합니다.',
  },
  {
    id: 1040,
    eventId: 'evt-1039',
    eventTitle: '코끝 재수술 3D',
    createdAt: '2026-04-15 19:08',
    question: '이전에 다른 병원에서 코수술을 받았는데 재수술 가능 여부 확인 부탁드립니다.',
    answer: '재수술은 이전 수술의 회복 상태에 따라 결정됩니다. 상담 시 엑스레이 확인 후 안내드리겠습니다. 감사합니다.',
    answeredAt: '2026-04-15 21:40',
  },
  {
    id: 1039,
    eventId: 'evt-1035',
    eventTitle: '리프팅 올드클래식',
    createdAt: '2026-04-14 10:22',
    question: '시술 당일 바로 출근 가능한가요?',
  },
];

export default function QaPage() {
  const [items, setItems] = useState<Qa[]>(INITIAL);
  const [qaEnabled, setQaEnabled] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const save = (id: number) => {
    const a = drafts[id]?.trim();
    if (!a) return;
    setItems((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer: a, answeredAt: '방금 전' } : q))
    );
    setDrafts((prev) => ({ ...prev, [id]: '' }));
    setOpenId(null);
  };

  const remove = (id: number) => {
    setItems((prev) => prev.map((q) => (q.id === id ? { ...q, answer: undefined, answeredAt: undefined } : q)));
  };

  const pending = items.filter((i) => !i.answer).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">이벤트 Q&A 관리</h1>
          <p className="text-[12px] text-gray-500 mt-1">
            미답변 <span className="text-red-500 font-semibold">{pending}</span>건 ·
            총 {items.length}건
          </p>
        </div>
        <label className="flex items-center gap-2 text-[12px]">
          <span className="font-semibold text-gray-700">Q&A 노출</span>
          <button
            onClick={() => setQaEnabled((v) => !v)}
            className="relative w-9 h-5 rounded-full"
            style={{
              backgroundColor: qaEnabled ? '#8DC63F' : '#E5E7EB',
              transition: 'background-color 220ms ease',
            }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
              style={{
                left: qaEnabled ? 18 : 2,
                transition: 'left 240ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </button>
        </label>
      </div>

      <div className="rounded-lg bg-[#F5FAEF] text-[11px] text-[#5B8B25] px-3 py-2 flex items-start gap-1.5">
        <Info size={11} className="mt-0.5 flex-shrink-0" />
        강남언니 앱 이외 채널로 소통을 유도하는 답변은 작성할 수 없습니다 (전화·홈페이지 안내 등).
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {items.map((q) => {
          const isOpen = openId === q.id;
          return (
            <div key={q.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-[11px] text-gray-400 font-semibold w-12">#{q.id}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-0.5">
                    <span className="font-semibold text-gray-700">{q.eventId}</span>
                    <span>·</span>
                    <span className="line-clamp-1">{q.eventTitle}</span>
                    <span className="ml-auto flex-shrink-0">{q.createdAt}</span>
                  </div>
                  <p className="text-[13px] text-gray-900 leading-snug mb-2">
                    <span className="text-[#8DC63F] font-bold mr-1.5">Q.</span>
                    {q.question}
                  </p>
                  {q.answer ? (
                    <div className="rounded-lg bg-gray-50 p-3 text-[12.5px] text-gray-700 leading-relaxed">
                      <p>
                        <span className="text-[#7C3AED] font-bold mr-1.5">A.</span>
                        {q.answer}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
                        <span>{q.answeredAt}</span>
                        <button
                          onClick={() => {
                            setDrafts((p) => ({ ...p, [q.id]: q.answer || '' }));
                            setOpenId(q.id);
                            setItems((prev) => prev.map((i) => i.id === q.id ? { ...i, answer: undefined } : i));
                          }}
                          className="text-gray-500 hover:text-gray-800 font-semibold"
                        >
                          수정
                        </button>
                        <button onClick={() => remove(q.id)} className="text-red-500 hover:underline">
                          삭제
                        </button>
                      </div>
                    </div>
                  ) : isOpen ? (
                    <div className="space-y-2">
                      <textarea
                        value={drafts[q.id] ?? ''}
                        onChange={(e) => setDrafts((p) => ({ ...p, [q.id]: e.target.value }))}
                        rows={3}
                        maxLength={500}
                        placeholder="답변을 입력해주세요."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12.5px] outline-none focus:border-[#8DC63F] resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">
                          {(drafts[q.id] ?? '').length}/500
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setOpenId(null)}
                            className="px-3 py-1.5 rounded text-[11px] font-semibold text-gray-600 border border-gray-200"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => save(q.id)}
                            className="px-3 py-1.5 rounded text-[11px] font-semibold bg-[#8DC63F] text-white"
                          >
                            답변 등록
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setOpenId(q.id)}
                      className="text-[12px] font-semibold text-[#5B8B25] flex items-center gap-0.5"
                    >
                      답변 작성하기 <ChevronDown size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
