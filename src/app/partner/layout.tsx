'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';

const BOTTOM_NAV = [
  { label: '홈', href: '/partner', asset: 'home', match: ['/partner'] },
  { label: '병원관리', href: '/partner/hospital-info', asset: 'hospital', match: ['/partner/hospital-info', '/partner/doctors', '/partner/reviews', '/partner/contact'] },
  { label: '예약관리', href: '/partner/reservations', asset: 'reservation', match: ['/partner/reservations'] },
  { label: '커뮤니티', href: '/partner/community', asset: 'community', match: ['/partner/community', '/partner/community/'] },
  { label: '마이홈', href: '/partner/account', asset: 'my', match: ['/partner/account'] },
] as const;

function PartnerNavIcon({ asset }: { asset: (typeof BOTTOM_NAV)[number]['asset'] }) {
  if (asset === 'home') return <img src="/partner-template/nav-home.svg" alt="" />;
  if (asset === 'hospital') return <img src="/partner-template/nav-hospital.svg" alt="" />;
  if (asset === 'reservation') return <img src="/partner-template/nav-reservation.svg" alt="" />;
  if (asset === 'community') {
    return (
      <span className="partner-community-icon" aria-hidden="true">
        <img src="/partner-template/nav-community-a.svg" alt="" />
        <img src="/partner-template/nav-community-b.svg" alt="" />
      </span>
    );
  }
  return <span className="partner-my-icon">My</span>;
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authUser, loading: sessionLoading } = useSession();
  const isDoctor = useStore((s) => s.isDoctor);
  const isLoginPage = pathname === '/partner/login';

  useEffect(() => {
    if (isLoginPage || sessionLoading) return;
    if (!authUser) {
      router.replace('/partner/login');
      return;
    }
    // isDoctor가 아직 확인 안 된 경우 리다이렉트하지 않음 (로딩 중 깜빡임 방지)
    if (authUser && isDoctor === false) {
      router.replace('/');
    }
  }, [authUser, isDoctor, isLoginPage, router, sessionLoading]);

  if (isLoginPage) return <>{children}</>;

  // isDoctor가 null/undefined이면 잠깐 기다림 (세션 확인 중)
  if (sessionLoading || !authUser) {
    return (
      <div className="partner-shell-bg">
        <div className="partner-phone-shell">
          <div className="partner-loading">불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (!isDoctor) return null;

  // 커뮤니티 게시글 상세에서는 네비바 숨김 (댓글 입력창 가림 방지)
  const hideNav = pathname.startsWith('/partner/community/') && pathname !== '/partner/community';

  const isActive = (item: (typeof BOTTOM_NAV)[number]) => {
    if (item.href === '/partner') return pathname === '/partner';
    return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  };

  return (
    <div className="partner-shell-bg">
      <div className="partner-phone-shell" style={hideNav ? { overflowX: 'visible' } : undefined}>
        <main className="partner-app-main" style={hideNav ? { paddingBottom: 0 } : undefined}>
          <div key={pathname} className="partner-page">
            {children}
          </div>
        </main>
        {!hideNav && (
          <nav className="partner-bottom-nav" aria-label="파트너 하단 내비게이션">
            {BOTTOM_NAV.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? 'is-active' : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  <PartnerNavIcon asset={item.asset} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
