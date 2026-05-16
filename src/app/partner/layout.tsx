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
  { label: '커뮤니티', href: '/community', asset: 'community', match: ['/community'] },
  { label: '마이홈', href: '/partner/account', asset: 'my', match: ['/partner/account'] },
] as const;

function PartnerStatusBar() {
  return (
    <div className="partner-status-bar" aria-hidden="true">
      <span>9:41</span>
      <img src="/partner-template/status-right.svg" alt="" />
    </div>
  );
}

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
    if (!isDoctor) router.replace('/');
  }, [authUser, isDoctor, isLoginPage, router, sessionLoading]);

  if (isLoginPage) return <>{children}</>;

  if (sessionLoading || !authUser || !isDoctor) {
    return (
      <div className="partner-shell-bg">
        <div className="partner-phone-shell">
          <PartnerStatusBar />
          <div className="partner-loading">불러오는 중...</div>
        </div>
      </div>
    );
  }

  const isActive = (item: (typeof BOTTOM_NAV)[number]) => {
    if (item.href === '/partner') return pathname === '/partner';
    return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  };

  return (
    <div className="partner-shell-bg">
      <div className="partner-phone-shell">
        <PartnerStatusBar />
        <main className="partner-app-main">
          <div key={pathname} className="partner-page">
            {children}
          </div>
        </main>
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
      </div>
    </div>
  );
}
