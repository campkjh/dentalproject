'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

type ContactField = {
  key: string;
  label: string;
  hint: string;
  type: 'tel' | 'email';
  value: string;
};

const INITIAL: ContactField[] = [
  {
    key: 'mainPhone',
    label: '대표 전화번호',
    hint: '병원의 대표 전화번호를 입력합니다.',
    type: 'tel',
    value: '02 1234 5678',
  },
  {
    key: 'callPhone',
    label: '전화문의 번호',
    hint: '앱내 병원/이벤트 페이지에서 "전화상담" 버튼을 눌렀을 때 연결되는 번호입니다.',
    type: 'tel',
    value: '02 1234 5678',
  },
  {
    key: 'consultManager',
    label: '상담 관리자 번호',
    hint: '고객이 상담을 신청했을 때 알림을 받을 담당자의 전화번호입니다.',
    type: 'tel',
    value: '010 1234 5678',
  },
  {
    key: 'smsSender',
    label: 'SMS 발신 번호',
    hint: '상담을 신청한 고객에게 문자를 보낼 때 사용될 전화번호입니다.',
    type: 'tel',
    value: '02 1234 5678',
  },
  {
    key: 'eventManager',
    label: '이벤트 관리자 번호',
    hint: '파트너센터에 등록한 이벤트 내용 관련 안내를 받을 담당자의 전화번호입니다.',
    type: 'tel',
    value: '010 2345 6789',
  },
  {
    key: 'marketingEmail',
    label: '마케팅 담당자 이메일',
    hint: '주요 공지사항과 강남언니 활용 도움 안내를 받을 담당자의 이메일입니다.',
    type: 'email',
    value: 'marketing@okdental.co.kr',
  },
];

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 10) return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
}

export default function ContactPage() {
  const [fields, setFields] = useState<ContactField[]>(INITIAL);

  const update = (key: string, value: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.key === key
          ? { ...f, value: f.type === 'tel' ? formatPhone(value) : value }
          : f
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-bold text-gray-900">연락처 정보</h1>
        <button className="px-4 py-2 rounded-lg bg-[#2B313D] text-white text-[13px] font-semibold btn-press">
          저장하기
        </button>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {fields.map((f) => (
          <div key={f.key} className="p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <div className="md:w-[200px] flex-shrink-0">
              <p className="text-[13px] font-semibold text-gray-900">{f.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 flex items-start gap-1 leading-snug">
                <Info size={10} className="mt-0.5 flex-shrink-0 text-gray-400" />
                {f.hint}
              </p>
            </div>
            <input
              type={f.type === 'tel' ? 'tel' : 'email'}
              inputMode={f.type === 'tel' ? 'numeric' : 'email'}
              value={f.value}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.type === 'tel' ? '010 1234 5678' : 'email@example.com'}
              className="flex-1 max-w-md px-0 py-2 bg-transparent text-[14px] border-0 border-b border-gray-200 focus:outline-none focus:border-[#8DC63F] transition-colors"
            />
          </div>
        ))}
      </section>
    </div>
  );
}
