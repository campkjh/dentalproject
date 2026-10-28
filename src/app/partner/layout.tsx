'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import appStyles from '@/components/common/app-ui.module.css';
import { CommunityTabIcon, HomeTabIcon, HospitalTabIcon, MyTabIcon, ReservationTabIcon, TabBarNav } from '@/components/common/BottomNav';

// 의사 화면 하단 탭 — 고객 화면과 같은 프리티풀 흰 탭 바(TabBarNav)·같은 선 아이콘. 확인 기다리는 예약 = 예약관리 빨간 점
const BOTTOM_NAV = [
  { label: '홈', href: '/partner', Icon: HomeTabIcon, match: ['/partner'] },
  { label: '예약관리', href: '/partner/reservations', Icon: ReservationTabIcon, match: ['/partner/reservations'] },
  { label: '병원관리', href: '/partner/hospital-info', Icon: HospitalTabIcon, match: ['/partner/hospital-info', '/partner/doctors', '/partner/reviews', '/partner/contact'] },
  { label: '커뮤니티', href: '/partner/community', Icon: CommunityTabIcon, match: ['/partner/community'] },
  { label: '마이', href: '/partner/account', Icon: MyTabIcon, match: ['/partner/account'] },
] as const;

const MANAGEMENT_TABS = [
  { label: '병원', href: '/partner/hospital-info' },
  { label: '멤버', href: '/partner/doctors' },
  { label: '리뷰', href: '/partner/reviews' },
] as const;

// Routes that require an approved hospital. /partner/account stays open so users can manage their profile / sign out.
const GATED_ROUTE_PREFIXES = [
  '/partner',
  '/partner/hospital-info',
  '/partner/doctors',
  '/partner/reviews',
  '/partner/reservations',
  '/partner/community',
  '/partner/contact',
  '/partner/events',
  '/partner/notices',
  '/partner/performance',
  '/partner/points',
  '/partner/ads',
  '/partner/consults',
  '/partner/budget',
  '/partner/chat',
  '/partner/app-pay',
];

function isGatedRoute(pathname: string) {
  if (pathname === '/partner/account' || pathname.startsWith('/partner/account/')) return false;
  return GATED_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

type HospitalLite = { status?: string | null; name?: string | null };
type ReservationLite = { status?: string | null };

function ApprovalPendingScreen({ status, hospitalName }: { status: string | null | undefined; hospitalName?: string | null }) {
  const router = useRouter();
  const title =
    status === 'rejected'
      ? '병원 등록이 반려되었어요'
      : status === 'suspended'
      ? '병원 운영이 일시정지 되었어요'
      : '병원 승인을 기다리고 있어요';
  const desc =
    status === 'rejected'
      ? '관리자가 신청 내용을 확인한 결과 일부 보완이 필요합니다. 고객센터로 문의해 주세요.'
      : status === 'suspended'
      ? '운영 정지 상태에서는 병원/상품 정보를 관리할 수 없어요. 자세한 내용은 고객센터로 문의해 주세요.'
      : '제출하신 입점 신청을 관리자가 심사 중이에요. 승인이 완료되면 병원 정보와 상품을 등록·관리할 수 있어요.';

  return (
    <div style={{ padding: '64px 24px 32px', textAlign: 'center' }}>
      <div
        style={{
          width: 88,
          height: 88,
          margin: '0 auto 20px',
          borderRadius: 24,
          background: 'rgba(51,60,74,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#333C4A" strokeWidth="1.6" />
          <path d="M12 7v6l3.5 2" stroke="#333C4A" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#191F28', margin: '0 0 8px' }}>{title}</h2>
      {hospitalName && (
        <p style={{ fontSize: 14, color: '#8B95A1', margin: '0 0 14px' }}>{hospitalName}</p>
      )}
      <p style={{ fontSize: 15, lineHeight: 1.55, color: '#4E5968', margin: '0 0 28px' }}>
        {desc}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '0 auto' }}>
        <button
          onClick={() => router.push('/partner/account')}
          style={{
            height: 52,
            borderRadius: 12,
            background: '#333C4A',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          내 계정 보기
        </button>
        <button
          onClick={() => router.push('/')}
          style={{
            height: 52,
            borderRadius: 12,
            background: 'rgba(7,25,76,0.05)',
            color: '#4E5968',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          서비스 홈으로
        </button>
      </div>
    </div>
  );
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authUser, loading: sessionLoading } = useSession();
  const isDoctor = useStore((s) => s.isDoctor);
  const showAlert = useStore((s) => s.showAlert);
  const isLoginPage = pathname === '/partner/login';

  const { data: hospitalData } = useMyHospitalData<HospitalLite, ReservationLite>(authUser?.id, { enabled: !isLoginPage && !!authUser });
  const hospital = hospitalData?.hospital ?? null;
  const status = hospital?.status ?? null;
  const isApproved = status === 'approved';
  const pendingReservation = (hospitalData?.reservations ?? []).some((r) => r.status === 'pending');

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
        <div className="partner-phone-shell" />
      </div>
    );
  }

  if (!isDoctor) return null;

  // 3단계 이상 경로 (상세/수정 페이지)에서는 네비바 숨김
  // 예: /partner/doctors/[id], /partner/community/[id], /partner/reservations/[id]
  const pathDepth = pathname.split('/').filter(Boolean).length;
  const hideNav = pathDepth >= 3;
  const routeTransitionClass = hideNav ? ' partner-route-detail-enter' : '';
  const showManagementHeader = !hideNav && MANAGEMENT_TABS.some((tab) => pathname === tab.href);

  const isActive = (item: (typeof BOTTOM_NAV)[number]) => {
    if (item.href === '/partner') return pathname === '/partner';
    return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  };

  const pendingMessage =
    status === 'rejected'
      ? '병원 등록이 반려되었습니다. 고객센터로 문의해 주세요.'
      : status === 'suspended'
      ? '운영이 일시정지된 상태에서는 사용할 수 없어요.'
      : '병원 승인 후 사용할 수 있어요.';

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, item: (typeof BOTTOM_NAV)[number]) => {
    if (isApproved || !hospitalData) return;
    if (item.href === '/partner/account') return;
    e.preventDefault();
    showAlert('승인 대기 중', pendingMessage);
  };

  // 병원 정보를 받기 전엔 막지 않는다 — 받기 전에 막으면 의사 화면으로 바꾸자마자 '승인 기다리는 중'이 번쩍 보였다
  const gated = Boolean(hospitalData) && !isApproved && isGatedRoute(pathname);

  return (
    <div className={`partner-shell-bg ${appStyles.partnerShell}`}>
      <div className="partner-phone-shell" style={hideNav ? { overflowX: 'visible' } : undefined}>
        {showManagementHeader && !gated && (
          <header className="pd-tabhead">
            <h1>병원관리</h1>
            <nav className="pd-seg" aria-label="병원관리 탭" style={{ ['--n' as string]: MANAGEMENT_TABS.length, ['--i' as string]: Math.max(0, MANAGEMENT_TABS.findIndex((tab) => tab.href === pathname)) }}>
              <span className="pd-seg-thumb" aria-hidden />
              {MANAGEMENT_TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={pathname === tab.href ? 'is-active' : undefined}
                  aria-current={pathname === tab.href ? 'page' : undefined}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          </header>
        )}
        <main className={`partner-app-main${showManagementHeader && !gated ? ' has-tabhead' : ''}`} style={hideNav ? { paddingBottom: 0 } : undefined}>
          <div key={pathname} className={`partner-page${routeTransitionClass}`}>
            {gated ? (
              <ApprovalPendingScreen status={status} hospitalName={hospital?.name ?? null} />
            ) : (
              children
            )}
          </div>
        </main>
        {!hideNav && (
          <TabBarNav
            label="파트너 하단 메뉴"
            items={BOTTOM_NAV.map((item) => ({
              href: item.href,
              label: item.label,
              Icon: item.Icon,
              active: isActive(item),
              dot: item.href === '/partner/reservations' && pendingReservation,
              onPress: (e) => handleNavClick(e, item),
            }))}
          />
        )}
      </div>
    </div>
  );
}
