'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Mail, Phone, MessageSquare } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  PartnerButton,
  PartnerField,
  PartnerListRow,
  PartnerPanel,
  PartnerSelect,
  PartnerTextarea,
  PartnerTop,
} from '@/components/partner/tds';

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
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#8037FF] text-white text-sm font-bold rounded-xl">
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
    <div className="space-y-5">
      <PartnerTop
        eyebrow="고객지원"
        title="문의"
        description="파트너 운영 관련 문의는 아래 채널을 이용해 주세요."
        icon={<MessageSquare size={28} />}
      />

      <PartnerPanel className="overflow-hidden">
        <PartnerListRow href="tel:1644-0000" icon={<Phone size={16} />} title="전화 상담" description="평일 10:00~18:00" meta="1644-0000" />
        <PartnerListRow href="mailto:partner@kidoctor.com" icon={<Mail size={16} />} title="이메일 문의" description="24시간 접수" meta="partner@kidoctor.com" />
        <PartnerListRow icon={<MessageSquare size={16} />} title="카카오 1:1" description="검색 후 친구추가" meta="@키닥터파트너" />
      </PartnerPanel>

      <PartnerPanel className="p-5">
        <h2 className="mb-4">문의하기</h2>

        {submitted ? (
          <div className="py-12 text-center">
            <CheckCircle size={36} className="mx-auto mb-3 text-[#8037FF]" />
            <p className="text-base font-bold text-gray-900 mb-2">문의가 접수되었습니다</p>
            <p className="text-[12px] text-gray-500">24시간 내에 등록하신 이메일로 답변드리겠습니다.</p>
            <PartnerButton
              type="button"
              variant="text"
              onClick={() => {
                setContent('');
                setSubmitted(false);
              }}
              className="mt-6"
            >
              새 문의 작성
            </PartnerButton>
          </div>
        ) : (
          <div className="space-y-4">
            <PartnerField label="문의 유형">
              <PartnerSelect
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </PartnerSelect>
            </PartnerField>
            <PartnerField label="내용" help="접수된 문의는 partner@kidoctor.com 으로 답변드립니다.">
              <PartnerTextarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="문의 내용을 자세히 적어주세요"
              />
            </PartnerField>
            <PartnerButton
              type="button"
              onClick={submit}
              disabled={submitting}
              size="xl"
              className="w-full"
            >
              {submitting ? '접수 중…' : '문의 접수'}
            </PartnerButton>
          </div>
        )}
      </PartnerPanel>
    </div>
  );
}
