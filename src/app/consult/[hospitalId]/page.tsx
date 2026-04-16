'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Send, Paperclip, Phone, Info } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import { useStore } from '@/store';

type Msg = {
  id: string;
  from: 'user' | 'hospital';
  text: string;
  time: string;
  sender?: string;
};

const QUICK_TEMPLATES = [
  '상담 예약 가능한가요?',
  '가격이 궁금합니다.',
  '후기 더 볼 수 있나요?',
  '회복 기간이 궁금합니다.',
];

export default function ConsultChatPage() {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const router = useRouter();
  const hospitals = useStore((s) => s.hospitals);
  const hospital = hospitals.find((h) => h.id === hospitalId) ?? hospitals[0];

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 'welcome',
      from: 'hospital',
      text: `안녕하세요! ${hospital.name}입니다. 궁금하신 점 편하게 남겨주세요. 보통 영업시간 내 30분 내 답변드려요. 🙌`,
      time: '방금',
      sender: '상담 매니저',
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs.length, typing]);

  const send = (text?: string) => {
    const body = (text ?? input).trim();
    if (!body) return;
    setMsgs((p) => [
      ...p,
      { id: `m-${Date.now()}`, from: 'user', text: body, time: '방금' },
    ]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((p) => [
        ...p,
        {
          id: `h-${Date.now()}`,
          from: 'hospital',
          text:
            '문의해주셔서 감사합니다! 담당자가 확인 후 빠르게 답변드리겠습니다. 예약 원하시면 내원 가능 날짜를 알려주세요.',
          time: '방금',
          sender: '상담 매니저',
        },
      ]);
    }, 1400);
  };

  return (
    <div className="h-[100dvh] bg-white max-w-[480px] mx-auto flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 h-14 px-2.5 border-b border-gray-100 flex items-center gap-2">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft size={22} className="text-gray-900" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-gray-900 line-clamp-1">{hospital.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <p className="text-[11px] text-gray-500">운영 중 · 평균 30분 내 답변</p>
          </div>
        </div>
        <a
          href={`tel:${hospital.phone ?? ''}`}
          className="p-2 rounded-full hover:bg-gray-100"
          aria-label="전화"
        >
          <Phone size={18} className="text-gray-700" />
        </a>
      </header>

      {/* Info banner */}
      <div className="flex-shrink-0 px-2.5 py-2 bg-[#F4EFFF] flex items-start gap-2">
        <Info size={12} className="text-[#7C3AED] mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-[#7C3AED] leading-snug">
          의료 상담은 실제 진료를 대체하지 않습니다. 정확한 진단은 내원 후 안내받으세요.
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 bg-[#FAFBFC]">
        <div className="space-y-3">
          {msgs.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
          {typing && (
            <div className="flex items-start gap-2 fade-in-up">
              <Avatar role="doctor" seed={hospital.id} size={28} className="flex-shrink-0" />
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-3 py-2.5 flex items-center gap-1">
                <Dot delay={0} />
                <Dot delay={0.15} />
                <Dot delay={0.3} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick templates */}
      {msgs.length <= 2 && (
        <div className="flex-shrink-0 px-3 pb-2 flex gap-1.5 overflow-x-auto hide-scrollbar">
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t}
              onClick={() => send(t)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold text-gray-700 bg-white border border-gray-200 btn-press hover:bg-gray-50"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex-shrink-0 flex items-end gap-2 px-2.5 py-2.5"
        style={{
          borderTop: '1px solid #F2F3F5',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        }}
      >
        <button type="button" className="p-2 rounded-full hover:bg-gray-100" aria-label="첨부">
          <Paperclip size={18} className="text-gray-500" />
        </button>
        <div
          className="flex-1 rounded-2xl px-3 py-2"
          style={{ backgroundColor: '#F4F5F7' }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="메시지 입력 (Enter 전송)"
            className="w-full text-[13px] outline-none bg-transparent resize-none placeholder:text-gray-400"
            style={{ maxHeight: 100 }}
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 btn-press"
          style={{
            backgroundColor: input.trim() ? '#7C3AED' : '#E5E7EB',
            color: '#fff',
            transition: 'background-color 220ms ease',
            boxShadow: input.trim() ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
          }}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.from === 'user';
  return (
    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''} fade-in-up`}>
      {!isUser && <Avatar role="doctor" seed={msg.id} size={28} className="flex-shrink-0" />}
      <div className="max-w-[78%]">
        {!isUser && msg.sender && (
          <p className="text-[10px] text-gray-500 mb-0.5">{msg.sender}</p>
        )}
        <div
          className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
          style={{
            backgroundColor: isUser ? '#7C3AED' : '#fff',
            color: isUser ? '#fff' : '#2B313D',
            border: isUser ? 'none' : '1px solid #F2F3F5',
            borderTopRightRadius: isUser ? 4 : 16,
            borderTopLeftRadius: isUser ? 16 : 4,
          }}
        >
          {msg.text}
        </div>
        <p
          className="text-[10px] text-gray-400 mt-1"
          style={{ textAlign: isUser ? 'right' : 'left' }}
        >
          {msg.time}
        </p>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-gray-400"
      style={{
        animation: `typingDot 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s infinite`,
      }}
    />
  );
}
