'use client';

// 포켓 한 줄 — 장바구니 줄(체크 · 사진 84 · 병원 13 회색 · 상품명 16 2줄 · 남색 할인율 + 가격 18 굵게 · 원가 취소선). 261031 상품 상세 가격 카드 톤.
//  · 포켓 탭 = 왼쪽 체크 + 오른쪽 위 ×(빼기). 최근 본 탭 = 체크 없이 오른쪽 가방(담기/빼기).
//  · 줄을 누르면 상품 상세. 체크·버튼은 상세로 넘어가지 않게 막는다.
//  · swipe 를 주면(포켓 탭) 오른쪽→왼쪽으로 밀어 버튼(예약하기 · 결제하기)을 꺼낸다 — 프리티풀 채팅 목록 밀기(SwipeActionRow).
//    이때 줄은 화면 끝까지 넓혀(-mx-4) 밀린 내용이 화면 가장자리에서 잘리게 한다.
import { useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { Product } from '@/types';
import { PocketIcon } from '@/components/icons/PocketIcon';
import SwipeActionRow, { type SwipeRowAction } from '@/components/common/SwipeActionRow';
import { resolveProductImageUrl } from '@/lib/images';
import styles from './pocket.module.css';

export type PocketRowSwipe = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: SwipeRowAction[];
  disabled?: boolean;
};

/** 동그란 체크 — 거르기 시트와 같은 결(globals .chk-dot): 켜면 톡 튀며 체크가 그려지고, 끄면 살짝 움츠렸다 돌아온다 */
export function CheckCircle({ on }: { on: boolean }) {
  return (
    <span key={String(on)} aria-hidden="true" className={`chk-dot flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? 'is-on bg-[#2F6FE4]' : 'is-off border-2 border-[#E5E8EB] bg-white'}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={on ? '#fff' : '#D1D6DB'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
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
  swipe,
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
  swipe?: PocketRowSwipe;
  className?: string;
  style?: CSSProperties;
}) {
  const [broken, setBroken] = useState(false);
  const image = resolveProductImageUrl(product.imageUrl, product.id);
  const discount = product.discount ?? 0;
  const showOriginal = !!product.originalPrice && product.originalPrice > product.price;

  const body: ReactNode = (
    <>
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
          <span className="mt-0.5 line-clamp-2 break-words text-[16px] font-medium leading-[1.4] tracking-[-0.3px] text-[#191F28]">{product.title}</span>
          <span className="mt-1.5 flex items-baseline gap-1.5">
            {discount > 0 && <span className="text-[16px] font-bold tabular-nums text-[#1E3A78]">{discount}%</span>}
            <span className="text-[18px] font-bold tabular-nums tracking-[-0.4px] text-[#1E3A78]">{product.price.toLocaleString()}원</span>
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
          className={`absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[12px] transition active:scale-90 ${inPocket ? 'bg-[#EFF5FE] text-[#2F6FE4]' : 'bg-[#F2F4F6] text-[#6B7684]'}`}
        >
          <PocketIcon size={20} filled={inPocket} />
        </button>
      )}
    </>
  );

  if (swipe) {
    return (
      <li className={`relative -mx-4 pc:mx-0 ${leaving ? styles.rowLeave : ''} ${className}`} style={style}>
        <SwipeActionRow open={swipe.open} onOpenChange={swipe.onOpenChange} actions={swipe.actions} disabled={swipe.disabled || leaving}>
          <div className="px-4 pc:px-0">
            <div className="relative flex items-start gap-3 py-4">{body}</div>
          </div>
        </SwipeActionRow>
      </li>
    );
  }

  return (
    <li className={`relative flex items-start gap-3 py-4 ${leaving ? styles.rowLeave : ''} ${className}`} style={style}>
      {body}
    </li>
  );
}
