'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Mail, X } from 'lucide-react';
import CommunityModal from '@/components/community/CommunityModal';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import styles from './app-ui.module.css';
import communityStyles from '@/components/community/community.module.css';

export default function AppInteractions() {
  const pathname = usePathname();
  const router = useRouter();
  const [panel, setPanel] = useState<{ path: string; type: 'login' | 'notifications' } | null>(null);
  const notifications = useStore(s => s.notifications);
  const user = useStore(s => s.user);
  const markRead = useStore(s => s.markNotificationRead);
  const { signInWithOAuth } = useSession();
  const showToast = useStore(s => s.showToast);
  const login = panel?.type === 'login';
  const notificationsOpen = panel?.type === 'notifications';
  const setLogin = (open: boolean) => setPanel(open ? { path: window.location.pathname, type: 'login' } : null);
  const setNotificationsOpen = (open: boolean) => setPanel(open ? { path: window.location.pathname, type: 'notifications' } : null);
  if (panel && (panel.path !== pathname || (panel.type === 'login' && user))) setPanel(null);
  useEffect(() => {
    const showLogin = () => setPanel({ path: window.location.pathname, type: 'login' });
    const showNotifications = () => setPanel({ path: window.location.pathname, type: useStore.getState().user ? 'notifications' : 'login' });
    window.addEventListener('dental:login', showLogin);
    window.addEventListener('dental:notifications', showNotifications);
    return () => { window.removeEventListener('dental:login', showLogin); window.removeEventListener('dental:notifications', showNotifications); };
  }, []);

  return <>
    {login && <CommunityModal label="로그인" onClose={() => setLogin(false)}><div className={styles.loginBody}>
      <button type="button" className={styles.iconButton} style={{ alignSelf: 'flex-end' }} aria-label="로그인 닫기" onClick={() => setLogin(false)}><X size={20} /></button>
      <div className={styles.loginBrand}><img src="/icons/brand-logo.png" width={40} height={40} alt="" className="mx-auto mb-2" />마이닥</div>
      <button type="button" className={styles.primaryButton} style={{ background: '#fee500', color: '#191919' }} onClick={() => { void signInWithOAuth('kakao').catch(() => showToast('로그인을 시작하지 못했습니다.')); }}>카카오로 시작하기</button>
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={styles.secondaryButton}><Mail size={18} />이메일로 로그인</Link>
      <button type="button" className={styles.secondaryButton} onClick={() => setLogin(false)}>취소</button>
    </div></CommunityModal>}
    {notificationsOpen && <CommunityModal label="알림" variant="right-drawer" onClose={() => setNotificationsOpen(false)}>
      <header className={communityStyles.sheetHeader}><Bell size={20} /><h2>알림</h2><button type="button" className={styles.iconButton} aria-label="알림 닫기" onClick={() => setNotificationsOpen(false)}><X size={20} /></button></header>
      <div className={styles.notificationList}>{notifications.length ? notifications.map(notification => <button type="button" key={notification.id} className={styles.notification} onClick={() => {
        if (!notification.isRead) {
          markRead(notification.id);
          void fetch(`/api/notifications/${notification.id}/read`, { method: 'POST' }).then(async response => {
            const data = await response.json();
            if (!response.ok || !data.ok) throw new Error('알림 상태를 저장하지 못했습니다.');
          }).catch(() => {
            useStore.setState(state => ({ notifications: state.notifications.map(item => item.id === notification.id ? { ...item, isRead: false } : item) }));
            showToast('알림 상태를 저장하지 못했습니다.');
          });
        }
        if (notification.link) { setNotificationsOpen(false); router.push(notification.link); }
      }}><strong>{!notification.isRead && <i />}{notification.title}</strong><p>{notification.content}</p><time>{notification.date}</time></button>) : <div className={communityStyles.empty}><Bell size={28} /><p>새로운 알림이 없어요.</p></div>}</div>
    </CommunityModal>}
  </>;
}
