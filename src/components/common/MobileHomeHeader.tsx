'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useStore } from '@/store';
import { HeaderBellIcon, HeaderSearchIcon } from '@/components/icons/HeaderIcons';

// 모바일 홈 헤더 — 프리티풀 홈 헤더 그대로(줄 높이 42 · 오른쪽 종(안 읽은 알림 빨간 점)·돋보기 44칸 붙여서).
//  왼쪽 = 바탕 없는 로고 마크(32) + 지금 지역 '서초구 ⌄'(누르면 지역 메뉴 — 홈이 그 지역 병원으로 걸러진다, 261101).
//  hidden = 스크롤해서 검색 줄로 바뀐 상태 — 높이는 그대로 두고 흐려지며 위로 빠진다(높이가 바뀌면 화면이 밀려 떨린다).
export default function MobileHomeHeader({
  hidden,
  areaLabel,
  areaOpen,
  onAreaClick,
}: {
  hidden: boolean;
  areaLabel: string;
  areaOpen: boolean;
  onAreaClick: (el: HTMLElement) => void;
}) {
  const unread = useStore(s => s.meHydrated && s.notifications.some(n => !n.isRead));
  return (
    <div
      className="absolute inset-x-0 top-0 flex h-16 items-center px-[10px] transition-[opacity,transform] duration-300"
      style={{ opacity: hidden ? 0 : 1, transform: hidden ? 'translateY(-8px)' : 'none', pointerEvents: hidden ? 'none' : 'auto' }}
      aria-hidden={hidden}
    >
      <div className="flex h-[42px] w-full items-center">
        <Link href="/" aria-label="마이닥 홈" className="flex h-[42px] w-10 shrink-0 items-center justify-center transition-transform active:scale-90">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/brand-logo-mark.png" alt="" className="h-8 w-8 object-contain" />
        </Link>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={areaOpen}
          aria-label={`지역 바꾸기 (지금 ${areaLabel})`}
          onClick={(e) => onAreaClick(e.currentTarget)}
          className="ml-0.5 flex h-[42px] min-w-0 items-center gap-0.5 rounded-[12px] px-1.5 text-[20px] font-bold tracking-[-0.4px] text-[#191F28] transition-all active:scale-[0.97] active:bg-black/[0.04]"
        >
          <span className="truncate">{areaLabel}</span>
          <ChevronDown size={20} strokeWidth={2.4} className={`shrink-0 text-[#4E5968] transition-transform duration-200 ${areaOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className="ml-auto flex items-center">
          <button
            type="button"
            aria-label={unread ? '알림 (안 읽은 알림 있음)' : '알림'}
            className="flex h-[42px] w-11 items-center justify-center transition-transform duration-150 active:scale-90"
            onClick={() => window.dispatchEvent(new CustomEvent('dental:notifications'))}
          >
            <HeaderBellIcon dot={unread} />
          </button>
          <Link href="/search" aria-label="검색" className="flex h-[42px] w-11 items-center justify-center transition-transform duration-150 active:scale-90">
            <HeaderSearchIcon />
          </Link>
        </div>
      </div>
    </div>
  );
}
