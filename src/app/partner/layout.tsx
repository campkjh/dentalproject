'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
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

  // sessionLoading이 막 false가 된 직후의 첫 렌더에서 Zustand isDoctor가
  // 아직 갱신되지 않을 수 있어 300ms 유예 후 리다이렉트
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);

    if (isLoginPage || sessionLoading) return;
    if (!authUser) {
      router.replace('/partner/login');
      return;
    }
    if (authUser && isDoctor === false) {
      redirectTimerRef.current = setTimeout(() => {
        // 유예 후에도 여전히 non-doctor이면 리다이렉트
        if (!useStore.getState().isDoctor) {
          router.replace('/');
        }
      }, 400);
    }
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
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
