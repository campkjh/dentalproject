'use client';

import { usePathname } from 'next/navigation';
import DesktopHeader from './DesktopHeader';
import Footer from './Footer';
import PageTransition from './PageTransition';
import styles from './app-ui.module.css';

const BARE_PREFIXES = ['/partner', '/admin'];
const PC_WIDE = ['/', '/reservations', '/wishlist'];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_PREFIXES.some((p) => pathname.startsWith(p));

  if (isBare) {
    // Partner / Admin — no header, no footer, no max-width wrapper, no top padding
    return <>{children}</>;
  }

  const fullWidth = pathname.startsWith('/community') || pathname === '/mypage';
  // PC 레이아웃을 맞춘 화면 — PC 에선 헤더와 같은 폭(1280 · 양옆 32)으로 펼친다(프리티풀 main 칸과 같음)
  const pcWide = PC_WIDE.includes(pathname);

  return (
    <>
      <DesktopHeader />
      <div className={fullWidth ? styles.shell : pcWide ? 'mx-auto w-full max-w-[640px] bg-white min-h-dvh pc:max-w-[1280px] pc:px-8' : 'max-w-[640px] mx-auto bg-white w-full min-h-dvh'}>
        <PageTransition>{children}</PageTransition>
      </div>
      {!fullWidth && <Footer />}
    </>
  );
}
