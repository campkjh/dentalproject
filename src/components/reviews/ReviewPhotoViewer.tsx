'use client';

import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, LayoutGrid, X, ZoomIn, ZoomOut } from 'lucide-react';
import { maskReviewAuthor } from '@/lib/review-display';
import styles from './review-photo-viewer.module.css';

export type PhotoReview = {
  authorName: string;
  rating: number;
  date?: string;
  productTitle: string;
  content: string;
};
type Photo = { src: string; label?: string };

export default function ReviewPhotoViewer({ src, label = '후기 사진', className, review, photos, initialIndex }: {
  src: string; label?: string; className?: string; review?: PhotoReview; photos?: Photo[]; initialIndex?: number;
}) {
  const gallery = photos?.length ? photos : [{ src, label }];
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [grid, setGrid] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const imageArea = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const current = gallery[index] ?? gallery[0];

  function selectPhoto(next: number) {
    setIndex(next);
    setZoom(false);
    setGrid(false);
    if (imageArea.current) { imageArea.current.scrollTop = 0; imageArea.current.scrollLeft = 0; }
    body.current?.scrollTo({ top: 0 });
    close.current?.focus();
  }
  function onTouchStart(event: TouchEvent) {
    touch.current = event.touches.length === 1 && !zoom
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }
  function onTouchEnd(event: TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start || zoom || !event.changedTouches[0]) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const next = index + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < gallery.length) selectPhoto(next);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') {
        const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        if (!buttons.length) return;
        if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === buttons.at(-1)) { e.preventDefault(); buttons[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [open]);

  return <>
    <button type="button" className={className} onClick={() => {
      setIndex(initialIndex != null ? Math.max(0, Math.min(initialIndex, gallery.length - 1)) : Math.max(0, gallery.findIndex(photo => photo.src === src)));
      setZoom(false); setGrid(false); setExpanded(false); setOpen(true);
    }} aria-label={`${label} 확대`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} loading="lazy" className="h-full w-full object-cover" />
    </button>
    {open && createPortal(
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="후기 사진 보기" className={styles.dialog}>
        <header className={styles.header}>
          <button ref={close} type="button" aria-label="닫기" className={styles.iconButton} onClick={() => setOpen(false)}><X size={28} /></button>
          <h2>후기 사진</h2>
          {gallery.length > 1 ? <button type="button" aria-label={grid ? '사진 크게 보기' : '사진 모아보기'} aria-pressed={grid} className={styles.iconButton} onClick={() => setGrid(value => !value)}><LayoutGrid size={23} /></button> : <span className={styles.headerSpacer} />}
        </header>
        <div ref={body} className={styles.body}>
          {grid ? <div className={styles.grid} aria-label="후기 사진 목록">
            {gallery.map((photo, i) => <button key={`${photo.src}-${i}`} type="button" aria-label={`${i + 1}번째 ${photo.label || '사진'} 보기`} onClick={() => selectPhoto(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.label || '후기 사진'} />
              <span>{photo.label || `${i + 1}`}</span>
            </button>)}
          </div> : <>
            <div className={styles.photoFrame}>
              <div ref={imageArea} className={`${styles.imageArea} ${zoom ? styles.zoomed : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => { touch.current = null; }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.src} alt={current.label || '후기 사진'} />
              </div>
              <button type="button" aria-label={zoom ? '사진 축소' : '사진 확대'} aria-pressed={zoom} className={`${styles.iconButton} ${styles.zoomButton}`} onClick={() => setZoom(value => !value)}>{zoom ? <ZoomOut size={21} /> : <ZoomIn size={21} />}</button>
              {index > 0 && <button type="button" aria-label="이전 사진" className={`${styles.iconButton} ${styles.previous}`} onClick={() => selectPhoto(index - 1)}><ChevronLeft size={26} /></button>}
              {index < gallery.length - 1 && <button type="button" aria-label="다음 사진" className={`${styles.iconButton} ${styles.next}`} onClick={() => selectPhoto(index + 1)}><ChevronRight size={26} /></button>}
            </div>
            {gallery.length > 1 && <div className={styles.pagination} aria-label={`${index + 1} / ${gallery.length} 사진`}>
              {gallery.map((photo, i) => <button key={`${photo.src}-${i}`} type="button" aria-label={`${i + 1}번째 사진`} aria-current={i === index ? 'true' : undefined} onClick={() => selectPhoto(i)}><span /></button>)}
            </div>}
          </>}
          {review && !grid && <section aria-label="사진 후기 내용" className={styles.review}>
            <p className={styles.author}>{maskReviewAuthor(review.authorName)}</p>
            <div className={styles.ratingRow}>
              <span aria-label={`별점 ${review.rating.toFixed(1)}점`} className={styles.stars}>
                <span aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < Math.round(review.rating) ? styles.starFilled : styles.starEmpty}>★</span>)}</span>
                <span className={styles.ratingValue}>{review.rating.toFixed(1)}</span>
              </span>
              {review.date && <span className={styles.date}>{review.date}</span>}
            </div>
            <h3 className={styles.product}>{review.productTitle}</h3>
            <p className={`${styles.content} ${!expanded && review.content.length > 120 ? styles.collapsed : ''}`}>{review.content}</p>
            {review.content.length > 120 && <button type="button" className={styles.more} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '접기' : '더보기'}</button>}
          </section>}
        </div>
      </div>, document.body)}
  </>;
}
