'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { compressImage } from '@/lib/compressImage';
import { uploadDirect, UPLOAD_MAX_BYTES } from '@/lib/upload';
import { reviewPhotoSources, type ReviewPhotosValue } from '@/lib/review-photos';

export const EMPTY_REVIEW_PHOTOS: ReviewPhotosValue = { mode: 'before-after', before: '', after: '', single: '' };

/** Upload only the chosen, edited photos. Single photos use the existing after_image column. */
export async function uploadReviewPhotos(value: ReviewPhotosValue) {
  const save = async (src: string) => {
    if (!src) return undefined;
    const blob = await (await fetch(src)).blob();
    return uploadDirect(new File([blob], 'review.jpg', { type: blob.type || 'image/jpeg' }), 'review-images');
  };
  const sources = reviewPhotoSources(value);
  const [beforeImage, afterImage] = await Promise.all([save(sources.beforeImage), save(sources.afterImage)]);
  return { beforeImage, afterImage };
}

export default function ReviewPhotos({ value, onChange, disabled = false }: {
  value: ReviewPhotosValue;
  onChange: (value: ReviewPhotosValue) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState<'before' | 'after' | 'single' | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const cancelEdit = useCallback(() => setEditing(null), []);
  const busy = disabled || reading;
  const pick = async (key: 'before' | 'after' | 'single', file?: File) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) { setError('이미지 파일을 선택해 주세요.'); return; }
    if (file.size > UPLOAD_MAX_BYTES) { setError('사진 한 장당 25MB까지 올릴 수 있어요.'); return; }
    setReading(true);
    try {
      const compressed = await compressImage(file, 2000);
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('사진을 읽지 못했어요.'));
        reader.readAsDataURL(compressed);
      });
      onChange({ ...value, [key]: src });
    } catch { setError('사진을 읽지 못했어요. JPG 또는 PNG로 다시 선택해 주세요.'); }
    finally { setReading(false); }
  };
  const slots = value.mode === 'single' ? [{ key: 'single', label: '사진' }] as const
    : [{ key: 'before', label: '시술 전' }, { key: 'after', label: '시술 후' }] as const;
  return <>
    <div className="mb-4 flex gap-1 rounded-[12px] bg-[#F2F4F6] p-1" role="group" aria-label="사진 등록 방식">
      {([{ key: 'before-after', label: '전후 비교' }, { key: 'single', label: '사진 한 장' }] as const).map((mode) => (
        <button key={mode.key} type="button" disabled={busy} aria-pressed={value.mode === mode.key}
          onClick={() => onChange({ ...value, mode: mode.key })}
          className={`h-11 flex-1 rounded-[10px] text-[15px] font-semibold ${value.mode === mode.key ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'}`}>{mode.label}</button>
      ))}
    </div>
    <div className={`grid gap-3 ${value.mode === 'before-after' ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {slots.map(({ key, label }) => <div key={key}>
        <p className="mb-2 text-[14px] font-semibold text-[#4E5968]">{label}</p>
        {value[key] ? <>
          <div className="relative overflow-hidden rounded-[14px] bg-[#F2F4F6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value[key]} alt={label} className="aspect-square w-full object-contain" />
            <button type="button" disabled={busy} aria-label={`${label} 삭제`} onClick={() => onChange({ ...value, [key]: '' })} className="absolute right-2 top-2 h-8 w-8 rounded-full bg-black/60 text-white">×</button>
          </div>
          <button type="button" disabled={busy} onClick={() => setEditing(key)} className="mt-2 h-11 w-full rounded-[12px] bg-[#EFF5FE] text-[14px] font-semibold text-[#2F6FE4]">모자이크 편집</button>
        </> : <label className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#D1D6DB] bg-[#F9FAFB] text-[#8B95A1] ${busy ? 'opacity-50' : ''}`}>
          <span className="text-[28px]">+</span><span className="text-[14px]">{reading ? '사진 읽는 중…' : `${label} 사진 추가`}</span>
          <input type="file" accept="image/*" disabled={busy} className="sr-only" aria-label={`${label} 사진 추가`} onChange={(e) => { void pick(key, e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} />
        </label>}
      </div>)}
    </div>
    <p className="mt-3 text-[13px] leading-relaxed text-[#8B95A1]">사진은 선택 사항이에요. 가리고 싶은 부위는 모자이크 편집에서 직접 문질러 주세요. 편집을 적용한 사진이 등록돼요.</p>
    {error && <p role="alert" className="mt-2 text-[14px] text-[#F04452]">{error}</p>}
    {editing && <MosaicEditor src={value[editing]} onCancel={cancelEdit} onSave={(src) => { onChange({ ...value, [editing]: src }); setEditing(null); }} />}
  </>;
}

function MosaicEditor({ src, onCancel, onSave }: { src: string; onCancel: () => void; onSave: (src: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
      if (event.key !== 'Tab') return;
      const elements = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]');
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', escape);
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d')?.drawImage(image, 0, 0);
      const source = document.createElement('canvas');
      source.width = canvas.width; source.height = canvas.height;
      source.getContext('2d')?.drawImage(image, 0, 0);
      sourceRef.current = source;
      setReady(true);
      canvas.focus();
    };
    image.onerror = () => setError('사진을 열지 못했어요. 다시 선택해 주세요.');
    image.src = src;
    return () => { image.onload = null; image.onerror = null; document.body.style.overflow = previous; document.removeEventListener('keydown', escape); previousFocus?.focus(); };
  }, [src, onCancel]);

  const paint = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!ready || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    const source = sourceRef.current;
    if (!ctx || !source) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * canvas.width / rect.width;
    const y = (e.clientY - rect.top) * canvas.height / rect.height;
    const block = Math.max(12, Math.round(canvas.width / 35));
    const radius = block * 1.8;
    const start = last.current ?? { x, y };
    const steps = Math.max(1, Math.ceil(Math.hypot(x - start.x, y - start.y) / block));
    const tiny = document.createElement('canvas'); tiny.width = 1; tiny.height = 1;
    const pixel = tiny.getContext('2d');
    if (!pixel) return;
    for (let step = 0; step <= steps; step++) {
      const px = start.x + (x - start.x) * step / steps;
      const py = start.y + (y - start.y) * step / steps;
      for (let bx = Math.max(0, Math.floor((px - radius) / block) * block); bx < Math.min(canvas.width, px + radius); bx += block) {
        for (let by = Math.max(0, Math.floor((py - radius) / block) * block); by < Math.min(canvas.height, py + radius); by += block) {
          const w = Math.min(block, canvas.width - bx), h = Math.min(block, canvas.height - by);
          pixel.drawImage(source, bx, by, w, h, 0, 0, 1, 1);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tiny, 0, 0, 1, 1, bx, by, w, h);
        }
      }
    }
    last.current = { x, y };
  };
  return createPortal(<div ref={dialogRef} className="fixed inset-0 z-[300] flex flex-col bg-white" role="dialog" aria-modal="true" aria-labelledby="mosaic-title" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
    <header className="flex items-center justify-between gap-3 px-5 py-4"><h2 id="mosaic-title" className="text-[20px] font-bold text-[#191F28]">사진 모자이크</h2><button type="button" onClick={onCancel} className="h-11 px-3 text-[#6B7684]">취소</button></header>
    <p className="px-5 pb-4 text-[14px] text-[#6B7684]">가릴 부위를 손가락이나 마우스로 문질러 주세요.</p>
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#F2F4F6] p-4">
      <canvas ref={canvasRef} tabIndex={0} aria-label="모자이크 편집 영역" className="max-h-full max-w-full touch-none object-contain" style={{ width: 'auto', height: 'auto' }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); last.current = null; paint(e); }} onPointerMove={paint}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); last.current = null; }} onPointerCancel={() => { last.current = null; }} />
    </div>
    {error && <p role="alert" className="px-5 py-2 text-[#F04452]">{error}</p>}
    <footer className="flex gap-3 p-4"><button type="button" disabled={!ready} onClick={() => { const c = canvasRef.current; if (c && sourceRef.current) c.getContext('2d')?.drawImage(sourceRef.current, 0, 0); }} className="h-14 flex-1 rounded-[16px] bg-[#F2F4F6] font-semibold text-[#4E5968]">다시 편집</button><button type="button" disabled={!ready} onClick={() => { if (canvasRef.current) onSave(canvasRef.current.toDataURL('image/jpeg', .9)); }} className="h-14 flex-1 rounded-[16px] bg-[#3180F7] font-semibold text-white disabled:opacity-40">적용하기</button></footer>
  </div>, document.body);
}
