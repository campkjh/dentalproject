'use client';

import { Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

const consumerNav: NavItem[] = [
  { href: '/', label: '홈', icon: '/icons/nav-home.svg' },
  { href: '/search', label: '검색', icon: '/icons/nav-search.svg' },
  { href: '/reservations', label: '예약내역', icon: '/icons/nav-reservation.svg', badge: 10 },
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!allowedPaths.includes(pathname)) return null;
  if (!mounted) return null;

  return createPortal(
    <nav
      style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, height: 82, width: '100%', maxWidth: 430 }}
      className="bg-white border-t border-gray-100 lg:hidden"
    >
      <div className="flex items-center justify-around h-full">
        {consumerNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1 transition-all duration-200 ${
                isActive ? 'text-[#2B313D]' : 'text-[#A4ABBA]'
              }`}
            >
              <div className="relative">
                <img
                  src={item.icon}
                  alt={item.label}
                  className="w-[26px] h-[26px]"
                  style={{
                    filter: isActive
                      ? 'brightness(0) saturate(100%) invert(14%) sepia(10%) saturate(1200%) hue-rotate(180deg) brightness(95%) contrast(90%)'
                      : 'brightness(0) saturate(100%) invert(75%) sepia(5%) saturate(500%) hue-rotate(190deg) brightness(90%) contrast(90%)',
                  }}
                />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#7C3AED] text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-medium">
                    {item.badge}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>,
    document.body
  );
}
