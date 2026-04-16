'use client';

import Modal from './Modal';
import Toast from './Toast';
import BottomNav from './BottomNav';
import { SessionProvider } from '@/lib/supabase/SessionProvider';

export default function Providers({ children }: { children?: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <BottomNav />
      <Modal />
      <Toast />
    </SessionProvider>
  );
}
