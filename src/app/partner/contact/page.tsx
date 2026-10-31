'use client';

// 문의 — 상품 상세(261031) 톤: 테두리 없는 채널 줄 · 회색 띠 · 문의 유형 칩(고르면 연파랑) · 회색 입력 칸 · 큰 파랑 버튼.

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

// 연락 채널 — 회색 아이콘 칸 + 이름/설명 + 오른쪽 값(테두리 없는 줄)
const CHANNELS: { icon: string; title: string; desc: string; value: string; href?: string }[] = [
  { icon: 'call', title: '전화 상담', desc: '평일 10:00~18:00', value: '1644-0000', href: 'tel:1644-0000' },
  { icon: 'mail', title: '이메일 문의', desc: '24시간 접수', value: 'partner@kidoctor.com', href: 'mailto:partner@kidoctor.com' },
  { icon: 'chat-bubble', title: '카카오 1:1', desc: '검색 후 친구추가', value: '@마이닥파트너' },
];

const TOPICS = ['이용 문의', '결제·정산 문의', '병원 정보 변경', '광고 문의', '서비스 제안', '오류 신고', '기타'];

export default function PartnerContactPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const submit = async () => {
    if (!content.trim()) {
      showToast('내용을 입력해주세요.');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    const res = await fetch('/api/partner/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, content }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      showToast(j.error || '문의 접수에 실패했습니다.');
      return;
    }
    setSubmitted(true);
    showToast('문의가 접수되었습니다. 24시간 내 답변드릴게요.');
  };

  return (
    <div className="bg-white pb-12">
      <TopBar title="문의" sub="파트너 운영 관련 문의는 아래 채널을 이용해 주세요." />

      {/* ─── 연락 채널 ─── */}
      <div className="qd-a-item px-3 pb-5 pt-1">
        {CHANNELS.map((c) => {
          const inner = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#F2F4F6]">
                <MonoIcon name={c.icon} size={20} color="#6B7684" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-bold text-[#191F28]">{c.title}</span>
                <span className="mt-0.5 block text-[14px] text-[#8B95A1]">{c.desc}</span>
              </span>
              <span className="max-w-[45%] shrink-0 truncate text-right text-[15px] font-semibold text-[#333D4B]">{c.value}</span>
              {c.href && <ChevronRight size={18} className="shrink-0 text-[#B0B8C1]" />}
            </>
          );
          return c.href ? (
            <a key={c.title} href={c.href} className="flex items-center gap-3 rounded-[16px] px-2 py-3 transition-colors active:bg-[#F9FAFB]">
              {inner}
            </a>
          ) : (
            <div key={c.title} className="flex items-center gap-3 rounded-[16px] px-2 py-3">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="h-2.5 bg-[#F2F4F6]" />

      {/* ─── 문의하기 ─── */}
      <div className="qd-a-item px-5 py-7" style={{ animationDelay: '.06s' }}>
        <h2 className="!text-[20px] font-bold !leading-[1.3] tracking-[-0.4px] text-[#191F28]">문의하기</h2>

        {submitted ? (
          <div className="flex flex-col items-center py-12 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/color/check-circle.svg" alt="" width={44} height={44} />
            <p className="mt-4 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">문의가 접수됐어요</p>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]">24시간 안에 등록하신 이메일로 답변드릴게요.</p>
            <button
              type="button"
              onClick={() => {
                setContent('');
                setSubmitted(false);
              }}
              className="mt-6 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7]"
            >
              새 문의 작성
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div>
              <p className="mb-2 text-[15px] font-semibold text-[#4E5968]">문의 유형</p>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => {
                  const on = topic === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTopic(t)}
                      className={`flex h-9 items-center rounded-[8px] px-3 text-[14.5px] font-semibold transition-colors ${on ? 'bg-[#EFF5FE] text-[#2F6FE4]' : 'bg-[#F2F4F6] text-[#333D4B]'}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[15px] font-semibold text-[#4E5968]">내용</p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="문의 내용을 자세히 적어주세요"
                className="!min-h-0 w-full resize-none !rounded-[14px] !border-0 !bg-[#F2F4F6] !px-4 !py-3.5 !text-[16px] !font-medium !leading-[1.6] !text-[#191F28] outline-none transition-colors placeholder:!text-[#B0B8C1] focus:!bg-[#EDEFF2] focus:!shadow-none"
              />
              <p className="mt-3 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
                <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
                접수된 문의는 partner@kidoctor.com 으로 답변드려요.
              </p>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98] disabled:bg-[#E5E8EB] disabled:text-[#B0B8C1]"
            >
              {submitting ? '접수 중…' : '문의 접수'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
