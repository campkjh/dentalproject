'use client';

import { Suspense, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const consumerNav: NavItem[] = [
  { href: '/', label: '홈', icon: '/icons/nav-home.svg' },
  { href: '/reservations', label: '예약내역', icon: '/icons/nav-reservation.svg' },
  { href: '/community', label: '커뮤니티', icon: '/icons/nav-community.svg' },
  { href: '/wishlist', label: '찜', icon: '/icons/nav-wishlist.svg' },
  { href: '/mypage', label: '마이홈', icon: '/icons/nav-mypage.svg' },
];

const allowedPaths = ['/', '/reservations', '/community', '/wishlist', '/mypage'];

export default function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  );
}

function BottomNavInner() {
  const pathname = usePathname();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const meHydrated = useStore((s) => s.meHydrated);
  const reservationCount = useStore((s) => s.reservations.length);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!allowedPaths.includes(pathname)) return null;
  if (!mounted) return null;

  return createPortal(
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        height: 'calc(82px + env(safe-area-inset-bottom))',
        width: '100%',
        maxWidth: 500,
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        borderTop: '1px solid #F2F3F5',
        background: 'rgba(255, 255, 255, 0.96)',
        padding: '12px 24px calc(12px + env(safe-area-inset-bottom))',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
      className="lg:hidden"
    >
      {consumerNav.map((item) => {
        const isActive = pathname === item.href;
        const badge =
          item.href === '/reservations' && isLoggedIn && meHydrated ? reservationCount : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-[50px] w-[50px] flex-col items-center justify-center gap-1.5 rounded-[14px] text-[#2B313D] transition-transform active:scale-95"
            style={{ opacity: isActive ? 1 : 0.4 }}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="relative h-[30px] w-[30px] flex-shrink-0">
              <img src={item.icon} alt="" className="h-full w-full" />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-[#8037FF] text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-medium">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span className="whitespace-nowrap text-center text-[12px] font-bold leading-none max-[390px]:text-[10px]">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>,
    document.body
  );
}
