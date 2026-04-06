'use client';

import { useStore } from '@/store';
import { X } from 'lucide-react';

export default function Toast() {
  const { toast, showToast } = useStore();

  if (!toast) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] max-w-[400px] w-[calc(100%-32px)]">
      <div className="bg-gray-800 text-white px-4 py-3 rounded-xl flex items-center justify-between toast-enter">
        <span className="text-sm">{toast}</span>
        <button onClick={() => useStore.setState({ toast: null })}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
