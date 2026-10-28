'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './community.module.css';

let scrollLocks = 0;
let previousBodyOverflow = '';

export default function CommunityModal({ children, label, onClose, variant = 'sheet' }: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  variant?: 'sheet' | 'drawer' | 'right-drawer' | 'alert';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  function close() {
    if (timer.current) return;
    setLeaving(true);
    timer.current = setTimeout(() => closeRef.current(), 220);
  }

  useEffect(() => {
    if (!mounted) return;
    ref.current?.showModal();
    if (scrollLocks === 0) previousBodyOverflow = document.body.style.overflow;
    scrollLocks++;
    document.body.style.overflow = 'hidden';
    const viewport = window.visualViewport;
    const resize = () => {
      if (ref.current && viewport) {
        ref.current.style.height = `${viewport.height}px`;
        ref.current.style.top = `${viewport.offsetTop}px`;
      }
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    return () => {
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks === 0) document.body.style.overflow = previousBodyOverflow;
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <dialog ref={ref} className={styles.modal} data-variant={variant} data-leaving={leaving || undefined} aria-label={label}
      onCancel={e => { e.preventDefault(); close(); }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className={styles.sheet}>
        <div className={styles.handle} aria-hidden="true" onPointerDown={e => {
          const start = e.clientY;
          const target = e.currentTarget;
          target.setPointerCapture(e.pointerId);
          target.onpointerup = event => { if (event.clientY - start > 70) close(); target.onpointerup = null; };
        }} />
        {children}
      </div>
    </dialog>, document.body,
  );
}
