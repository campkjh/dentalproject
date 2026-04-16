'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MessageSquare } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

const TOPICS = ['이용 문의', '결제·정산 문의', '병원 정보 변경', '광고 문의', '서비스 제안', '오류 신고', '기타'];

export default function PartnerContactPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);

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

  const submit = () => {
    if (!content.trim()) {
      showToast('내용을 입력해주세요.');
      return;
    }
    // No backend for contact form yet — just show success
    setSubmitted(true);
    showToast('문의가 접수되었습니다. 24시간 내 답변드릴게요.');
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">고객지원 / 문의</h1>
        <p className="text-[12px] text-gray-500 mt-1">파트너 운영 관련 문의는 아래 채널을 이용해 주세요.</p>
      </div>

      {/* Quick contact channels */}
      <div className="grid md:grid-cols-3 gap-3">
        <a href="tel:1644-0000" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#7C3AED] transition-colors">
          <Phone size={18} className="text-[#7C3AED] mb-3" />
          <p className="text-[12px] text-gray-500 mb-1">전화 상담</p>
          <p className="text-[15px] font-bold text-gray-900">1644-0000</p>
          <p className="text-[10px] text-gray-400 mt-1">평일 10:00~18:00</p>
        </a>
        <a href="mailto:partner@kidoctor.com" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#7C3AED] transition-colors">
          <Mail size={18} className="text-[#7C3AED] mb-3" />
          <p className="text-[12px] text-gray-500 mb-1">이메일 문의</p>
          <p className="text-[14px] font-bold text-gray-900 break-all">partner@kidoctor.com</p>
          <p className="text-[10px] text-gray-400 mt-1">24시간 접수</p>
        </a>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <MessageSquare size={18} className="text-[#7C3AED] mb-3" />
          <p className="text-[12px] text-gray-500 mb-1">카카오 1:1</p>
          <p className="text-[14px] font-bold text-gray-900">@키닥터파트너</p>
          <p className="text-[10px] text-gray-400 mt-1">검색 후 친구추가</p>
        </div>
      </div>

      {/* Inquiry form */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-[14px] font-bold text-gray-900">문의하기</h2>

        {submitted ? (
          <div className="py-12 text-center">
            <p className="text-base font-bold text-gray-900 mb-2">문의가 접수되었습니다 ✓</p>
            <p className="text-[12px] text-gray-500">24시간 내에 등록하신 이메일로 답변드리겠습니다.</p>
            <button
              onClick={() => {
                setContent('');
                setSubmitted(false);
              }}
              className="mt-6 text-[12px] text-[#7C3AED] font-bold"
            >
              새 문의 작성
            </button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1.5">문의 유형</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1.5">내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="문의 내용을 자세히 적어주세요"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED] resize-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">접수된 문의는 partner@kidoctor.com 으로 답변드립니다.</p>
            </div>
            <button
              onClick={submit}
              className="w-full py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-lg"
            >
              문의 접수
            </button>
          </>
        )}
      </section>
    </div>
  );
}
