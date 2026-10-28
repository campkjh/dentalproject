'use client';

// 쿠폰 카드 — 티켓 모양. 왼쪽 = 할인값 크게(28) · 이름(16) · 조건(설명 13 회색) · 기한(D-7 안쪽이면 빨강),
// 오른쪽 그루터기 = 사용 가능 여부(토스 아이콘 + 글자). 다 쓴/지난 쿠폰은 회색 면 · 흐린 글자.
import type { Coupon } from '@/types';
import { TossIcon, formatKDay } from './BillingKit';
import s from './coupon.module.css';

const STUB: Record<Coupon['status'], { icon: string; label: string }> = {
  available: { icon: 'gift', label: '사용 가능' },
  used: { icon: 'check-circle', label: '사용 완료' },
  expired: { icon: 'clock', label: '기간 만료' },
};

export default function CouponCard({ coupon }: { coupon: Coupon }) {
  const on = coupon.status === 'available';
  const stub = STUB[coupon.status];
  const soon = on && typeof coupon.daysLeft === 'number' && coupon.daysLeft <= 7;
  const expiry = coupon.expiryDate ? `${formatKDay(coupon.expiryDate)}까지` : '기한 없음';

  return (
    <div className={`${s.ticket} ${on ? '' : s.off}`}>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-5 py-4">
        <p className={`text-[28px] font-bold leading-none tabular-nums tracking-[-0.8px] ${on ? 'text-[#3180F7]' : 'text-[#B0B8C1]'}`}>
          {coupon.discountAmount.toLocaleString()}<span className="ml-0.5 text-[20px]">원</span>
        </p>
        <p className={`mt-2 truncate text-[16px] font-semibold tracking-[-0.3px] ${on ? 'text-[#191F28]' : 'text-[#8B95A1]'}`}>{coupon.name}</p>
        {coupon.description && (
          <p className={`mt-0.5 line-clamp-2 text-[13px] leading-[1.5] ${on ? 'text-[#6B7684]' : 'text-[#B0B8C1]'}`}>{coupon.description}</p>
        )}
        <p className="mt-2 flex items-center gap-1.5 text-[13px] tracking-[-0.2px]">
          <span className={`min-w-0 truncate ${on ? 'text-[#4E5968]' : 'text-[#B0B8C1]'}`}>{expiry}</span>
          {on && typeof coupon.daysLeft === 'number' && (
            <span className={`shrink-0 whitespace-nowrap rounded-[6px] px-1.5 py-px text-[12px] font-bold ${soon ? 'bg-[#FFEEEF] text-[#F04452]' : 'bg-white text-[#3180F7]'}`}>
              {coupon.daysLeft === 0 ? '오늘까지' : `D-${coupon.daysLeft}`}
            </span>
          )}
        </p>
      </div>
      <div className={s.stub}>
        <span style={{ opacity: on ? 1 : 0.45 }}><TossIcon name={stub.icon} size={26} /></span>
        <span className={`text-[12.5px] font-bold tracking-[-0.2px] ${on ? 'text-[#3180F7]' : 'text-[#B0B8C1]'}`}>{stub.label}</span>
      </div>
    </div>
  );
}
