'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { maskReviewAuthor } from '@/lib/review-display';

export type PhotoReview = {
  authorName: string;
  rating: number;
  date?: string;
  productTitle: string;
  content: string;
};

export default function ReviewPhotoViewer({ src, label = '후기 사진', className, review }: {
  src: string; label?: string; className?: string; review?: PhotoReview;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') {
        const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!buttons?.length) return;
        if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons[buttons.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === buttons[buttons.length - 1]) { e.preventDefault(); buttons[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [open]);
  return <>
    <button type="button" className={className} onClick={() => { setZoom(false); setOpen(true); }} aria-label={`${label} 확대`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} loading="lazy" className="h-full w-full object-cover" />
    </button>
    {open && createPortal(<div ref={dialog} role="dialog" aria-modal="true" aria-label={`${label} 확대 보기`} className="fixed inset-0 z-[500] flex flex-col bg-black/95" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <header className="flex justify-end p-3"><button type="button" onClick={() => setZoom(v => !v)} className="h-11 px-4 font-semibold text-white">{zoom ? '축소' : '확대'}</button><button ref={close} type="button" onClick={() => setOpen(false)} className="h-11 px-4 font-semibold text-white">닫기</button></header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className={review ? 'max-h-[56dvh] overflow-auto p-3' : 'overflow-auto p-3'}>
          {/* Pinch zoom remains enabled; scrolling allows inspecting tall images. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} className="mx-auto object-contain" style={{ width: zoom ? '200%' : '100%', maxWidth: zoom ? 'none' : '100%', maxHeight: review && !zoom ? '50dvh' : undefined, touchAction: 'pan-x pan-y pinch-zoom' }} />
        </div>
        {review && (
          <section aria-label="사진 후기 내용" className="mx-auto w-full max-w-[640px] rounded-t-[20px] bg-white px-5 py-6 text-[#191F28]">
            <p className="text-[16px] font-semibold">{maskReviewAuthor(review.authorName)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span aria-label={`별점 ${review.rating.toFixed(1)}점`} className="inline-flex items-center gap-1">
                <span aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < Math.round(review.rating) ? 'text-[#FFB830]' : 'text-[#E5E8EB]'}>★</span>)}</span>
                <span className="font-semibold">{review.rating.toFixed(1)}</span>
              </span>
              {review.date && <span className="text-[#8B95A1]">{review.date}</span>}
            </div>
            <h2 className="mt-5 break-words text-[16px] font-semibold">{review.productTitle}</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-[16px] leading-[1.7] [overflow-wrap:anywhere]">{review.content}</p>
          </section>
        )}
      </div>
    </div>, document.body)}
  </>;
}
