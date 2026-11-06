'use client';

import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGrid, X } from 'lucide-react';
import { maskReviewAuthor } from '@/lib/review-display';
import { INITIAL_PHOTO_TRANSFORM, constrainPhotoTransform, pinchPhotoTransform, type PhotoTransform, type PhotoPoint } from '@/lib/photo-zoom';
import styles from './review-photo-viewer.module.css';

export type PhotoReview = {
  authorName: string;
  rating: number;
  date?: string;
  productTitle: string;
  content: string;
};
type Photo = { src: string; label?: string };
type Gesture = { mode: 'pinch'; distance: number; origin: PhotoPoint; start: PhotoTransform }
  | { mode: 'pan' | 'swipe'; origin: PhotoPoint; start: PhotoTransform; scrollTop: number };


export default function ReviewPhotoViewer({ src, label = '후기 사진', className, review, photos, initialIndex }: {
  src: string; label?: string; className?: string; review?: PhotoReview; photos?: Photo[]; initialIndex?: number;
}) {
  const gallery = photos?.length ? photos : [{ src, label }];
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [transform, setTransform] = useState<PhotoTransform>({ ...INITIAL_PHOTO_TRANSFORM });
  const transformRef = useRef<PhotoTransform>({ ...INITIAL_PHOTO_TRANSFORM });
  const applyTransform = useCallback((next: PhotoTransform) => { transformRef.current = next; setTransform(next); }, []);
  const [grid, setGrid] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const imageArea = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const current = gallery[index] ?? gallery[0];

  function selectPhoto(next: number) {
    setIndex(next);
    applyTransform({ ...INITIAL_PHOTO_TRANSFORM });
    gesture.current = null;
    setGrid(false);
    if (imageArea.current) { imageArea.current.scrollTop = 0; imageArea.current.scrollLeft = 0; }
    body.current?.scrollTo({ top: 0 });
    close.current?.focus();
  }
  function touchPoint(event: TouchEvent, second = false): PhotoPoint {
    const rect = imageArea.current!.getBoundingClientRect();
    const a = event.touches[0];
    const b = second ? event.touches[1] : a;
    return { x: (a.clientX + b.clientX) / 2 - rect.left - rect.width / 2,
      y: (a.clientY + b.clientY) / 2 - rect.top - rect.height / 2 };
  }
  function onTouchStart(event: TouchEvent) {
    if (!imageArea.current) return;
    const start = { ...transformRef.current };
    if (event.touches.length === 2) {
      const [a, b] = [event.touches[0], event.touches[1]];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      gesture.current = distance > 8 ? { mode: 'pinch', distance, origin: touchPoint(event, true), start } : null;
    } else if (event.touches.length === 1) {
      gesture.current = { mode: start.scale > 1 ? 'pan' : 'swipe', origin: start.scale > 1 ? touchPoint(event) : { x: event.touches[0].clientX, y: event.touches[0].clientY }, start, scrollTop: body.current?.scrollTop ?? 0 };
    } else gesture.current = null;
  }
  function onTouchMove(event: TouchEvent) {
    const active = gesture.current;
    const area = imageArea.current;
    if (!active || !area) return;
    const bounds = { width: area.clientWidth, height: area.clientHeight };
    if (active.mode === 'pinch' && event.touches.length === 2) {
      const [a, b] = [event.touches[0], event.touches[1]];
      const ratio = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / active.distance;
      applyTransform(pinchPhotoTransform(active.start, active.origin, touchPoint(event, true), ratio, bounds));
    } else if (active.mode !== 'pinch' && event.touches.length === 1) {
      const current = active.mode === 'pan' ? touchPoint(event) : { x: event.touches[0].clientX, y: event.touches[0].clientY };
      const dx = current.x - active.origin.x;
      const dy = current.y - active.origin.y;
      if (active.mode === 'pan') applyTransform(constrainPhotoTransform({ ...active.start, x: active.start.x + dx, y: active.start.y + dy }, bounds));
      else if (body.current && Math.abs(dy) > Math.abs(dx)) body.current.scrollTop = active.scrollTop - dy;
    }
  }
  function onTouchEnd(event: TouchEvent) {
    const active = gesture.current;
    gesture.current = null;
    if (active?.mode === 'pinch' && event.touches.length === 1 && transformRef.current.scale > 1 && imageArea.current) {
      gesture.current = { mode: 'pan', origin: touchPoint(event), start: { ...transformRef.current }, scrollTop: body.current?.scrollTop ?? 0 };
      return;
    }
    if (!active || active.mode !== 'swipe' || event.touches.length || !event.changedTouches[0]) return;
    const dx = event.changedTouches[0].clientX - active.origin.x;
    const dy = event.changedTouches[0].clientY - active.origin.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const next = index + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < gallery.length) selectPhoto(next);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.setProperty('overflow', 'hidden');
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (['+', '=', '-', '0'].includes(e.key) && imageArea.current) {
        e.preventDefault();
        const area = imageArea.current;
        const value = transformRef.current;
        applyTransform(e.key === '0' ? { ...INITIAL_PHOTO_TRANSFORM } : constrainPhotoTransform({ ...value, scale: value.scale + (e.key === '-' ? -.5 : .5) }, { width: area.clientWidth, height: area.clientHeight }));
      }
      if (e.key === 'Tab') {
        const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        if (!buttons.length) return;
        if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === buttons.at(-1)) { e.preventDefault(); buttons[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.setProperty('overflow', overflow); document.removeEventListener('keydown', key); previous?.focus(); };
  }, [open, applyTransform]);

  return <>
    <button type="button" className={className} onClick={() => {
      setIndex(initialIndex != null ? Math.max(0, Math.min(initialIndex, gallery.length - 1)) : Math.max(0, gallery.findIndex(photo => photo.src === src)));
      applyTransform({ ...INITIAL_PHOTO_TRANSFORM }); gesture.current = null; setGrid(false); setExpanded(false); setOpen(true);
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
              <div ref={imageArea} className={styles.imageArea} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={() => { gesture.current = null; }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.src} alt={current.label || '후기 사진'} draggable={false} style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }} />
              </div>
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
