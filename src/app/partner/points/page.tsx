'use client';

import Link from 'next/link';
import { Coins, Info } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';

/**
 * 병원포인트는 광고/CPV 지출용 별도 회계가 필요한 기능입니다.
 * 현재는 placeholder. 추후 hospital_points / hospital_point_transactions
 * 테이블 추가 후 본 페이지에 연결합니다.
 */
export default function PartnerPointsPage() {
  const { authUser } = useSession();
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
  return (
    <div className="space-y-4">
      <h1 className="text-[18px] font-bold text-gray-900">병원포인트</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-[#F4EFFF] rounded-full flex items-center justify-center mx-auto mb-4">
          <Coins size={28} className="text-[#7C3AED]" />
        </div>
        <p className="text-[16px] font-bold text-gray-900 mb-2">병원 포인트 시스템 준비 중</p>
        <p className="text-[12px] text-gray-500 max-w-md mx-auto leading-relaxed">
          광고 노출, 이벤트 송출 등에 사용되는 병원 전용 포인트는 곧 도입됩니다. 결제·정산·세금계산서 발행 흐름까지 묶어서 한 번에 출시할 예정이에요.
        </p>
      </div>

      <div className="bg-[#F4EFFF] rounded-xl p-4 flex items-start gap-2">
        <Info size={14} className="text-[#7C3AED] mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-[#5B2BB5] leading-relaxed">
          포인트 충전이 급하게 필요하시면 contact@kidoctor.com으로 문의 주세요.
        </p>
      </div>
    </div>
  );
}
