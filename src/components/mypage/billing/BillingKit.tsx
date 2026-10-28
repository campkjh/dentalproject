'use client';

// 마이 결제·환불 내역 / 포인트 / 쿠폰함 공통 부품 — 프리티풀 마이 '구매·결제내역' 어법.
//  · 머리 = 공통 TopBar(56 머리 줄 + 뒤로, 제목 없이) + 그 아래 큰 제목 줄(24) = 제목 ⌄ 거르기(TitleFilterMenu, 탭 대신).
//  · 빈 화면 = 회색 한 줄이 아니라 토스 아이콘(연회색 동그라미) + 굵은 문구 + 회색 안내 + (있으면) 연파랑 버튼.
import Link from 'next/link';
import type { ReactNode } from 'react';
import TopBar from '@/components/common/TopBar';
import TitleFilterMenu, { type TitleFilterOption } from '@/components/reservations/TitleFilterMenu';

/** 토스 아이콘(public/icons/toss/*.svg) */
export function TossIcon({ name, size = 24 }: { name: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/icons/toss/${name}.svg`} alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0" />;
}

/** 머리 줄(뒤로) + 큰 제목 ⌄ 거르기 + 회색 부제 — 제목은 아래→위 페이드(qd-a-title, 버튼 안쪽 span 에만) */
export function BillingHeader<K extends string>({
  value,
  options,
  onChange,
  sub,
}: {
  value: K;
  options: TitleFilterOption<K>[];
  onChange: (key: K) => void;
  sub?: ReactNode;
}) {
  return (
    <>
      <TopBar />
      <div className="qd-titlewrap">
        <TitleFilterMenu<K> value={value} options={options} onChange={onChange} titleClassName="text-[24px]" enterClassName="qd-a-title" />
        {sub && <p className="qd-sub qd-a-sub">{sub}</p>}
      </div>
    </>
  );
}

/** 빈 화면 — 아이콘 + 문구 + 안내 + 버튼 */
export function BillingEmpty({
  icon,
  title,
  desc,
  cta,
}: {
  icon: string;
  title: string;
  desc?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center px-6 pb-16 pt-14 text-center">
      <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#F2F4F6]">
        <TossIcon name={icon} size={36} />
      </span>
      <p className="mt-4 text-[17px] font-bold tracking-[-0.4px] text-[#191F28]">{title}</p>
      {desc && <p className="mt-1.5 text-[14px] leading-[1.6] tracking-[-0.2px] text-[#8B95A1]">{desc}</p>}
      {cta && (
        // 프리티풀 빈 화면 버튼 — 연파랑 면 · 파랑 굵은 글자
        <Link
          href={cta.href}
          className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold tracking-[-0.3px] text-[#3180F7] transition active:scale-[0.97] active:bg-[#DCEBFF]"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** toLocaleString('ko-KR') 값('2026. 10. 28. 오후 3:00:00') → '2026.10.28 (수)' · withTime 이면 ' 오후 3:00' 까지. 모양이 다르면 그대로 */
export function formatKDay(value?: string | null, withTime = false) {
  const raw = (value || '').trim();
  if (!raw) return '';
  const m = raw.match(/(\d{4})[.-]\s*(\d{1,2})[.-]\s*(\d{1,2})\.?(?:\s*(오전|오후)\s*(\d{1,2}):(\d{2}))?/);
  if (!m) return raw;
  const [, y, mo, d, ampm, h, mi] = m;
  const day = new Date(Number(y), Number(mo) - 1, Number(d)).getDay();
  const date = `${y}.${mo.padStart(2, '0')}.${d.padStart(2, '0')} (${WEEKDAYS[day]})`;
  return withTime && ampm ? `${date} ${ampm} ${Number(h)}:${mi}` : date;
}

/** 날짜 → '2026년 10월'(달 묶음 제목). 모양이 다르면 '' */
export function monthKey(value?: string | null) {
  const m = (value || '').match(/(\d{4})[.-]\s*(\d{1,2})/);
  return m ? `${m[1]}년 ${Number(m[2])}월` : '';
}
