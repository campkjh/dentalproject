'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './app-ui.module.css';

const mainPaths = new Set(['/', '/community', '/reservations', '/wishlist', '/mypage']);
/** 제 등장 움직임이 따로 있는 화면 — 옆으로 미끄러짐을 겹치면 칸이 한 번 더 '뚝' 움직인다 */
const ownMotionPaths = new Set(['/search']);

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // 방향은 그리는 중에 정한다 — 효과(useEffect)에서 정하면 새 화면이 제자리에 한 번 그려진 뒤 40px 옆에서 다시 시작해 '뚝' 튀었다
  const [shown, setShown] = useState<{ path: string; direction?: 'forward' | 'back' }>({ path });
  if (shown.path !== path) {
    const from = shown.path;
    const skip = mainPaths.has(from) && mainPaths.has(path) || ownMotionPaths.has(path);
    setShown({
      path,
      direction: skip ? undefined : mainPaths.has(path) || path.split('/').length < from.split('/').length ? 'back' : 'forward',
    });
  }
  const direction = shown.path === path ? shown.direction : undefined;
  useEffect(() => {
    if (!direction) return;
    const timer = setTimeout(() => setShown((s) => (s.path === path ? { path } : s)), 380);
    return () => clearTimeout(timer);
  }, [direction, path]);
  return <div className={styles.pageMotion} data-direction={direction}>{children}</div>;
}
