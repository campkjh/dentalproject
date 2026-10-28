'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { useStore } from '@/store';
import styles from './app-ui.module.css';

const items = [{ href: '/', label: '홈' }, { href: '/reservations', label: '예약내역' }, { href: '/community', label: '커뮤니티' }, { href: '/wishlist', label: '포켓' }, { href: '/mypage', label: '마이' }];

export default function DesktopHeader() {
  const path = usePathname();
  const router = useRouter();
  const notifications = useStore(s => s.notifications);
  const meHydrated = useStore(s => s.meHydrated);
  const [query, setQuery] = useState('');
  const [indicator, setIndicator] = useState({ left: 4, width: 0 });
  const nav = useRef<HTMLElement>(null);
  const active = items.find(item => item.href === '/' ? path === '/' : path.startsWith(item.href));
  useLayoutEffect(() => {
    const measure = () => {
      const element = nav.current?.querySelector<HTMLElement>('[aria-current=page]');
      setIndicator(element ? { left: element.offsetLeft, width: element.offsetWidth } : { left: 4, width: 0 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (nav.current) observer.observe(nav.current);
    return () => observer.disconnect();
  }, [path]);
  return <header className={styles.desktopHeader}><div className={styles.desktopInner}>
    <Link href="/" className={styles.brand}><img src="/icons/brand-logo.png" alt="" />마이닥</Link>
    <nav ref={nav} className={styles.desktopNav} aria-label="주요 메뉴"><span className={styles.navIndicator} aria-hidden="true" style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }} />{items.map(item => <Link href={item.href} key={item.href} aria-current={active?.href === item.href ? 'page' : undefined}>{item.label}</Link>)}</nav>
    <div className={styles.headerActions}>
      {path.startsWith('/community') ? <form className={styles.headerSearch} onSubmit={event => { event.preventDefault(); router.push(`/community?q=${encodeURIComponent(query)}`); }}><Search size={17} /><input aria-label="커뮤니티 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="커뮤니티 검색" /></form> : <Link href="/search" className={styles.iconButton} aria-label="시술 검색" title="검색"><Search size={22} /></Link>}
      <button type="button" className={styles.iconButton} aria-label="알림 열기" title="알림" onClick={() => window.dispatchEvent(new CustomEvent('dental:notifications'))}><Bell size={22} />{meHydrated && notifications.some(n => !n.isRead) && <span className={styles.dot} />}</button>
    </div>
  </div></header>;
}
