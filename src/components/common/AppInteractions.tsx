'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import LoginOnboarding from '@/components/auth/LoginOnboarding';
import NotificationDrawer from '@/components/notifications/NotificationDrawer';
import { useStore } from '@/store';

export default function AppInteractions() {
  const pathname = usePathname();
  const [panel, setPanel] = useState<{ path: string; type: 'login' | 'notifications' } | null>(null);
  const user = useStore(s => s.user);
  const refreshNotifications = useStore(s => s.refreshNotifications);
  const userId = user?.id;
  const login = panel?.type === 'login';
  const notificationsOpen = panel?.type === 'notifications';
  const setLogin = (open: boolean) => setPanel(open ? { path: window.location.pathname, type: 'login' } : null);
  if (panel && (panel.path !== pathname || (panel.type === 'login' && user))) setPanel(null);
  useEffect(() => {
    const showLogin = () => setPanel({ path: window.location.pathname, type: 'login' });
    const showNotifications = () => setPanel({ path: window.location.pathname, type: useStore.getState().user ? 'notifications' : 'login' });
    window.addEventListener('dental:login', showLogin);
    window.addEventListener('dental:notifications', showNotifications);
    return () => { window.removeEventListener('dental:login', showLogin); window.removeEventListener('dental:notifications', showNotifications); };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const refresh = () => { if (document.visibilityState === 'visible') void refreshNotifications(); };
    refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('dental:notifications', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('dental:notifications', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [userId, refreshNotifications]);

  return <>
    {login && <LoginOnboarding onClose={() => setLogin(false)} />}
    {/* 알림 = 프리티풀 오른쪽 서랍(늘 그려 두고 open 만 바꾼다 — 닫힐 때 밀려 나가는 슬라이드가 보이게) */}
    <NotificationDrawer open={notificationsOpen} onClose={() => setPanel(null)} />
  </>;
}
