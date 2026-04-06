'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  rightContent?: React.ReactNode;
  transparent?: boolean;
}

export default function TopBar({ title, showBack = true, rightContent, transparent = false }: TopBarProps) {
  const router = useRouter();

  return (
    <div
      style={{ position: 'sticky', top: 0, zIndex: 40 }}
      className={`flex items-center justify-between h-12 px-2.5 lg:hidden ${
        transparent ? 'bg-transparent' : 'bg-white'
      }`}
    >
      <div className="flex items-center gap-2">
        {showBack && (
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft size={24} />
          </button>
        )}
        {title && <h1 className="text-lg font-bold fade-in-up">{title}</h1>}
      </div>
      {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
    </div>
  );
}
