'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ReviewPhotoViewer({ src, label = '후기 사진', className }: { src: string; label?: string; className?: string }) {
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
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {/* Pinch zoom remains enabled; scrolling allows inspecting tall images. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="mx-auto object-contain" style={{ width: zoom ? '200%' : '100%', maxWidth: zoom ? 'none' : '100%', touchAction: 'pan-x pan-y pinch-zoom' }} />
      </div>
    </div>, document.body)}
  </>;
}
