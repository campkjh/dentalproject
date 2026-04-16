'use client';

import { useState } from 'react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';

type Review = {
  id: number;
  date: string;
  author: string;
  channel: '병원 페이지' | '이벤트' | '의사';
  doctor?: string;
  type: '일반후기' | '경과후기';
  rating: number;
  content: string;
  reply?: string;
  replyAt?: string;
  progress?: {
    lastDate: string;
    total: number;
    status: '진행중' | '완료';
    completedAt?: string;
  };
  answeredOnly?: boolean;
};

const INITIAL: Review[] = [
  {
    id: 2041,
    date: '2026-04-15',
    author: '지은***',
    channel: '이벤트',
    doctor: '김정우 원장',
    type: '일반후기',
    rating: 5,
    content: '상담부터 시술까지 정말 만족스러웠어요. 회복도 빨랐고 결과도 자연스럽습니다.',
  },
  {
    id: 2040,
    date: '2026-04-12',
    author: '민수***',
    channel: '병원 페이지',
    doctor: '이서연 원장',
    type: '경과후기',
    rating: 4,
    content: '시술 2주차, 붓기는 많이 빠졌고 라인이 점점 자리잡는 느낌입니다.',
    progress: { lastDate: '2026-04-12', total: 3, status: '진행중' },
  },
  {
    id: 2039,
    date: '2026-04-08',
    author: '혜원***',
    channel: '의사',
    doctor: '김정우 원장',
    type: '일반후기',
    rating: 5,
    content: '믿고 맡긴 결과 너무 만족합니다. 꼼꼼히 설명해주셔서 불안감이 없었어요.',
    reply:
      '소중한 후기 감사드립니다. 결과에 만족하셨다니 저희도 기쁩니다. 경과 관리 필요하시면 언제든 내원해 주세요.',
    replyAt: '2026-04-09',
  },
  {
    id: 2038,
    date: '2026-04-05',
    author: '유리***',
    channel: '이벤트',
    doctor: '이서연 원장',
    type: '경과후기',
    rating: 5,
    content: '3개월 경과 후기 남겨요. 라인이 정말 예쁘게 자리 잡았어요.',
    progress: {
      lastDate: '2026-04-05',
      total: 5,
      status: '완료',
      completedAt: '2026-04-05',
    },
  },
];

export default function ReviewsPage() {
  const [channel, setChannel] = useState<'전체' | '상담신청' | '상담미신청'>('전체');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [items, setItems] = useState<Review[]>(INITIAL);
  const [openId, setOpenId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const filtered = items.filter((r) => {
    if (pendingOnly && r.reply) return false;
    return true;
  });

  const saveReply = (id: number) => {
    const v = drafts[id]?.trim();
    if (!v) return;
    setItems((p) =>
      p.map((r) => (r.id === id ? { ...r, reply: v, replyAt: '방금 전' } : r))
    );
    setDrafts((p) => ({ ...p, [id]: '' }));
    setOpenId(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">후기 관리</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          총 {items.length}건 · 미답변 {items.filter((i) => !i.reply).length}건
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(['전체', '상담신청', '상담미신청'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setChannel(c)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{
                backgroundColor: channel === c ? '#2B313D' : '#F4F5F7',
                color: channel === c ? '#fff' : '#51535C',
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="ml-auto text-[12px] flex items-center gap-1.5 text-gray-700">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
          />
          미답변만
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {filtered.map((r) => {
          const isOpen = openId === r.id;
          return (
            <div key={r.id} className="p-4">
              <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1 flex-wrap">
                <span className="font-semibold text-gray-700">#{r.id}</span>
                <span>·</span>
                <span>{r.date}</span>
                <span>·</span>
                <span>{r.author}</span>
                <span>·</span>
                <span>{r.channel}</span>
                {r.doctor && (
                  <>
                    <span>·</span>
                    <span>{r.doctor}</span>
                  </>
                )}
                <span
                  className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    backgroundColor: r.type === '경과후기' ? '#FFF8E1' : '#E6F2FF',
                    color: r.type === '경과후기' ? '#B45309' : '#1E6FD9',
                  }}
                >
                  {r.type}
                </span>
              </div>
              <div className="flex items-center gap-0.5 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    fill={i < r.rating ? '#FBBF24' : 'transparent'}
                    stroke={i < r.rating ? '#FBBF24' : '#D1D5DB'}
                  />
                ))}
                <span className="ml-1 text-[11px] font-semibold text-gray-700">
                  {r.rating.toFixed(1)}
                </span>
              </div>
              <p className="text-[13px] text-gray-800 leading-snug mb-2">{r.content}</p>

              {r.progress && (
                <div className="rounded-lg bg-gray-50 p-2.5 mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                  <span>최종 경과일: <span className="text-gray-900 font-semibold">{r.progress.lastDate}</span></span>
                  <span>·</span>
                  <span>총 {r.progress.total}회</span>
                  <span>·</span>
                  <span
                    className="font-semibold"
                    style={{ color: r.progress.status === '완료' ? '#15803D' : '#B45309' }}
                  >
                    {r.progress.status}
                  </span>
                  {r.progress.completedAt && <span>({r.progress.completedAt} 완료)</span>}
                </div>
              )}

              {r.reply ? (
                <div className="rounded-lg bg-[#F4EFFF] p-3 text-[12.5px] text-gray-800 leading-relaxed">
                  <span className="text-[#7C3AED] font-bold mr-1.5">└ 병원 답글</span>
                  {r.reply}
                  <p className="text-[10px] text-gray-500 mt-1">{r.replyAt}</p>
                </div>
              ) : isOpen ? (
                <div className="space-y-2">
                  <textarea
                    value={drafts[r.id] ?? ''}
                    onChange={(e) => setDrafts((p) => ({ ...p, [r.id]: e.target.value }))}
                    rows={3}
                    maxLength={500}
                    placeholder="후기에 대한 답글을 작성해주세요."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12.5px] outline-none focus:border-[#7C3AED] resize-none"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setOpenId(null)}
                      className="px-3 py-1.5 rounded text-[11px] font-semibold text-gray-600 border border-gray-200"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => saveReply(r.id)}
                      className="px-3 py-1.5 rounded text-[11px] font-semibold bg-[#7C3AED] text-white"
                    >
                      답글 등록
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setOpenId(r.id)}
                  className="text-[11px] font-semibold text-[#7C3AED] flex items-center gap-0.5"
                >
                  답글 작성 <ChevronDown size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
