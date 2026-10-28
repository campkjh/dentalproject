'use client';

import Link from 'next/link';
import { Bell, Search } from 'lucide-react';
import { useStore } from '@/store';
import styles from './app-ui.module.css';

export default function MobileHomeHeader({ hidden }: { hidden: boolean }) {
  const unread = useStore(s => s.meHydrated && s.notifications.some(n => !n.isRead));
  return <div className={`flex items-center justify-between px-4 transition-all duration-300 ${hidden ? 'h-0 overflow-hidden opacity-0' : 'h-16 opacity-100'}`}>
    <Link href="/" className={styles.brand}><img src="/icons/brand-logo.png" alt="" />마이닥</Link>
    <div className={styles.headerActions}><button type="button" className={styles.iconButton} aria-label="알림 열기" title="알림" onClick={() => window.dispatchEvent(new CustomEvent('dental:notifications'))}><Bell size={22} />{unread && <span className={styles.dot} />}</button><Link href="/search" className={styles.iconButton} aria-label="시술 검색" title="검색"><Search size={22} /></Link></div>
  </div>;
}
