'use client';

import Link from 'next/link';
import { ArrowRight, ChevronLeft, CheckCircle2 } from 'lucide-react';

const BENEFITS = [
  { icon: '📣', title: '이벤트 노출', desc: '앱 홈·카테고리·검색 결과에 병원 이벤트 우선 노출' },
  { icon: '📊', title: '실시간 성과 분석', desc: '노출·클릭·상담·매출 지표를 한눈에 확인' },
  { icon: '💬', title: '1:1 채팅 상담', desc: '고객과 실시간 채팅으로 상담 진행 및 예약 확정' },
  { icon: '💳', title: '앱결제·정산 자동화', desc: '앱 내 결제 및 주간 정산을 자동 처리' },
];

const STEPS = [
  { n: 1, title: '병원 신청', desc: '의료기관 개설신고증 기반 병원 정보 등록' },
  { n: 2, title: '서류 제출', desc: '사업자등록증·면허증·전문의 자격증 첨부' },
  { n: 3, title: '심사 완료', desc: '1~2영업일 내 검수 후 계정 발급' },
];

export default function PartnerSignupPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] p-4 py-8">
      <div className="max-w-[640px] mx-auto">
        <Link
          href="/partner/login"
          className="inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-900 mb-4"
        >
          <ChevronLeft size={14} /> 로그인
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 partner-page shadow-[0_10px_40px_rgba(124,58,237,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white text-[14px] font-black">
              K
            </div>
            <span className="text-[15px] font-bold text-gray-900">키닥터 파트너센터</span>
          </div>

          <h1 className="text-[22px] font-bold text-gray-900 mt-3">
            병원 파트너로 시작해보세요
          </h1>
          <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
            의료기관 개설신고증을 가진 병원은 누구나 신청 가능합니다.
            <br />
            신청 후 영업일 기준 1~2일 내 심사가 완료됩니다.
          </p>

          <div className="grid grid-cols-2 gap-2 mt-5">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl border border-gray-200 p-3 hover:border-[#7C3AED] transition-colors">
                <div className="text-[22px] mb-1">{b.icon}</div>
                <p className="text-[13px] font-bold text-gray-900">{b.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{b.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <p className="text-[13px] font-bold text-gray-900 mb-3">신청 절차</p>
            <ol className="space-y-2">
              {STEPS.map((s, i) => (
                <li key={s.n} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#F4EFFF] text-[#7C3AED] flex items-center justify-center text-[12px] font-bold">
                    {s.n}
                  </span>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-gray-900">{s.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ArrowRight size={13} className="text-gray-300 mt-2 hidden sm:inline" />
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 rounded-xl bg-[#F4EFFF] px-4 py-3 flex items-start gap-2">
            <CheckCircle2 size={14} className="text-[#7C3AED] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#7C3AED] leading-relaxed">
              가입비·월 고정비 없음 · 사용한 만큼만 포인트 차감 · 언제든 해지 가능
            </p>
          </div>

          <Link
            href="/hospital/register"
            className="mt-5 flex items-center justify-center gap-1.5 w-full py-3.5 rounded-lg bg-[#7C3AED] text-white text-[14px] font-bold btn-press"
            style={{ boxShadow: '0 6px 16px rgba(124, 58, 237, 0.3)' }}
          >
            병원 신청 시작하기 <ArrowRight size={15} />
          </Link>

          <p className="mt-4 text-[11px] text-gray-400 text-center">
            이미 파트너 계정이 있으신가요?{' '}
            <Link href="/partner/login" className="text-[#7C3AED] font-semibold">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
