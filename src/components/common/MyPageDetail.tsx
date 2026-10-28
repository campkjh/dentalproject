'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DetailPanelBackContext } from './detail-panel-context';
import styles from './app-ui.module.css';

const pages = {
  '/mypage/profile': dynamic(() => import('@/app/mypage/profile/page')),
  '/mypage/points': dynamic(() => import('@/app/mypage/points/page')),
  '/mypage/coupons': dynamic(() => import('@/app/mypage/coupons/page')),
  '/mypage/payments': dynamic(() => import('@/app/mypage/payments/page')),
  '/mypage/reviews': dynamic(() => import('@/app/mypage/reviews/page')),
  '/mypage/notifications': dynamic(() => import('@/app/mypage/notifications/page')),
  '/mypage/faq': dynamic(() => import('@/app/mypage/faq/page')),
  '/mypage/announcements': dynamic(() => import('@/app/mypage/announcements/page')),
  '/terms': dynamic(() => import('@/app/terms/page')),
};

export default function MyPageDetail({ href, onClose }: { href: string; onClose: () => void }) {
  const Page = pages[href as keyof typeof pages];
  return <DetailPanelBackContext.Provider value={onClose}><div className={styles.myDetailPanelContent}>
    {Page ? <Page key={href} /> : <Link href={href}>전체 화면으로 보기</Link>}
  </div></DetailPanelBackContext.Provider>;
}
