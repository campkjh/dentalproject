'use client';

// 상세 화면 공통 조각 — 프리티풀 사회자 상세(pros/[id])·리뷰 줄(ReviewCommentRow) 그대로 이식.
//  Reveal(닿으면 위로 페이드) · StarRating(반짝 별) · SectionHead(아이콘 + 19 굵게) · 흘러가는 리뷰 카드 · 댓글형 리뷰 줄.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Avatar from '@/components/common/Avatar';

export const BRAND = '#3180F7';

export function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    ob.observe(el);
    return () => ob.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-8 opacity-0 blur-[4px]'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const STAR_PATH = 'M21.5409 6.54807L24.6489 12.8481C24.7724 13.0978 24.9547 13.3138 25.1801 13.4775C25.4055 13.6413 25.6672 13.7478 25.9429 13.7881L32.8939 14.7981C33.2111 14.8441 33.5092 14.9779 33.7543 15.1845C33.9994 15.391 34.1819 15.6621 34.281 15.9669C34.3802 16.2717 34.3921 16.5982 34.3153 16.9094C34.2386 17.2207 34.0764 17.5042 33.8469 17.7281L28.8159 22.6281C28.6168 22.8228 28.4678 23.0629 28.3818 23.3278C28.2957 23.5927 28.2752 23.8745 28.3219 24.1491L29.5099 31.0721C29.5639 31.388 29.5286 31.7128 29.4077 32.0097C29.2869 32.3067 29.0855 32.5639 28.8262 32.7523C28.5669 32.9408 28.26 33.053 27.9403 33.0763C27.6206 33.0996 27.3008 33.033 27.0169 32.8841L20.7999 29.6171C20.5532 29.4872 20.2787 29.4193 19.9999 29.4193C19.7211 29.4193 19.4466 29.4872 19.1999 29.6171L12.9819 32.8861C12.698 33.035 12.3782 33.1016 12.0585 33.0783C11.7388 33.055 11.4319 32.9428 11.1726 32.7543C10.9133 32.5659 10.7119 32.3087 10.5911 32.0117C10.4703 31.7148 10.4349 31.39 10.4889 31.0741L11.6769 24.1511C11.7236 23.8765 11.7031 23.5947 11.6171 23.3298C11.531 23.0649 11.3821 22.8248 11.1829 22.6301L6.15191 17.7301C5.92245 17.5062 5.76019 17.2227 5.68347 16.9114C5.60676 16.6002 5.61864 16.2737 5.71779 15.9689C5.81694 15.6641 5.99939 15.393 6.24452 15.1865C6.48965 14.9799 6.78768 14.8461 7.10491 14.8001L14.0559 13.7901C14.3316 13.7498 14.5933 13.6433 14.8187 13.4795C15.0441 13.3158 15.2264 13.0998 15.3499 12.8501L18.4579 6.55007C18.5997 6.26234 18.8191 6.02002 19.0914 5.8505C19.3637 5.68098 19.678 5.59103 19.9988 5.59082C20.3195 5.59061 20.634 5.68015 20.9065 5.84932C21.179 6.01849 21.3988 6.26053 21.5409 6.54807Z';

/** 별점 — 채워진 별(#FFCD00)이 twinkle 이면 순서대로 반짝인다 */
export function StarRating({ value, size = 14, twinkle = false }: { value: number; size?: number; twinkle?: boolean }) {
  return (
    <div className="flex items-center">
      {[0, 1, 2, 3, 4].map(i => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          shapeRendering="geometricPrecision"
          className={twinkle && i < Math.floor(value) ? 'star-twinkle' : undefined}
          style={{ display: 'block', flexShrink: 0, animationDelay: `${i * 140}ms` }}
        >
          <path d={STAR_PATH} fill={i < Math.floor(value) ? '#FFCD00' : '#E5E7EB'} />
        </svg>
      ))}
    </div>
  );
}

/** 별 하나(채움) — 상품 상세 위 '★ 4.9 (41)' 줄 */
export function SingleStar({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden shapeRendering="geometricPrecision" style={{ display: 'block', flexShrink: 0 }}>
      <path d={STAR_PATH} fill="#FFCD00" />
    </svg>
  );
}

export function IconTile({ src, size = 26, icon = 24, className = '' }: { src: string; size?: number; icon?: number; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={icon} height={icon} />
    </span>
  );
}

/** 섹션 머리 — 아이콘 + 진회색 제목(xl 22 / lg 19 / sm 15) */
export function SectionHead({ title, icon, size = 'lg', className = '', right }: { title: ReactNode; icon?: string; size?: 'xl' | 'lg' | 'sm'; className?: string; right?: ReactNode }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {icon && <IconTile src={icon} {...(size === 'xl' ? { size: 30, icon: 28 } : {})} />}
      <div className="min-w-0 flex-1">
        <h2 className={`font-bold leading-tight text-[#191F28] ${size === 'xl' ? 'text-[22px]' : size === 'lg' ? 'text-[19px]' : 'text-[15px]'}`}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function ReviewStars({ value, size = 13 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-px" aria-label={`별점 ${value.toFixed(1)}`}>
      {[0, 1, 2, 3, 4].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill={i < full ? '#FFC933' : '#E5E8EB'} />
        </svg>
      ))}
    </span>
  );
}

export type ReviewRowData = {
  id: string;
  name: string;
  avatarSeed?: string;
  rating: number;
  date?: string;
  content: string;
  photos?: { src: string; label?: string }[];
  /** 시술명·비용 같은 회색 보조 줄 */
  meta?: string;
};

/** 리뷰 한 줄 — 댓글형(프사 36 · 이름 15 굵게 + 별 · 본문 16 · 사진 · 회색 날짜). compact = 흘러가는 카드용 */
export function ReviewCommentRow({ review, first = false, menu, compact = false }: { review: ReviewRowData; first?: boolean; menu?: ReactNode; compact?: boolean }) {
  const photos = review.photos || [];
  return (
    <div className={compact ? '' : `py-4 ${first ? '' : 'border-t border-[#F2F4F6]'}`}>
      <div className={`flex ${compact ? 'gap-2' : 'gap-2.5'}`}>
        <Avatar seed={review.avatarSeed || review.name} size={compact ? 28 : 36} alt="" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 ${compact ? 'min-h-[28px]' : 'min-h-[20px]'}`}>
              <span className={`font-bold tracking-[-0.2px] text-[#333D4B] ${compact ? 'text-[14px]' : 'text-[15px]'}`}>{review.name}</span>
              {review.rating > 0 && <ReviewStars value={review.rating} size={compact ? 12 : 13} />}
            </div>
            {menu}
          </div>
          {!compact && review.meta && <p className="mt-0.5 text-[13px] tracking-[-0.2px] text-[#6B7684]">{review.meta}</p>}
          {review.content && (
            <p className={`whitespace-pre-wrap break-words tracking-[-0.2px] text-[#191F28] [overflow-wrap:anywhere] ${compact ? 'mt-1 line-clamp-3 text-[14.5px] leading-[1.55]' : 'mt-1 text-[16px] leading-[1.6]'}`}>
              {review.content}
            </p>
          )}
          {!compact && photos.length > 0 && (
            <div className="mt-2.5 flex gap-1.5 overflow-x-auto hide-scrollbar">
              {photos.slice(0, 6).map((p, i) => (
                <span key={p.src + i} className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[12px] bg-[#F2F4F6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.label || ''} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  {p.label && <span className="absolute left-1 top-1 rounded-[6px] bg-black/50 px-1.5 text-[11px] font-semibold leading-[18px] text-white">{p.label}</span>}
                </span>
              ))}
            </div>
          )}
          {review.date && <p className={`tracking-[-0.2px] text-[#8B95A1] ${compact ? 'mt-1 text-[12.5px]' : 'mt-1.5 text-[13.5px]'}`}>{review.date}</p>}
        </div>
      </div>
    </div>
  );
}

/** 별점 아래 리뷰 카드 줄(옆으로 넘기기) — 둥실 움직임은 뺐다(261029 사장) */
export function FloatingReviewCards({ reviews }: { reviews: ReviewRowData[] }) {
  const items = reviews.filter(r => (r.content || '').trim()).slice(0, 6);
  if (items.length === 0) return null;
  return (
    <div className="-mx-5 mt-2.5 overflow-x-auto px-5 pb-2 pt-1 hide-scrollbar">
      <div className="flex items-start gap-3" style={{ width: 'max-content' }}>
        {items.map((r) => (
          <div
            key={r.id}
            className="w-[248px] shrink-0 rounded-[20px] border border-[#EEF0F3] bg-white p-4"
          >
            <ReviewCommentRow compact review={r} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 펼침 줄(FAQ) — 높이 0fr→1fr 로 열린다(긴 답도 안 잘림) */
export function ExpandRow({ label, open, onToggle, children }: { label: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="border-b border-[#F2F4F6] last:border-0">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 py-4 text-left" aria-expanded={open}>
        <span className="text-[15px] font-semibold text-[#191F28]">{label}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0 transition-transform duration-300" style={{ transform: open ? 'rotate(180deg)' : undefined, color: open ? BRAND : '#8B95A1' }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="grid transition-all duration-500" style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        <div className="overflow-hidden">
          <div className="whitespace-pre-line pb-4 text-[13px] leading-[1.8] text-[#8B95A1]">{children}</div>
        </div>
      </div>
    </div>
  );
}
