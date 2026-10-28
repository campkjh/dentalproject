'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './app-ui.module.css';

const mainPaths = new Set(['/', '/community', '/reservations', '/wishlist', '/mypage']);

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const previous = useRef(path);
  const [direction, setDirection] = useState<'forward' | 'back' | undefined>();
  useEffect(() => {
    const from = previous.current;
    previous.current = path;
    if (from === path || (mainPaths.has(from) && mainPaths.has(path))) return;
    setDirection(mainPaths.has(path) || path.split('/').length < from.split('/').length ? 'back' : 'forward');
    const timer = setTimeout(() => setDirection(undefined), 380);
    return () => clearTimeout(timer);
  }, [path]);
  return <div className={styles.pageMotion} data-direction={direction}>{children}</div>;
}
