'use client';

// 내 리뷰 — 프리티풀 마이(퀵매칭 어법): 요약 카드 + 리뷰 카드(상품 사진·병원·시술명 머리 + 상품 상세 댓글형 리뷰 줄 그대로).
//  · 수정/삭제는 ⋯ 툴팁 메뉴(.pop-menu). 동작은 예전처럼 아직 연결 전(메뉴만 닫힌다).
import Link from 'next/link';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import { QdBody, MY_CARD } from '@/components/detail/QdKit';
import { ReviewCommentRow, StarRating } from '@/components/detail/DetailKit';
import { Screen, MoreMenu, EmptyBlock, NeedLogin } from '@/components/mypage/screens/ScreenKit';

export default function MyReviewsPage() {
  const { isLoggedIn, reviews, products, hospitals } = useStore();

  if (!isLoggedIn) {
    return (
      <Screen>
        <TopBar title="내 리뷰" />
        <NeedLogin />
      </Screen>
    );
  }

  // Use first 4 reviews as user reviews for demo
  const userReviews = reviews.slice(0, 4);

  if (userReviews.length === 0) {
    return (
      <Screen>
        <TopBar title="내 리뷰" />
        <EmptyBlock icon="chat" title="아직 남긴 리뷰가 없어요" desc="시술을 받고 후기를 남기면 이곳에 모여요." />
      </Screen>
    );
  }

  const average = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;

  return (
    <Screen>
      <TopBar title="내 리뷰" sub="내가 남긴 후기를 한곳에 모았어요" />

      <QdBody className="space-y-2.5 px-6 pt-1 pc:px-8">
        {/* 요약 — 전체 개수 · 평균 별점 */}
        <div className={`${MY_CARD} flex items-center justify-between px-5 py-4`}>
          <div>
            <p className="text-[13px] text-[#8B95A1]">남긴 리뷰</p>
            <p className="mt-0.5 text-[24px] font-bold tabular-nums text-[#191F28]">{userReviews.length}<span className="ml-0.5 text-[17px] font-semibold">개</span></p>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-[#8B95A1]">평균 별점</p>
            <div className="mt-1.5 flex items-center justify-end gap-1.5">
              <StarRating value={Number(average.toFixed(1))} size={18} twinkle />
              <span className="text-[20px] font-bold tabular-nums text-[#191F28]">{average.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {userReviews.map((review) => {
          const product = review.productId ? products.find(p => p.id === review.productId) : undefined;
          const hospitalName = (review.hospitalId && hospitals.find(h => h.id === review.hospitalId)?.name) || product?.hospitalName;
          const photos = [
            ...(review.beforeImage ? [{ src: review.beforeImage, label: '전' }] : []),
            ...(review.afterImage ? [{ src: review.afterImage, label: '후' }] : []),
          ];
          const head = (
            <>
              <span className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[12px] bg-[#F2F4F6]">
                {product?.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                {hospitalName && <span className="truncate text-[13px] text-[#8B95A1]">{hospitalName}</span>}
                <span className="line-clamp-1 text-[16px] font-semibold leading-snug text-[#191F28]">{review.treatmentName}</span>
              </span>
            </>
          );
          return (
            <article key={review.id} className={`${MY_CARD} px-[18px] pb-1 pt-4`}>
              {/* 머리 — 상품 사진 · 병원 · 시술명(누르면 상품 상세) */}
              <div className="flex items-center gap-3 border-b border-[#F2F4F6] pb-3.5">
                {product ? (
                  <Link href={`/product/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70">{head}</Link>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3">{head}</div>
                )}
                <MoreMenu
                  label="리뷰 메뉴"
                  items={[
                    { icon: '/icons/toss/pencil.svg', label: '수정하기', run: () => {} },
                    { icon: '/icons/toss/bin.svg', label: '삭제하기', danger: true, run: () => {} },
                  ]}
                />
              </div>

              {/* 본문 — 상품 상세 댓글형 리뷰 줄 그대로 */}
              <ReviewCommentRow
                first
                review={{
                  id: review.id,
                  name: review.authorName,
                  avatarSeed: review.authorId || review.authorName,
                  rating: review.rating,
                  content: review.content,
                  photos,
                  meta: `${review.treatmentDate} 시술 · 총 ${review.totalCost.toLocaleString()}원`,
                  date: `${review.date} 작성`,
                }}
              />
            </article>
          );
        })}
      </QdBody>
    </Screen>
  );
}
