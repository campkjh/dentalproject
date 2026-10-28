'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Heart, House, MessageCircle, UserRound } from 'lucide-react';
import { useStore } from '@/store';
import { animateNavigationIcon } from '@/lib/ui-motion';
import styles from './app-ui.module.css';

const items = [
  { href: '/', label: '홈', Icon: House },
  { href: '/reservations', label: '예약내역', Icon: CalendarDays },
  { href: '/community', label: '커뮤니티', Icon: MessageCircle },
  { href: '/wishlist', label: '찜', Icon: Heart },
  { href: '/mypage', label: '마이', Icon: UserRound },
];

export default function BottomNav() {
  const path = usePathname();
  const isLoggedIn = useStore(s => s.isLoggedIn);
  const hydrated = useStore(s => s.meHydrated);
  const reservationCount = useStore(s => s.reservations.length);
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
  if (!items.some(item => item.href === path)) return null;
  return <nav aria-label="주요 메뉴" className={`${styles.bottomNav} ${!visible ? styles.navHidden : ''}`}><div className={styles.navPill}>
    {items.map(({ href, label, Icon }) => {
      const active = path === href;
      const count = href === '/reservations' && isLoggedIn && hydrated ? reservationCount : 0;
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined} onClick={event => {
        if (active) {
          event.preventDefault();
          const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
          window.scrollTo({ top: 0, behavior });
          document.querySelectorAll<HTMLElement>('main, .overflow-y-auto').forEach(element => { if (element.scrollHeight > element.clientHeight) element.scrollTo({ top: 0, behavior }); });
        }
      }} onPointerDown={event => {
        animateNavigationIcon(event.currentTarget);
      }}><span data-tab-icon className={styles.tabIcon}><Icon size={26} strokeWidth={active ? 2.2 : 1.6} fill={active && (href === '/' || href === '/wishlist' || href === '/community') ? 'currentColor' : 'none'} />{count > 0 && <span className={styles.badge}>{count > 99 ? '99+' : count}</span>}</span><span>{label}</span></Link>;
    })}
  </div></nav>;
}
