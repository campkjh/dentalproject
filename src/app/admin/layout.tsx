'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';
import {
  Home,
  Users,
  Building2,
  Package,
  CalendarDays,
  MessageSquare,
  CreditCard,
  Bell,
  Settings,
  Ticket,
  Menu,
  X,
  LayoutGrid,
  Images,
  Megaphone,
  Star,
  FileText,
  ExternalLink,
} from 'lucide-react';
import './admin.css';

/* ─────────────────────────────────────────────────────────────
 * 어드민 껍데기 — 프리티풀 어드민 2.0 톤앤매너(토스 결) 그대로.
 *  · 왼쪽 흰 사이드바(로고·메뉴·내 계정) + 회색 바탕(#F2F4F6) 본문(흰 카드).
 *  · 고른 메뉴 = 연한 파랑 알약이 메뉴 사이를 스르르 옮겨 다닌다. 아이콘은 회색, 고른 것만 파랑.
 *  · 페이지 머리(큰 제목 26 · 설명 · 제목 탭)는 여기서 그린다 — 페이지는 본문만, 오른쪽 버튼은 PageHeader 가 #adm-head-act 로 보낸다.
 *  · 본문을 내리면 머리 아래 그라데이션 + 데스크톱 머리에 작은 제목이 올라온다.
 * ──────────────────────────────────────────────────────────── */

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  exact?: boolean;
  /** 이 메뉴로 칠 다른 주소들(통합 메뉴) */
  paths?: string[];
  /** 페이지 머리 설명 */
  desc: string;
};
type Group = { name?: string; items: Item[] };

const NAV: Group[] = [
  {
    items: [{ href: '/admin', label: '대시보드', icon: Home, exact: true, desc: '' }],
  },
  {
    name: '운영',
    items: [
      { href: '/admin/users', label: '회원 관리', icon: Users, desc: '가입한 회원을 조회하고 정지·탈퇴 처리를 할 수 있어요' },
      { href: '/admin/hospitals', label: '병원 관리', icon: Building2, desc: '등록된 병원을 조회하고 승인·정지 처리를 할 수 있어요' },
      { href: '/admin/products', label: '상품 관리', icon: Package, desc: '병원이 등록한 상품을 승인하고 노출 상태를 관리해요' },
      { href: '/admin/reservations', label: '예약 관리', icon: CalendarDays, desc: '앱에서 들어온 예약을 조회하고 확정·취소 처리해요' },
    ],
  },
  {
    name: '콘텐츠',
    items: [
      { href: '/admin/banners', label: '홈 배너', icon: Images, desc: '고객 홈 상단 슬라이드 배너를 추가·수정·삭제해요' },
      { href: '/admin/search-promo', label: '검색 추천 상품', icon: Megaphone, desc: '검색 화면 "인기검색어" 위 "추천(AD)" 자리에 노출할 상품을 골라요' },
      { href: '/admin/categories', label: '카테고리', icon: LayoutGrid, desc: '검색·상품 분류에 쓰는 카테고리를 관리해요' },
      { href: '/admin/community', label: '커뮤니티', icon: MessageSquare, paths: ['/admin/community'], desc: '게시글과 신고를 살피고 처리해요' },
      { href: '/admin/reviews', label: '리뷰 관리', icon: Star, desc: '부적절한 리뷰를 숨기거나 삭제해요' },
    ],
  },
  {
    name: '정산',
    items: [
      { href: '/admin/payments', label: '매출/결제', icon: CreditCard, desc: '결제 내역과 매출 추이를 확인하고 환불 처리해요' },
      { href: '/admin/coupons', label: '쿠폰/포인트', icon: Ticket, desc: '회원에게 발급된 쿠폰과 포인트 적립·사용 내역을 관리해요' },
    ],
  },
  {
    name: '시스템',
    items: [
      { href: '/admin/notifications', label: '알림/공지', icon: Bell, desc: '앱 공지사항을 쓰고 푸시 알림을 보내요' },
      { href: '/admin/terms', label: '약관 관리', icon: FileText, desc: '약관 본문을 고쳐요 — 저장하면 바로 사용자 화면에 반영돼요' },
      { href: '/admin/settings', label: '설정', icon: Settings, desc: '플랫폼 기본 정보와 관리자 권한, 정산 정책을 관리해요' },
    ],
  },
];

/** 한 메뉴 안의 탭 = 제목 탭(큰 제목 글씨가 탭, 고른 것 검정 · 나머지 #C4CAD1) */
const TITLE_TABS: { href: string; label: string }[][] = [
  [
    { href: '/admin/community', label: '게시글' },
    { href: '/admin/community/reports', label: '신고' },
  ],
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

function matchItem(item: Item, pathname: string) {
  if (item.exact) return pathname === item.href;
  return (item.paths || [item.href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function SideNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const wrap = useRef<HTMLElement>(null);
  const activeHref = ALL_ITEMS.find((it) => matchItem(it, pathname))?.href || '';
  const [pill, setPill] = useState<{ y: number; h: number } | null>(null);
  // 고른 메뉴 알약 — 메뉴 사이를 스르르(처음 그릴 땐 제자리에 바로)
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-href="${activeHref}"]`);
    setPill(el ? { y: el.offsetTop, h: el.offsetHeight } : null);
  }, [activeHref]);
  useEffect(() => { if (pill) first.current = false; }, [pill]);
  return (
    <nav ref={wrap} className="adm-nav" aria-label="관리자 메뉴">
      {pill && (
        <span
          className="adm-nav-pill"
          aria-hidden
          style={{ transform: `translateY(${pill.y}px)`, height: pill.h, transition: first.current ? 'none' : undefined }}
        />
      )}
      {NAV.map((group, gi) => (
        <div key={group.name || gi} className="adm-nav-sec">
          {group.name && <p className="adm-nav-label">{group.name}</p>}
          {group.items.map((item) => {
            const on = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-href={item.href}
                onClick={onNavigate}
                className={`adm-nav-item ${on ? 'on' : ''}`}
                aria-current={on ? 'page' : undefined}
              >
                <Icon size={22} strokeWidth={2} className="adm-nav-ic" />
                <span className="adm-nav-text">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useSession();
  const showConfirm = useStore((s) => s.showConfirm);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    showConfirm(
      '로그아웃',
      '관리자 계정에서 로그아웃하시겠습니까?',
      async () => {
        await signOut();
        router.replace('/login');
      },
      { confirmText: '로그아웃', cancelText: '취소' }
    );
  };

  // 페이지 머리 — 제목·설명·제목 탭
  const head = useMemo(() => {
    const item = ALL_ITEMS.find((it) => matchItem(it, pathname));
    const tabs = TITLE_TABS.find((g) => g.some((t) => pathname === t.href)) || null;
    return {
      title: (tabs && tabs.find((t) => t.href === pathname)?.label) || item?.label || '관리자',
      desc: item?.desc || '',
      tabs,
      home: pathname === '/admin',
    };
  }, [pathname]);

  // 본문을 내리면 '떠 있는 머리' — data-scrolled(그라데이션) · data-titled(큰 제목이 가려지면 작은 제목).
  // 스크롤마다 다시 그리지 않게 상태 대신 .adm-body 속성만 바꾼다(바뀔 때만).
  const mainRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const syncScrolled = useCallback(() => {
    const main = mainRef.current;
    const body = bodyRef.current;
    if (!main || !body) return;
    const scrolled = main.scrollTop > 1;
    const big = main.querySelector<HTMLElement>('.adm-title, .adm-title-tabs, .adm-hello-title');
    const titled = scrolled && (!big || big.getBoundingClientRect().bottom <= main.getBoundingClientRect().top + 6);
    if (body.hasAttribute('data-scrolled') !== scrolled) body.toggleAttribute('data-scrolled', scrolled);
    if (body.hasAttribute('data-titled') !== titled) body.toggleAttribute('data-titled', titled);
  }, []);

  // 메뉴를 옮기면 서랍 닫고 본문은 맨 위부터(본문이 자체 스크롤이라 브라우저가 안 올려 준다)
  useEffect(() => {
    setMobileOpen(false);
    if (mainRef.current) mainRef.current.scrollTop = 0;
    syncScrolled();
  }, [pathname, syncScrolled]);

  const bell = (
    <Link href="/admin/notifications" className="adm-ubtn" aria-label="공지/알림 관리" title="공지/알림 관리">
      <Bell size={22} strokeWidth={2} />
    </Link>
  );

  const brand = (
    <Link href="/admin" className="adm-brand" aria-label="마이닥 관리자 홈">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/brand-logo.svg" alt="" className="adm-brand-logo" />
      <span className="adm-brand-name">마이닥</span>
      <span className="adm-brand-tag">관리자</span>
    </Link>
  );

  const sidebarBody = (onNavigate?: () => void) => (
    <>
      <SideNav pathname={pathname} onNavigate={onNavigate} />
      <div className="adm-side-foot">
        <Link href="/" onClick={onNavigate} className="adm-nav-item">
          <ExternalLink size={22} strokeWidth={2} className="adm-nav-ic" />
          <span className="adm-nav-text">서비스 홈</span>
        </Link>
        <div className="adm-account">
          <span className="adm-avatar">A</span>
          <span className="adm-account-name">관리자</span>
          <button type="button" onClick={handleLogout} className="adm-account-out">로그아웃</button>
        </div>
      </div>
    </>
  );

  return (
    <div className="admin-shell adm-shell">
      <aside className="adm-side">
        <div className="adm-side-top">{brand}</div>
        <div className="adm-side-scroll">{sidebarBody()}</div>
      </aside>

      <div ref={bodyRef} className="adm-body">
        {/* 모바일 머리 — 로고 + 종 + 메뉴(바탕 = 본문 바탕색) */}
        <header className="adm-mtop">
          {brand}
          <div className="flex items-center">
            {bell}
            <button type="button" onClick={() => setMobileOpen(true)} className="adm-mtop-btn" aria-label="관리자 메뉴 열기">
              <Menu size={22} />
            </button>
          </div>
        </header>

        {/* 데스크톱 머리 — 본문 위 한 줄(스크롤 밖). 내리면 그라데이션 + 작은 제목이 올라온다 */}
        <header className="adm-dtop">
          <div className="adm-dtop-in">
            <p className="adm-dtop-title" aria-hidden="true">{head.home ? '대시보드' : head.title}</p>
            <div className="adm-dtop-act">{bell}</div>
          </div>
        </header>

        <main ref={mainRef} className="adm-main" onScroll={syncScrolled}>
          <div className="adm-frame">
            {/* 머리 — 대시보드는 화면이 인사 줄을 직접 그린다(오른쪽 버튼 칸은 같이 쓴다) */}
            <div className="adm-head" style={head.home ? { marginBottom: 0 } : undefined}>
              {!head.home && (
                <div className="adm-head-text" key={head.tabs ? head.tabs[0].href : head.title}>
                  {head.tabs ? (
                    <div className="adm-title-tabs" role="tablist">
                      {head.tabs.map((t) => {
                        const on = t.href === pathname;
                        return (
                          <Link
                            key={t.href}
                            href={t.href}
                            role="tab"
                            aria-selected={on}
                            className={`adm-title-tab ${on ? 'on' : ''}`}
                          >
                            {t.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <h1 className="adm-title">{head.title}</h1>
                  )}
                  {head.desc && <p className="adm-desc">{head.desc}</p>}
                </div>
              )}
              {/* 화면 버튼 자리 — PageHeader(right)가 포털로 채운다. 화면이 바뀔 때 비워지게 key */}
              <div id="adm-head-act" className="adm-head-act" key={`act-${pathname}`} />
            </div>
            <div className="adm-content" key={pathname}>{children}</div>
          </div>
        </main>
      </div>

      {mobileOpen && (
        <div className="adm-drawer-wrap" role="dialog" aria-modal="true" aria-label="관리자 메뉴">
          <div className="adm-drawer-dim" onClick={() => setMobileOpen(false)} />
          <aside className="adm-drawer">
            <div className="adm-side-top">
              {brand}
              <button type="button" onClick={() => setMobileOpen(false)} className="adm-mtop-btn" aria-label="관리자 메뉴 닫기">
                <X size={22} />
              </button>
            </div>
            <div className="adm-side-scroll">{sidebarBody(() => setMobileOpen(false))}</div>
          </aside>
        </div>
      )}
    </div>
  );
}
