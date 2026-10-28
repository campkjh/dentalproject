'use client';

// 상품 '사진 색 카드' — 프리티풀 사진 색 카드(ProToneCard·PartnerToneCard) 결, 토스 쇼핑 카드 모양 그대로.
//  바탕·테두리 = 대표 사진에서 뽑은 색(lib/image-tone), 정사각 사진 아래쪽이 그 색으로 녹아 이어진다.
//  글자 크기는 카드 폭 비례(cqi) — 좁은 2열 그리드에서도 견본과 같은 비율로 보인다.
import { useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { PocketIcon } from '@/components/icons/PocketIcon';
import { Product } from '@/types';
import { resolveProductImageUrl } from '@/lib/images';
import { useImageTone } from '@/lib/image-tone';
import { useStore } from '@/store';

/** 사진 아래쪽을 카드 색으로 녹인다 */
const CARD_FADE = 'linear-gradient(to bottom, #000 0%, #000 55%, rgba(0,0,0,.45) 80%, transparent 100%)';

const fs = (cqi: number, min: number, max: number) => `clamp(${min}px, ${cqi}cqi, ${max}px)`;

function compact(n: number) {
  if (n >= 10000) return `${Math.floor(n / 10000)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}천`;
  return String(n);
}

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const isWished = useStore(s => s.wishlist.includes(product.id));
  const toggleWishlist = useStore(s => s.toggleWishlist);
  const [pop, setPop] = useState(false);
  const image = resolveProductImageUrl(product.imageUrl, product.id);
  const tone = useImageTone(image, 'square');
  const sub = tone?.sub || '#6B7684';
  const chips = ['앱결제', ...(product.rating >= 4.8 ? ['인증병원'] : [])];
  const badge = product.likeCount >= 10 ? '프라임' : (product.discount ?? 0) >= 30 ? '특가' : null;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group card-press block h-full overflow-hidden rounded-[20px] border"
      style={{
        containerType: 'inline-size',
        backgroundColor: tone?.bg || '#F2F4F6',
        borderColor: tone?.line || '#EAEDF0',
        transition: 'background-color .5s ease, border-color .5s ease',
      }}
    >
      <div className="relative aspect-square w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={product.title}
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          style={{ WebkitMaskImage: CARD_FADE, maskImage: CARD_FADE }}
        />
        {badge && (
          <span
            className="absolute inline-flex items-center rounded-[8px] font-bold text-white"
            style={{ left: '3.5cqi', top: '3.5cqi', padding: '0 2.6cqi', height: fs(7.8, 20, 26), fontSize: fs(5, 11, 15), backgroundColor: '#E5484D', letterSpacing: '-0.2px' }}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="relative" style={{ marginTop: '-7cqi', padding: '0 6.5cqi 6.5cqi' }}>
        <p className="line-clamp-2 break-keep font-medium text-[#333D4B]" style={{ fontSize: fs(5.2, 13, 16), lineHeight: 1.5, letterSpacing: '-0.3px' }}>
          {product.title}
        </p>
        <p className="mt-[1.5cqi] flex items-baseline font-bold" style={{ gap: '1.6cqi', letterSpacing: '-0.5px' }}>
          {(product.discount ?? 0) > 0 && <span style={{ fontSize: fs(6.5, 15, 20), color: sub }}>{product.discount}%</span>}
          <span className="text-[#191F28]" style={{ fontSize: fs(7.2, 17, 22) }}>{product.price.toLocaleString()}원</span>
        </p>
        <p className="mt-[1.5cqi] truncate" style={{ fontSize: fs(4.9, 12, 15), color: sub, letterSpacing: '-0.2px' }}>
          <b className="font-semibold">{product.hospitalName}</b>
          {product.location && <> · {product.location}</>}
        </p>
        {(product.likeCount > 0 || product.reviewCount > 0) && (
          <p className="mt-[1cqi] flex items-center" style={{ gap: '1.6cqi', fontSize: fs(4.7, 11.5, 14.5), color: sub }}>
            {product.likeCount > 0 && <span className="inline-flex items-center gap-[3px]" title="포켓에 담은 사람"><PocketIcon size={13} filled strokeWidth={1.6} />{compact(product.likeCount)}명</span>}
            {product.likeCount > 0 && product.reviewCount > 0 && <span aria-hidden className="h-2.5 w-px" style={{ backgroundColor: sub, opacity: 0.35 }} />}
            {product.reviewCount > 0 && <span className="inline-flex items-center gap-[3px]"><Star size={12} fill="currentColor" stroke="none" />{product.rating.toFixed(1)} ({product.reviewCount})</span>}
          </p>
        )}
        <div className="flex items-center justify-between" style={{ marginTop: '3cqi', gap: '2cqi' }}>
          <div className="flex min-w-0 flex-wrap overflow-hidden" style={{ gap: '2cqi', height: fs(10, 24, 32) }}>
            {chips.map(chip => (
              <span key={chip} className="flex items-center whitespace-nowrap rounded-[10px] bg-white/60 font-semibold text-[#333D4B]" style={{ height: fs(10, 24, 32), padding: '0 3cqi', fontSize: fs(4.5, 11, 14), letterSpacing: '-0.2px' }}>
                {chip}
              </span>
            ))}
          </div>
          <button
            type="button"
            aria-label={isWished ? '포켓에서 빼기' : '포켓에 담기'}
            aria-pressed={isWished}
            className="flex shrink-0 items-center justify-center transition-transform active:scale-90"
            style={{ width: fs(10, 26, 34), height: fs(10, 26, 34), color: isWished ? '#3180F7' : '#fff' }}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product.id);
              setPop(true);
              setTimeout(() => setPop(false), 400);
            }}
          >
            {/* 견본 가방 — 흰 굵은 선, 담으면 파랑으로 채움 */}
            <PocketIcon className={pop ? 'heart-pop' : undefined} size="100%" strokeWidth={2.1} filled={isWished} style={{ filter: isWished ? undefined : 'drop-shadow(0 0 .5px rgba(0,0,0,.25))' }} />
          </button>
        </div>
      </div>
    </Link>
  );
}
