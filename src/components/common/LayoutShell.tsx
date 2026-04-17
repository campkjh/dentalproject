'use client';

import { usePathname } from 'next/navigation';
import DesktopHeader from './DesktopHeader';
import Footer from './Footer';

const BARE_PREFIXES = ['/partner', '/admin'];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_PREFIXES.some((p) => pathname.startsWith(p));

  if (isBare) {
    // Partner / Admin — no header, no footer, no max-width wrapper, no top padding
    return <>{children}</>;
  }

  return (
    <>
      <DesktopHeader />
      <div className="max-w-[480px] lg:max-w-none mx-auto bg-white lg:bg-gray-50 w-full min-h-dvh shadow-xl lg:shadow-none lg:pt-[112px]">
        {children}
      </div>
      <Footer />
    </>
  );
}
