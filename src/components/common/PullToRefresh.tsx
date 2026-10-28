'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CUSTOMER_PROFILE_AVATARS } from '@/lib/customer-profile-avatars';
import styles from './app-ui.module.css';

export default function PullToRefresh({ onRefresh, disabled = false }: { onRefresh: () => void; disabled?: boolean }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const callback = useRef(onRefresh);
  useEffect(() => { callback.current = onRefresh; }, [onRefresh]);
  useEffect(() => {
    if (disabled) return;
    let start: { x: number; y: number } | null = null;
    let distance = 0;
    let busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    const atTop = () => window.scrollY <= 0;
    const begin = (event: TouchEvent) => {
      if (busy || event.touches.length !== 1 || !atTop() || document.querySelector('dialog[open]') || (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable=true]'))) { start = null; return; }
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const move = (event: TouchEvent) => {
      if (!start || busy || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (Math.abs(dx) > Math.abs(dy) || !atTop()) { start = null; distance = 0; setPull(0); return; }
      distance = Math.min(110, Math.max(0, dy * .55));
      setPull(distance);
      if (dy > 0 && event.cancelable) event.preventDefault();
    };
    const finish = () => {
      if (!start || busy) return;
      start = null;
      if (distance < 68) { distance = 0; setPull(0); return; }
      busy = true; setRefreshing(true); setPull(68);
      callback.current();
      interval = setInterval(() => setTick(n => n + 1), 230);
      timer = setTimeout(() => { busy = false; setRefreshing(false); setPull(0); clearInterval(interval); }, 850);
    };
    const cancel = () => { start = null; if (!busy) { distance = 0; setPull(0); } };
    window.addEventListener('touchstart', begin, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', finish, { passive: true });
    window.addEventListener('touchcancel', cancel, { passive: true });
    return () => { clearTimeout(timer); clearInterval(interval); window.removeEventListener('touchstart', begin); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', finish); window.removeEventListener('touchcancel', cancel); };
  }, [disabled]);
  if (!pull || typeof document === 'undefined') return null;
  return createPortal(<div className={styles.pullIndicator} style={{ transform: `translateY(${pull}px)` }} role="status"><img src={CUSTOMER_PROFILE_AVATARS[(refreshing ? tick : Math.floor(pull / 22)) % CUSTOMER_PROFILE_AVATARS.length]} alt="" width={36} height={36} /><span>{refreshing ? '새로고침 중' : pull >= 68 ? '놓으면 새로고침' : '당겨서 새로고침'}</span></div>, document.body);
}
