'use client';

// 포켓 한 줄 — 장바구니 줄(체크 · 사진 84 · 병원 13 회색 · 상품명 16 굵게 2줄 · 할인율 + 가격 17 굵게 · 원가 취소선).
//  · 포켓 탭 = 왼쪽 체크 + 오른쪽 위 ×(빼기). 최근 본 탭 = 체크 없이 오른쪽 가방(담기/빼기).
//  · 줄을 누르면 상품 상세. 체크·버튼은 상세로 넘어가지 않게 막는다.
import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { Product } from '@/types';
import { PocketIcon } from '@/components/icons/PocketIcon';
import { resolveProductImageUrl } from '@/lib/images';
import styles from './pocket.module.css';

export function CheckCircle({ on }: { on: boolean }) {
  return (
    <span className={styles.check} data-on={on ? 'true' : 'false'} aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function PocketRow({
  product,
  mode,
  checked = false,
  inPocket = false,
  leaving = false,
  onToggleCheck,
  onRemove,
  onTogglePocket,
  className = '',
  style,
}: {
  product: Product;
  mode: 'pocket' | 'recent';
  checked?: boolean;
  inPocket?: boolean;
  leaving?: boolean;
  onToggleCheck?: () => void;
  onRemove?: () => void;
  onTogglePocket?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const [broken, setBroken] = useState(false);
  const image = resolveProductImageUrl(product.imageUrl, product.id);
  const discount = product.discount ?? 0;
  const showOriginal = !!product.originalPrice && product.originalPrice > product.price;

  return (
    <li className={`relative flex items-start gap-3 py-4 ${leaving ? styles.rowLeave : ''} ${className}`} style={style}>
      {mode === 'pocket' && (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`${product.title} 선택`}
          onClick={onToggleCheck}
          className="-m-2 mt-[26px] shrink-0 p-2 transition-transform active:scale-90"
        >
          <CheckCircle on={checked} />
        </button>
      )}

      <Link href={`/product/${product.id}`} className="flex min-w-0 flex-1 items-start gap-3 transition-opacity active:opacity-70">
        <span className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[14px] bg-[#F2F4F6]">
          {!broken && image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setBroken(true)} />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[28px] font-bold text-[#C9CED6]">{product.title.slice(0, 1) || '·'}</span>
          )}
        </span>
        <span className={`min-w-0 flex-1 ${mode === 'pocket' ? 'pr-7' : 'pr-11'}`}>
          <span className="block truncate text-[13px] tracking-[-0.2px] text-[#8B95A1]">{product.hospitalName}{product.location ? ` · ${product.location}` : ''}</span>
          <span className="mt-0.5 line-clamp-2 break-words text-[16px] font-bold leading-[1.4] tracking-[-0.3px] text-[#191F28]">{product.title}</span>
          <span className="mt-1.5 flex items-baseline gap-1.5">
            {discount > 0 && <span className="text-[16px] font-bold tabular-nums text-[#F04452]">{discount}%</span>}
            <span className="text-[17px] font-bold tabular-nums tracking-[-0.3px] text-[#191F28]">{product.price.toLocaleString()}원</span>
            {showOriginal && <span className="text-[13px] tabular-nums text-[#B0B8C1] line-through">{product.originalPrice!.toLocaleString()}원</span>}
          </span>
        </span>
      </Link>

      {mode === 'pocket' ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${product.title} 포켓에서 빼기`}
          className="absolute right-0 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[#B0B8C1] transition active:scale-90 active:bg-[#F2F4F6]"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onTogglePocket}
          aria-label={inPocket ? `${product.title} 포켓에서 빼기` : `${product.title} 포켓에 담기`}
          aria-pressed={inPocket}
          className={`absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition active:scale-90 ${inPocket ? 'bg-[#E8F3FF] text-[#3180F7]' : 'bg-[#F2F4F6] text-[#6B7684]'}`}
        >
          <PocketIcon size={20} filled={inPocket} />
        </button>
      )}
    </li>
  );
}
