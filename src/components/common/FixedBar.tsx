'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface FixedBarProps {
  position: 'top' | 'bottom';
  children: React.ReactNode;
  className?: string;
}

export default function FixedBar({ position, children, className = '' }: FixedBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        [position]: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        width: '100%',
        maxWidth: 430,
      }}
      className={className}
    >
      {children}
    </div>,
    document.body
  );
}
