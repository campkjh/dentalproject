'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, MoreHorizontal } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

type Reply = {
  id: string;
  doctorName: string;
  doctorTitle: string;
  doctorHospital?: string;
  content: string;
  time: string;
};

type LiveQuestion = {
  id: string;
  user: { name: string; gender?: 'male' | 'female'; seed: string };
  category: string;
  content: string;
  time: string;
  replies: Reply[];
};

const seedQuestions: LiveQuestion[] = [
  {
    id: 'q1',
    user: { name: '민지', seed: 'u1' },
    category: '임플란트',
    content: '수요일에 왼쪽 아래 어금니 임플란트 했는데 오늘까지도 잇몸이 부어있어요. 통증은 많이 줄었는데 부기가 생각보다 오래 가네요. 정상인가요?',
    time: '방금 전',
    replies: [
      {
        id: 'q1a1',
        doctorName: '김정우',
        doctorTitle: '대표원장',
        doctorHospital: '참포도나무치과',
        content: '수술 후 72시간 부기는 정상 범위입니다. 얼음찜질 10분씩 2-3회 해주시고 누우실 때 베개를 높게 해주세요. 5일 이상 지속되거나 통증이 심해지면 꼭 내원하세요.',
        time: '2분 전',
      },
      {
        id: 'q1a2',
        doctorName: '이서연',
        doctorTitle: '원장',
        doctorHospital: '바른이치과',
        content: '처방받으신 소염제 복용 꾸준히 하시고, 뜨거운 음식·흡연·음주는 피하세요.',
        time: '1분 전',
      },
    ],
  },
  {
    id: 'q2',
    user: { name: '현우', seed: 'u2' },
    category: '치아교정',
    content: '송곳니가 살짝 튀어나왔는데 한 병원에선 비발치 가능, 다른 곳은 발치해야 한다고 합니다. 판단 기준이 궁금해요.',
    time: '5분 전',
    replies: [
      {
        id: 'q2a1',
        doctorName: '박지훈',
        doctorTitle: '원장',
        doctorHospital: '스마일라인 교정치과',
        content: '단순히 송곳니 돌출만 봐서는 판단이 어렵고, 치열 전체의 여유 공간과 잇몸 뼈 두께를 같이 보아야 합니다. CT/파노라마를 보고 결정하는 게 안전해요.',
        time: '4분 전',
      },
    ],
  },
  {
    id: 'q3',
    user: { name: '수현', seed: 'u3' },
    category: '치아미백',
    content: '내일 오피스 미백 예약되어 있는데 시술 후 48시간 동안 뭘 조심해야 하나요? 구체적인 음식 리스트를 알고 싶어요.',
    time: '12분 전',
    replies: [],
  },
  {
    id: 'q4',
    user: { name: '지훈', seed: 'u4' },
    category: '사랑니',
    content: '사랑니 상태 확인만 하러 가도 비용이 나오나요? 통증은 없어요. 보험 적용 가능한가요?',
    time: '20분 전',
    replies: [
      {
        id: 'q4a1',
        doctorName: '정준영',
        doctorTitle: '원장',
        content: '초진 진료비(1만원 전후)가 발생하고 X-ray 촬영 시 추가됩니다. 증상이 없으면 검진 차원이라 보험 적용은 제한적이에요.',
        time: '15분 전',
      },
    ],
  },
  {
    id: 'q5',
    user: { name: '예린', seed: 'u5' },
    category: '스케일링',
    content: '스케일링 6개월 주기가 맞나요? 병원마다 얘기가 다르고, 치은염이 약간 있다고 들었습니다.',
    time: '25분 전',
    replies: [
      {
        id: 'q5a1',
        doctorName: '김정우',
        doctorTitle: '대표원장',
        doctorHospital: '참포도나무치과',
        content: '치은염이 있으신 경우엔 6개월 주기 권장, 치석이 빠르게 쌓이는 체질이면 4개월로 줄여도 좋습니다.',
        time: '22분 전',
      },
    ],
  },
];

const categories = ['전체', '임플란트', '치아교정', '치아미백', '사랑니', '스케일링', '기타'];

function relTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return d.toLocaleDateString('ko-KR');
}

export default function CommunityLivePage() {
  const router = useRouter();
  const { showToast, addPost, posts, comments, user } = useStore();
  const { authUser } = useSession();
  const [activeCategory, setActiveCategory] = useState('전체');
  const [input, setInput] = useState('');
  const [pickedCategory, setPickedCategory] = useState('기타');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Build live Q&A feed from DB posts/comments (boardType='question' + doctor replies)
  const questions = useMemo<LiveQuestion[]>(() => {
    const qPosts = posts.filter((p) => p.boardType === 'question');
    const liveFromDb = qPosts.map((p): LiveQuestion => {
      const category = (p.tags && p.tags[0]) || '기타';
      const replies: Reply[] = comments
        .filter((c) => c.postId === p.id && c.authorTitle === '의사')
        .map((c) => ({
          id: c.id,
          doctorName: c.authorName,
          doctorTitle: c.authorTitle ?? '원장',
          doctorHospital: c.authorHospital,
          content: c.content,
          time: relTime(c.date),
        }));
      return {
        id: p.id,
        user: { name: p.authorName, seed: p.authorId || p.id },
        category,
        content: p.content,
        time: relTime(p.date),
        replies,
      };
    });
    return liveFromDb;
  }, [posts, comments]);

  const filtered = useMemo(() => {
    const list = activeCategory === '전체' ? questions : questions.filter((q) => q.category === activeCategory);
    // 채팅 순서: 오래된 글 위 → 최신 글 아래 (API는 DESC라 reverse)
    return [...list].reverse();
  }, [questions, activeCategory]);

  // Scroll to bottom — on mount + whenever questions change
  useEffect(() => {
    // Small delay to ensure DOM has rendered
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
    }, 100);
    return () => clearTimeout(timer);
  }, [filtered.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    if (!authUser) {
      showToast('로그인이 필요합니다.');
      router.push('/login');
      return;
    }
    const result = await addPost({
      id: `q-${Date.now()}`,
      boardType: 'question',
      title: text.slice(0, 40),
      content: text,
      authorName: user?.name ?? '익명',
      authorId: user?.id ?? '',
      isAnonymous: false,
      date: new Date().toISOString(),
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      tags: [pickedCategory],
      hasAnswer: false,
      answerCount: 0,
    });
    if (result.error) {
      showToast(result.error);
      return;
    }
    setInput('');
    showToast('질문이 등록되었습니다. 의사의 답변을 기다려주세요.');
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-white max-w-[480px] mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 px-2.5 h-12">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img
              src="/icons/community-live-doctor-v2.svg"
              alt=""
              width={22}
              height={22}
            />
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold text-gray-900 leading-tight">
                실시간 의사 상담
              </h1>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                의사 12명 답변 중
              </p>
            </div>
          </div>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        </div>
        {/* Category pills */}
        <div className="flex gap-1.5 px-2.5 pb-2 overflow-x-auto hide-scrollbar">
          {categories.map((c) => {
            const active = activeCategory === c;
            return (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className="pill-tab px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap"
                style={{
                  backgroundColor: active ? '#2B313D' : '#F4F5F7',
                  color: active ? '#fff' : '#51535C',
                  transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </header>

      {/* Chat feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2.5 pt-3 pb-4"
        style={{ backgroundColor: '#FAFBFC' }}
      >
        <div className="space-y-5">
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-2xl mb-3">💬</p>
              <p className="text-sm font-bold text-gray-700 mb-1">아직 질문이 없어요</p>
              <p className="text-xs text-gray-400">아래에서 첫 질문을 남겨보세요!</p>
            </div>
          )}
          {filtered.map((q) => (
            <QuestionThread key={q.id} question={q} />
          ))}
        </div>
        {/* Anchor — always scroll here */}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        className="bg-white"
        style={{
          borderTop: '1px solid #F2F3F5',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Category pills */}
        <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5 overflow-x-auto hide-scrollbar">
          {categories.filter((c) => c !== '전체').map((c) => {
            const active = pickedCategory === c;
            return (
              <button
                key={c}
                onClick={() => setPickedCategory(c)}
                className="px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all"
                style={{
                  backgroundColor: active ? '#7C3AED' : 'transparent',
                  color: active ? '#fff' : '#9CA3AF',
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="px-3 pb-3"
        >
          <div
            className="flex items-center gap-0 rounded-full overflow-hidden"
            style={{
              backgroundColor: '#F4F5F7',
              border: input.trim() ? '1.5px solid #C4B5FD' : '1.5px solid transparent',
              transition: 'border-color 200ms ease',
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="의사에게 궁금한 점을 적어주세요"
              rows={1}
              className="flex-1 resize-none outline-none bg-transparent text-[14px] leading-snug placeholder:text-gray-400 py-3 pl-4 pr-1"
              style={{ maxHeight: 80 }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex-shrink-0 flex items-center justify-center mr-1.5 transition-all"
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                backgroundColor: input.trim() ? '#7C3AED' : 'transparent',
                color: input.trim() ? '#fff' : '#C5CAD4',
                transition: 'all 200ms ease',
              }}
            >
              <Send size={15} strokeWidth={2.2} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuestionThread({ question }: { question: LiveQuestion }) {
  const [expanded, setExpanded] = useState(question.replies.length <= 2);
  const visibleReplies = expanded ? question.replies : question.replies.slice(0, 1);

  return (
    <div className="fade-in-up">
      {/* User question bubble (right-aligned) */}
      <div className="flex justify-end gap-2">
        <div className="max-w-[78%] flex flex-col items-end">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] text-gray-500 font-medium">
              {question.user.name} · {question.time}
            </span>
            <span className="text-[10px] font-semibold text-[#7C3AED] bg-[#EDE9FE] rounded px-1.5 py-0.5 leading-none">
              {question.category}
            </span>
          </div>
          <div
            className="rounded-2xl rounded-tr-md px-3.5 py-2.5"
            style={{ backgroundColor: '#2B313D', color: '#fff' }}
          >
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
              {question.content}
            </p>
          </div>
        </div>
        <Avatar seed={question.user.seed} size={28} className="flex-shrink-0" />
      </div>

      {/* Doctor replies (left-aligned threaded) */}
      {visibleReplies.length > 0 && (
        <div className="mt-2.5 space-y-2 pl-2">
          {visibleReplies.map((r) => (
            <div key={r.id} className="flex items-start gap-2">
              <Avatar role="doctor" seed={r.id} size={32} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[12px] font-semibold text-gray-900">
                    {r.doctorName} {r.doctorTitle}
                  </span>
                  {r.doctorHospital && (
                    <span className="text-[10px] text-gray-400">· {r.doctorHospital}</span>
                  )}
                  <span className="text-[11px] text-[#7C3AED] font-semibold bg-[#EDE9FE] rounded px-1.5 py-0.5 leading-none">
                    의사 답변
                  </span>
                </div>
                <div
                  className="rounded-2xl rounded-tl-md px-3.5 py-2.5"
                  style={{ backgroundColor: '#fff', border: '1px solid #F2F3F5' }}
                >
                  <p className="text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {r.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400">{r.time}</span>
                  <button className="text-[10px] text-gray-400">
                    <MoreHorizontal size={10} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!expanded && question.replies.length > 1 && (
            <button
              onClick={() => setExpanded(true)}
              className="ml-10 text-[11px] text-[#7C3AED] font-semibold"
            >
              답변 {question.replies.length - 1}개 더 보기
            </button>
          )}
        </div>
      )}

      {question.replies.length === 0 && (
        <div className="mt-2 pl-10">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ backgroundColor: '#FFFBEB', color: '#B45309' }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
            <span className="text-[11px] font-semibold">답변 대기 중</span>
          </div>
        </div>
      )}
    </div>
  );
}
