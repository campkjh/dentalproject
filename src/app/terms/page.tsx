'use client';

import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import { ChevronRight, FileText } from 'lucide-react';

const termsList = [
  { id: 'privacy', title: '개인정보 수집 및 이용약관' },
  { id: 'service', title: '서비스 이용약관' },
  { id: 'thirdparty', title: '개인정보 제 3자 제공 동의' },
  { id: 'refund', title: '환불규정에 대한 약관' },
  { id: 'withdrawal', title: '회원탈퇴 문의' },
  { id: 'meta', title: 'META서비스 이용방침' },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white page-enter">
      <TopBar title="" />

      <div className="px-4 pt-2 pb-4 lg:max-w-3xl lg:mx-auto">
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
          <FileText size={24} className="text-gray-500" />
        </div>
        <h1 className="text-xl font-bold mb-6">모든 이용약관 및 정보</h1>
      </div>

      <div className="divide-y divide-gray-100 lg:max-w-3xl lg:mx-auto">
        {termsList.map((term) => (
          <Link
            key={term.id}
            href={`/terms/${term.id}`}
            className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">{term.title}</span>
            <ChevronRight size={16} className="text-gray-300" />
          </Link>
        ))}
      </div>

      {/* Company Info */}
      <div className="mt-8 px-4 py-6 border-t border-gray-100 lg:max-w-3xl lg:mx-auto">
        <div className="space-y-1.5 text-xs text-gray-400">
          <p>(주)00000은 통신판매중개자로서 통신판매의 당사자가 아니며 개별 판매자가 제공하는 서비스에 대한 이행, 계약사항 등과 관련한 의무와 책임은 거래 당사자에게 있습니다.</p>
          <p className="mt-2">통신판매업신고번호 : 제 2025-서울송파-0000호</p>
          <p>(주)0000 | 우 00000</p>
          <p>주소 서울특별시 금천구 가산디지털1로 225, 11층 1123-에이-2호(가산동, 에이스 가산 포휴)</p>
          <p>T 070-000-0000 | E ceo@sample.com</p>
          <p>대표자 000 | 사업자 등록 번호 000-00-00000</p>
          <p>Copyright(c) 000. All right reserved.</p>
        </div>
      </div>
    </div>
  );
}
