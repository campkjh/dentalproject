'use client';

import { usePathname } from 'next/navigation';
import DesktopHeader from './DesktopHeader';
import Footer from './Footer';
import PageTransition from './PageTransition';
import styles from './app-ui.module.css';

const BARE_PREFIXES = ['/partner', '/admin'];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_PREFIXES.some((p) => pathname.startsWith(p));

  if (isBare) {
    // Partner / Admin — no header, no footer, no max-width wrapper, no top padding
    return <>{children}</>;
  }

  const fullWidth = pathname.startsWith('/community') || pathname === '/mypage';

  return (
    <>
      <DesktopHeader />
      <div className={fullWidth ? styles.shell : 'max-w-[640px] lg:max-w-none mx-auto bg-white lg:bg-gray-50 w-full min-h-dvh'}>
        <PageTransition>{children}</PageTransition>
      </div>
      {!fullWidth && <Footer />}
    </>
  );
}
