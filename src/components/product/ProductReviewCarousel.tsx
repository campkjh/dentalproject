'use client';
import ReviewPhotoViewer from '@/components/reviews/ReviewPhotoViewer';
import { ChevronRight } from 'lucide-react';
import { ReviewCommentRow, type ReviewRowData } from '@/components/detail/DetailKit';
import { maskReviewAuthor } from '@/lib/review-display';

export default function ProductReviewCarousel({ reviews, count, loggedIn, loading, error, onSeeAll }: {
  reviews: ReviewRowData[]; count: number; loggedIn: boolean; loading: boolean; error: boolean; onSeeAll: () => void;
}) {
  if (!count && !reviews.length) return null;
  return <section aria-label="상품 후기 미리보기" className="bg-white py-6">
    <div className="mb-4 flex items-center justify-between gap-3 px-5">
      <h2 className="text-[19px] font-bold tracking-[-.4px] text-[#191F28]">시술 후기 <span className="text-[#2F6FE4]">{count.toLocaleString()}</span></h2>
      <button type="button" onClick={onSeeAll} className="inline-flex min-h-10 items-center gap-1 text-[14px] font-medium text-[#8B95A1]">전체보기<ChevronRight size={17} /></button>
    </div>
    {!loggedIn ? <button type="button" onClick={() => window.dispatchEvent(new Event('dental:login'))} className="mx-5 flex min-h-24 w-[calc(100%_-_40px)] items-center justify-center rounded-[20px] bg-[#F2F4F6] px-5 text-[15px] font-semibold text-[#4E5968]">로그인하고 시술 후기 보기<ChevronRight size={19} className="ml-2 shrink-0" /></button>
      : loading && !reviews.length ? <p role="status" className="px-5 text-[14px] text-[#8B95A1]">후기를 불러오고 있어요.</p>
      : !reviews.length ? <p className="px-5 text-[14px] text-[#8B95A1]">{error ? '후기를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.' : '아직 등록된 후기가 없어요.'}</p>
      : <div role="region" tabIndex={0} aria-label="상품 후기 카드" className="flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 hide-scrollbar">
        {reviews.slice(0, 10).map(review => <article key={review.id} className="w-[min(280px,calc(100vw_-_64px))] shrink-0 snap-start rounded-[20px] border border-[#EEF0F3] bg-white p-4">
          {!!review.photos?.length && <div className="mb-3 flex h-[110px] gap-1 overflow-hidden rounded-xl bg-[#F2F4F6]">{review.photos.slice(0,2).map((photo,i) => <div key={`${photo.src}-${i}`} className="relative min-w-0 flex-1">
            <ReviewPhotoViewer src={photo.src} label={photo.label || '후기 사진'} photos={review.photos} initialIndex={i} className="block h-full w-full" review={{authorName: review.name, rating: review.rating, date: review.date, productTitle: review.productTitle || '', content: review.content}} />
            {photo.label && <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/50 px-1.5 text-[11px] leading-5 text-white">{photo.label}</span>}
          </div>)}</div>}
          <ReviewCommentRow compact review={{ ...review, name: maskReviewAuthor(review.name) }} />
          <button type="button" onClick={onSeeAll} className="mt-3 inline-flex min-h-9 items-center text-[13px] font-semibold text-[#6B7684]">후기 자세히 보기<ChevronRight size={16} /></button>
        </article>)}
      </div>}
  </section>;
}
