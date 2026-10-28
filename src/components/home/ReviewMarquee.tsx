'use client';

// 홈 '나한테 꿀이되는 후기' — 위아래 두 줄이 서로 반대 방향으로 끝없이 흘러가는 캐러셀.
//  · 카드는 흰 바탕 댓글형 줄(프리티풀 ReviewCommentRow) 그대로, 둥실 떠다니는 효과는 없다.
//  · 줄마다 같은 카드를 두 번 이어 붙이고 -50% 까지 옮겨 이음매 없이 돈다. 손가락·마우스를 올리면 멈춘다.
//  · PC(1024↑)는 카드 전체를 정비례로 키운다(zoom — 글자·사진·여백이 같은 비율로).
//  · 움직임 줄이기 설정이면 흐르지 않고 옆으로 밀어 보는 줄로.
import Link from 'next/link';
import type { Product, Review } from '@/types';
import { ReviewCommentRow } from '@/components/detail/DetailKit';
import styles from './review-marquee.module.css';

function ReviewCard({ review, products }: { review: Review; products: Product[] }) {
  const relatedProduct = products.find(p => p.id === review.productId) || products.find(p => p.hospitalId === review.hospitalId);
  const photos = [review.beforeImage, review.afterImage].filter(Boolean) as string[];
  return (
    <Link
      href={relatedProduct ? `/product/${relatedProduct.id}` : `/review/${review.id}`}
      className="flex w-[248px] shrink-0 flex-col rounded-[20px] border border-[#EEF0F3] bg-white p-4 transition-transform active:scale-[0.98]"
    >
      {photos.length > 0 && (
        <div className="mb-3 flex gap-1 overflow-hidden rounded-[14px]">
          {photos.map((src, pi) => (
            <span key={src} className="relative h-[96px] flex-1 bg-[#F2F4F6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute left-1.5 top-1.5 rounded-[6px] bg-black/45 px-1.5 text-[11px] font-semibold leading-[18px] text-white">{pi === 0 && review.beforeImage ? '전' : '후'}</span>
            </span>
          ))}
        </div>
      )}
      <ReviewCommentRow compact review={{ id: review.id, name: review.authorName, avatarSeed: review.authorId || review.authorName, rating: review.rating, date: review.date, content: review.content }} />
      <p className="mt-auto truncate rounded-[10px] bg-[#F7F8FA] px-2.5 py-2 pt-2 text-[12.5px] font-semibold text-[#4E5968]" style={{ marginTop: 10 }}>
        {review.treatmentName} · {review.totalCost.toLocaleString()}원
      </p>
    </Link>
  );
}

function Row({ items, products, reverse }: { items: Review[]; products: Product[]; reverse?: boolean }) {
  if (items.length === 0) return null;
  // 카드 한 장당 약 6초 — 줄 길이가 달라도 같은 빠르기로 흐른다
  const duration = `${Math.max(24, items.length * 6)}s`;
  return (
    <div className={styles.row}>
      <div className={`${styles.track} ${reverse ? styles.reverse : ''}`} style={{ animationDuration: duration }}>
        {[...items, ...items].map((review, i) => (
          <div key={`${review.id}-${i}`} aria-hidden={i >= items.length || undefined} className={styles.cell}>
            <ReviewCard review={review} products={products} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewMarquee({ reviews, products }: { reviews: Review[]; products: Product[] }) {
  if (reviews.length === 0) return null;
  // 번갈아 위·아래 줄로 나눈다(한 줄만 남으면 같은 후기로 두 줄을 채운다)
  const top = reviews.filter((_, i) => i % 2 === 0);
  const bottom = reviews.length > 1 ? reviews.filter((_, i) => i % 2 === 1) : top;
  return (
    <div className={styles.wrap}>
      <Row items={top} products={products} />
      <Row items={bottom} products={products} reverse />
    </div>
  );
}
