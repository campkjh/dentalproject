'use client';

import Link from 'next/link';
import { useStore } from '@/store';
import { HeaderBellIcon, HeaderSearchIcon } from '@/components/icons/HeaderIcons';

// 모바일 홈 헤더 — 프리티풀 홈 헤더 그대로(줄 높이 42 · 로고 24 · 오른쪽 종(안 읽은 알림 빨간 점)·돋보기 44칸 붙여서).
//  hidden = 스크롤해서 검색 줄로 바뀐 상태 — 높이는 그대로 두고 흐려지며 위로 빠진다(높이가 바뀌면 화면이 밀려 떨린다).
export default function MobileHomeHeader({ hidden }: { hidden: boolean }) {
  const unread = useStore(s => s.meHydrated && s.notifications.some(n => !n.isRead));
  return (
    <div
      className="absolute inset-x-0 top-0 flex h-16 items-center px-[10px] transition-[opacity,transform] duration-300"
      style={{ opacity: hidden ? 0 : 1, transform: hidden ? 'translateY(-8px)' : 'none', pointerEvents: hidden ? 'none' : 'auto' }}
      aria-hidden={hidden}
    >
      <div className="flex h-[42px] w-full items-center">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 pl-1.5 text-[21px] font-bold text-[#191F28]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/brand-logo.png" alt="" className="h-[26px] w-[26px] object-contain" />
          마이닥
        </Link>
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
