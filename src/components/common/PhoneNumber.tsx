'use client';

import { formatPhone } from '@/lib/phone';
import { useStore } from '@/store';

export default function PhoneNumber({ phone }: { phone: string }) {
  const showToast = useStore(s => s.showToast);
  const formatted = formatPhone(phone);
  async function copy() {
    try {
      await navigator.clipboard.writeText(formatted);
      showToast('전화번호를 복사했어요.');
    } catch {
      showToast('전화번호를 복사하지 못했어요. 다시 시도해주세요.');
    }
  }
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1">
      <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="whitespace-nowrap">{formatted}</a>
      <button type="button" aria-label="전화번호 복사" onClick={copy} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-[#3180F7]">복사</button>
    </span>
  );
}
