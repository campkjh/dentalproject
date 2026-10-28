'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store';
import { animateNavigationIcon } from '@/lib/ui-motion';
import { PocketIcon } from '@/components/icons/PocketIcon';
import styles from './app-ui.module.css';

// 하단 탭 아이콘 — 프리티풀 하단바 아이콘 그대로(선 1.6 · 고르면 채움). 포켓만 견본 가방(PocketIcon).
type TabIconProps = { active?: boolean };

const HomeTabIcon = ({ active }: TabIconProps) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 10.3L12 4l8 6.3V19a1.6 1.6 0 0 1-1.6 1.6H15v-5a1.2 1.2 0 0 0-1.2-1.2h-3.6A1.2 1.2 0 0 0 9 15.6v5H5.6A1.6 1.6 0 0 1 4 19v-8.7z"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const ReservationTabIcon = ({ active }: TabIconProps) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4.5" y="3.5" width="15" height="17" rx="3" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" />
    <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" stroke={active ? '#fff' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const CommunityTabIcon = ({ active }: TabIconProps) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 4c4.8 0 8.6 3.2 8.6 7.3s-3.8 7.3-8.6 7.3c-.9 0-1.8-.1-2.6-.3L5.2 20.4l.9-3.8C4.4 15.2 3.4 13.4 3.4 11.3 3.4 7.2 7.2 4 12 4z"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const PocketTabIcon = ({ active }: TabIconProps) => <PocketIcon size={26} filled={active} strokeWidth={1.6} />;

const MyTabIcon = ({ active }: TabIconProps) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {active ? (
      <>
        <circle cx="12" cy="8.2" r="4" fill="currentColor" />
        <path d="M4.2 19.6c.6-3.8 3.8-6.3 7.8-6.3s7.2 2.5 7.8 6.3a.8.8 0 0 1-.8.9H5a.8.8 0 0 1-.8-.9z" fill="currentColor" />
      </>
    ) : (
      <>
        <circle cx="12" cy="8.2" r="3.6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 20c.6-3.5 3.5-5.8 7-5.8s6.4 2.3 7 5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    )}
  </svg>
);

const items = [
  { href: '/', label: '홈', Icon: HomeTabIcon },
  { href: '/reservations', label: '예약내역', Icon: ReservationTabIcon },
  { href: '/community', label: '커뮤니티', Icon: CommunityTabIcon },
  { href: '/wishlist', label: '포켓', Icon: PocketTabIcon },
  { href: '/mypage', label: '마이', Icon: MyTabIcon },
];

export default function BottomNav() {
  const path = usePathname();
  const isLoggedIn = useStore(s => s.isLoggedIn);
  const hydrated = useStore(s => s.meHydrated);
  // 안 읽은 표시 = 숫자 대신 빨간 점(프리티풀 하단바) — 확인 기다리는 예약이 있을 때
  const pendingReservation = useStore(s => s.reservations.some(r => r.status === 'pending'));
  const [scrollState, setScrollState] = useState({ path, visible: true });
  const visible = scrollState.path === path ? scrollState.visible : true;
  useEffect(() => {
    let last = window.scrollY;
    const scroll = (event: Event) => {
      const element = event.target instanceof Element ? event.target : null;
      if (element && element.scrollHeight <= element.clientHeight + 10) return;
      const next = element ? element.scrollTop : window.scrollY;
      if (Math.abs(next - last) > 8 || next < 30) { setScrollState({ path, visible: next < 60 || next < last }); last = next; }
    };
    document.addEventListener('scroll', scroll, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', scroll, true);
  }, [path]);
  // 하단 탭이 숨었는지 문서에 표시 — 탭 바로 위에 붙은 고정 영역(포켓 예약하기 등)이 같이 내려가게
  const shown = items.some(item => item.href === path);
  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute('data-nav-hidden', shown && !visible);
    return () => root.removeAttribute('data-nav-hidden');
  }, [shown, visible]);
  if (!shown) return null;
  return <nav aria-label="주요 메뉴" className={`${styles.bottomNav} ${!visible ? styles.navHidden : ''}`}><div className={styles.navPill}>
    {items.map(({ href, label, Icon }) => {
      const active = path === href;
      const dot = href === '/reservations' && isLoggedIn && hydrated && pendingReservation;
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined} onClick={event => {
        if (active) {
          event.preventDefault();
          const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
          window.scrollTo({ top: 0, behavior });
          document.querySelectorAll<HTMLElement>('main, .overflow-y-auto').forEach(element => { if (element.scrollHeight > element.clientHeight) element.scrollTo({ top: 0, behavior }); });
        }
      }} onPointerDown={event => {
        animateNavigationIcon(event.currentTarget);
      }}><span data-tab-icon className={styles.tabIcon}><Icon active={active} />{dot && <span className={styles.dot} aria-label="새 소식" />}</span><span>{label}</span></Link>;
    })}
  </div></nav>;
}
