'use client';

import { MapPin } from 'lucide-react';
import { useStore } from '@/store';

export default function AddressCopy({ address }: { address: string }) {
  const showToast = useStore(s => s.showToast);
  async function copy() {
    try { await navigator.clipboard.writeText(address); showToast('주소를 복사했어요.'); }
    catch { showToast('주소를 복사하지 못했어요. 다시 시도해주세요.'); }
  }
  return <span className="inline-flex max-w-full items-center gap-2 leading-[1.5]">
    <MapPin size={18} className="shrink-0 text-[#8B95A1]" aria-hidden="true" />
    <span className="min-w-0 break-keep">{address}</span>
    <button type="button" aria-label="주소 복사" onClick={copy} className="inline-flex h-11 shrink-0 items-center justify-center text-[14px] font-semibold leading-none text-[#3180F7]">복사</button>
  </span>;
}
