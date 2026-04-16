'use client';

import { Info } from 'lucide-react';

export default function AppPayInfoPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">앱결제 이용 정보</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          본원에서 이용 중인 앱결제 서비스 정보를 확인할 수 있습니다.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-[14px] font-bold text-gray-900 mb-3">서비스 이용 정보</h2>
        <dl className="divide-y divide-gray-100">
          <Row label="최초 이용일">2024년 9월 12일</Row>
          <Row label="서비스 상태">
            <span className="inline-block px-2 py-0.5 rounded bg-[#E6F7EB] text-[#15803D] text-[11px] font-bold">
              이용중
            </span>
          </Row>
          <Row label="가입 요금제">표준형</Row>
          <Row label="정산 주기">주 1회 (매주 수요일 지급)</Row>
        </dl>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-[14px] font-bold text-gray-900 mb-3">정산 계좌 정보</h2>
        <dl className="divide-y divide-gray-100">
          <Row label="예금주">오케이치과의원</Row>
          <Row label="은행">신한은행</Row>
          <Row label="계좌번호">110-555-012345</Row>
          <Row label="사업자등록번호">574-17-02394</Row>
        </dl>
        <div className="mt-3 px-3 py-2.5 rounded-lg bg-[#FFF8E1] flex items-start gap-1.5">
          <Info size={12} className="text-[#B45309] mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-[#B45309] leading-snug">
            정산 계좌 변경을 희망하시는 경우, 파트너 고객센터로 문의해 주시면 수정 가능합니다.
          </p>
        </div>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center py-3 gap-4">
      <dt className="w-32 text-[12px] text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="flex-1 text-[13px] text-gray-900">{children}</dd>
    </div>
  );
}
