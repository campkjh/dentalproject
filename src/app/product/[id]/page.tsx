'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  Share2,
  Star,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  MoreHorizontal,
  Maximize2,
} from 'lucide-react';
import FixedBar from '@/components/common/FixedBar';
import Avatar from '@/components/common/Avatar';
import ProductCard from '@/components/common/ProductCard';
import { useStore } from '@/store';
import { resolveHospitalImageUrl, resolveProductImageUrl } from '@/lib/images';

const faqItems = [
  {
    question: '시술 전 준비사항이 있나요?',
    answer: '시술 전 특별한 준비사항은 없습니다. 다만, 시술 당일에는 음식물 섭취를 자제해주시고, 병원 방문 시 편한 복장으로 와주시면 됩니다.',
  },
  {
    question: '시술 후 주의사항은 무엇인가요?',
    answer: '시술 후 24시간 동안은 뜨거운 음식이나 자극적인 음식을 피해주세요. 시술 부위를 손으로 만지지 말아주시고, 처방된 약을 정해진 시간에 복용해주세요.',
  },
  {
    question: '환불 및 취소 규정이 어떻게 되나요?',
    answer: '예약 3일 전까지 무료 취소가 가능합니다. 예약 1~2일 전 취소 시 예약금의 50%가 환불되며, 당일 취소 시에는 환불이 어렵습니다.',
  },
  {
    question: '분할 결제가 가능한가요?',
    answer: '네, 카드 분할 결제가 가능합니다. 병원 방문 시 상담을 통해 최대 12개월까지 무이자 할부 결제를 진행하실 수 있습니다.',
  },
];

function hasReviewImages(review: { beforeImage?: string; afterImage?: string }) {
  return Boolean(review.beforeImage || review.afterImage);
}

function ReviewImagePair({
  beforeImage,
  afterImage,
  size = 'compact',
}: {
  beforeImage?: string;
  afterImage?: string;
  size?: 'compact' | 'large';
}) {
  const both = Boolean(beforeImage && afterImage);
  const labelSize = size === 'large' ? 14 : 11;
  const labelBox = size === 'large' ? { width: 36, height: 28, padding: '4px 14px' } : { width: 28, height: 20, padding: '3px 10px' };

  if (!beforeImage && !afterImage) return null;

  return (
    <div className="flex" style={{ gap: 0 }}>
      {beforeImage && (
        <div
          className="flex-1 aspect-square relative overflow-hidden"
          style={{
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
            borderTopRightRadius: both ? 0 : 12,
            borderBottomRightRadius: both ? 0 : 12,
          }}
        >
          <img src={beforeImage} alt="시술 전" className="h-full w-full object-cover" />
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              fontSize: labelSize,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#8037FF',
              borderTopLeftRadius: 12,
              borderBottomRightRadius: 12,
              lineHeight: size === 'large' ? '14px' : '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...labelBox,
            }}
          >
            전
          </span>
        </div>
      )}
      {afterImage && (
        <div
          className="flex-1 aspect-square relative overflow-hidden"
          style={{
            borderTopRightRadius: 12,
            borderBottomRightRadius: 12,
            borderTopLeftRadius: both ? 0 : 12,
            borderBottomLeftRadius: both ? 0 : 12,
          }}
        >
          <img src={afterImage} alt="시술 후" className="h-full w-full object-cover" />
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              fontSize: labelSize,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#2B313D',
              borderTopRightRadius: 12,
              borderBottomLeftRadius: 12,
              lineHeight: size === 'large' ? '14px' : '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...labelBox,
            }}
          >
            후
          </span>
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { products, hospitals, reviews, wishlist, toggleWishlist, addRecentlyViewed, showToast, user } = useStore();
  const tabs = ['상품설명', '병원정보', '리뷰'];
  const [activeTab, setActiveTab] = useState('상품설명');
  const [tabDirection, setTabDirection] = useState<'left' | 'right'>('right');
  const prevTabIdxRef = useRef(0);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  const activeTabIdx = tabs.indexOf(activeTab);

  const changeTab = (t: string) => {
    const nextIdx = tabs.indexOf(t);
    setTabDirection(nextIdx >= prevTabIdxRef.current ? 'right' : 'left');
    prevTabIdxRef.current = nextIdx;
    setActiveTab(t);
  };

  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[activeTabIdx];
    if (!btn) return;
    setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeTabIdx]);

  useEffect(() => {
    const onResize = () => {
      const btn = tabBtnRefs.current[activeTabIdx];
      if (!btn) return;
      setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeTabIdx]);

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [heartAnim, setHeartAnim] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [heroOutOfView, setHeroOutOfView] = useState(false);
  const reviewSectionRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  // Reviews carousel — scale-down siblings as you scroll. Leftmost (snapped)
  // card stays at 1.0; cards to the right shrink toward 0.9 with distance.
  const reviewsCarouselRef = useRef<HTMLDivElement>(null);
  const reviewsRafRef = useRef<number | null>(null);

  const updateReviewScales = () => {
    const container = reviewsCarouselRef.current;
    if (!container) return;
    const cs = window.getComputedStyle(container);
    const leftPad = parseFloat(cs.paddingLeft) || 0;
    const first = container.children[0] as HTMLElement | undefined;
    const cardWidth = first?.offsetWidth ?? 288;
    const activeX = container.scrollLeft + leftPad + cardWidth / 2;
    for (let i = 0; i < container.children.length; i++) {
      const el = container.children[i] as HTMLElement;
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(activeX - cardCenter);
      const refWidth = el.offsetWidth + 6; // 6px gap between cards
      const t = Math.min(1, dist / refWidth);
      const scale = 1.0 - t * 0.1; // 1.0 → 0.9 with distance
      el.style.transform = `scale(${scale})`;
    }
  };

  const handleReviewsScroll = () => {
    if (reviewsRafRef.current != null) return;
    reviewsRafRef.current = requestAnimationFrame(() => {
      reviewsRafRef.current = null;
      updateReviewScales();
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (reviewSectionRef.current) {
        const rect = reviewSectionRef.current.getBoundingClientRect();
        setShowScrollTop(rect.bottom < 0);
      }
      // Hero out-of-view: when the hero image's bottom edge passes under the header
      // (~48px), swap the header to compact mode (thumb + title).
      if (heroRef.current) {
        const r = heroRef.current.getBoundingClientRect();
        setHeroOutOfView(r.bottom < 48);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const product = products.find((p) => p.id === params.id);

  useEffect(() => {
    if (product) addRecentlyViewed(product.id);
  }, [product, addRecentlyViewed]);

  const hospital = hospitals.find((h) => h.id === product?.hospitalId);

  const productReviews = reviews.filter((r) => r.productId === product?.id);
  const productReviewCount = productReviews.length;

  // Set initial review-card scales after mount + listen for resizes
  useLayoutEffect(() => {
    updateReviewScales();
    const onResize = () => updateReviewScales();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (reviewsRafRef.current != null) cancelAnimationFrame(reviewsRafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productReviews.length]);

  const hospitalProducts = products.filter((p) => p.hospitalId === product?.hospitalId && p.id !== product?.id);

  const isWished = product ? wishlist.includes(product.id) : false;

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">상품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const avgRating = productReviews.length > 0
    ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
    : product.rating.toFixed(1);
  const productImageUrl = resolveProductImageUrl(product.imageUrl, product.id);
  const detailImageUrl = resolveProductImageUrl(product.detailImageUrl || product.imageUrl, product.id);
  const hospitalImageUrl = hospital ? resolveHospitalImageUrl(hospital) : undefined;

  return (
    <div className="bg-white min-h-screen page-enter" style={{ paddingTop: 48, paddingBottom: 72 }}>

      {/* Fixed Header — morphs into a compact "thumb + title" bar once hero
          scrolls off-screen. Heart/Share stay docked right; back arrow stays
          docked left; thumb+title is positioned absolutely so the collapsed
          layout doesn't shift. */}
      <FixedBar position="top" className="lg:hidden">
        <div
          className="relative flex items-center px-2.5"
          style={{
            height: heroOutOfView ? 64 : 48,
            backgroundColor: heroOutOfView ? '#fff' : 'rgba(255,255,255,0.9)',
            backdropFilter: heroOutOfView ? 'none' : 'blur(12px)',
            WebkitBackdropFilter: heroOutOfView ? 'none' : 'blur(12px)',
            borderBottom: heroOutOfView ? '1px solid #F2F3F5' : 'none',
            transition:
              'height 280ms cubic-bezier(0.22, 1, 0.36, 1), background-color 220ms ease-out, border-color 220ms ease-out',
          }}
        >
          {/* Back arrow — always visible, docked left */}
          <button onClick={() => router.back()} className="p-1 -ml-1 z-10 flex-shrink-0">
            <ChevronLeft size={24} style={{ color: '#2B313D' }} />
          </button>

          {/* Thumb + title — fades in when hero is out of view */}
          <div
            className="absolute flex items-center gap-2.5 min-w-0"
            style={{
              left: 48,
              right: 92,
              top: '50%',
              transform: heroOutOfView ? 'translateY(-50%)' : 'translateY(calc(-50% + 6px))',
              opacity: heroOutOfView ? 1 : 0,
              pointerEvents: heroOutOfView ? 'auto' : 'none',
              transition:
                'opacity 240ms ease-out, transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={productImageUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <p className="text-[15px] font-bold text-[#2B313D] truncate leading-tight">
              {product.title}
            </p>
          </div>

          {/* Heart + Share — always visible, docked right */}
          <div className="ml-auto flex items-center gap-3 z-10 flex-shrink-0">
            {user && <button
              onClick={() => { toggleWishlist(product.id); setHeartAnim(true); setTimeout(() => setHeartAnim(false), 400); }}
            >
              <Heart
                size={22}
                className={`${isWished ? 'text-red-500' : ''} ${heartAnim ? 'heart-pop' : ''}`}
                style={{ color: isWished ? '#EF4444' : '#2B313D' }}
                fill={isWished ? '#EF4444' : 'none'}
              />
            </button>}
            <button onClick={() => { if (navigator.share) { navigator.share({ title: product.title, url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href); showToast('링크가 복사되었습니다.'); } }}>
              <Share2 size={22} style={{ color: '#2B313D' }} />
            </button>
          </div>
        </div>
      </FixedBar>

      <div className="lg:max-w-7xl lg:mx-auto lg:grid lg:grid-cols-5 lg:gap-8 lg:py-8 lg:px-6">
      {/* Product Image Area */}
      <div ref={heroRef} className="relative lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
        <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 to-purple-100 flex items-center justify-center overflow-hidden lg:rounded-2xl">
          <img src={productImageUrl} alt={product.title} className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Info Section */}
      <div className="lg:col-span-3 fade-in-up">

      {/* Product Info - open layout, no wrapping */}
      <div className="bg-white px-2.5 pt-5 pb-4">
        <Link href={`/hospital/detail/${product.hospitalId}`} style={{ fontSize: 13, color: '#A4ABBA' }} className="hover:underline">{product.hospitalName}</Link>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D', lineHeight: '28px', marginTop: 4 }}>{product.title}</h1>
        <div className="flex items-center gap-1.5 mt-2">
          <Star size={15} fill="#FBBF24" stroke="#FBBF24" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#2B313D' }}>{avgRating}</span>
          <span style={{ fontSize: 13, color: '#A4ABBA' }}>({productReviewCount})</span>
        </div>

        {/* Pricing - bigger, open */}
        <div className="mt-4">
          {product.originalPrice && (
            <p style={{ fontSize: 14, color: '#A4ABBA', textDecoration: 'line-through' }}>
              {product.originalPrice.toLocaleString()}원
            </p>
          )}
          <div className="flex items-baseline gap-2 mt-0.5">
            {product.discount && (
              <span style={{ fontSize: 24, fontWeight: 600, color: '#8037FF' }}>{product.discount}%</span>
            )}
            <span style={{ fontSize: 24, fontWeight: 600, color: '#2B313D' }}>{product.price.toLocaleString()}원</span>
            <span style={{ fontSize: 12, color: '#A4ABBA' }}>VAT포함</span>
          </div>
        </div>

        {/* Tags - flat, no box */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {product.tags.map((tag) => (
            <span key={tag} style={{ backgroundColor: '#F2F3F5', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#51535C' }} className="px-2.5 py-1">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

      {/* Product Options - separated section */}
      {product.options && product.options.length > 0 && (
        <>
          <div className="bg-white px-2.5 py-4">
            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D', marginBottom: 12 }}>옵션 선택</h3>
            {product.options.map((option, idx) => (
              <div
                key={option.id}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: idx < product.options!.length - 1 ? '1px solid #F2F3F5' : 'none' }}
              >
                <span style={{ fontSize: 14, color: '#51535C' }}>{option.name}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#2B313D' }}>{option.price.toLocaleString()}원</span>
              </div>
            ))}
          </div>
          <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />
        </>
      )}

      {/* Customer Reviews Summary - open */}
      <div ref={reviewSectionRef} className="bg-white px-2.5 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#2B313D' }}>고객후기모음</h2>
          <span className="text-base text-gray-400">{productReviews.length}건</span>
        </div>
        {/* Rating summary with progress bars */}
        {productReviews.length > 0 && (() => {
          const counts = [0, 0, 0, 0, 0];
          productReviews.forEach(r => { const idx = Math.min(Math.max(Math.round(r.rating) - 1, 0), 4); counts[idx]++; });
          const total = productReviews.length;
          return (
            <div className="flex gap-5 mb-4" style={{ padding: '16px', backgroundColor: '#F9F9FB', borderRadius: 12 }}>
              {/* Left: score + stars */}
              <div className="flex flex-col items-center justify-center" style={{ minWidth: 80 }}>
                <span style={{ fontSize: 38, fontWeight: 700, color: '#2B313D', lineHeight: 1 }}>{avgRating}</span>
                <div className="flex gap-0.5 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < Math.round(Number(avgRating)) ? '#FBBF24' : '#E5E7EB'} stroke={i < Math.round(Number(avgRating)) ? '#FBBF24' : '#E5E7EB'} />
                  ))}
                </div>
              </div>
              {/* Right: progress bars */}
              <div className="flex-1 flex flex-col justify-center gap-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = counts[star - 1];
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#A4ABBA', width: 16, textAlign: 'right' }}>{star}</span>
                      <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#FBBF24', transition: 'width 0.3s ease' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#A4ABBA', width: 36, textAlign: 'right' }}>{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {productReviews.length > 0 && (
          <div
            ref={reviewsCarouselRef}
            onScroll={handleReviewsScroll}
            className="flex overflow-x-auto hide-scrollbar pb-2"
            style={{ gap: 6, scrollSnapType: 'x mandatory' }}
          >
            {productReviews.map((review, idx) => {
              const withImages = hasReviewImages(review);
              return (
                <Link
                  key={review.id}
                  href={`/review/${review.id}`}
                  className="flex-shrink-0 flex flex-col card-press origin-left will-change-transform"
                  style={{
                    width: 288,
                    minHeight: withImages ? 358 : 192,
                    borderRadius: 20,
                    backgroundColor: '#F6F6F6',
                    padding: 12,
                    overflow: 'hidden',
                    scrollSnapAlign: 'start',
                    transform: `scale(${idx === 0 ? 1.0 : 0.9})`,
                  }}
                >
                  {withImages && (
                    <ReviewImagePair beforeImage={review.beforeImage} afterImage={review.afterImage} />
                  )}
                  {/* 시술비용 + 시술시기 태그 */}
                  <div className="flex gap-1" style={{ marginTop: withImages ? 8 : 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#2B313D', backgroundColor: 'rgba(200,206,218,0.2)', borderRadius: 6, padding: '2px 6px' }}>{review.totalCost.toLocaleString()}원</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#2B313D', backgroundColor: 'rgba(200,206,218,0.2)', borderRadius: 6, padding: '2px 6px' }}>{review.treatmentDate}</span>
                  </div>
                  {/* 시술명 */}
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#2B313D', marginTop: 6 }} className="truncate">{review.treatmentName}</p>
                  {/* 날짜 */}
                  <p style={{ fontSize: 13, color: '#A4ABBA', marginTop: 2 }}>{review.date}</p>
                  {/* 별점 */}
                  <div className="flex items-center gap-1" style={{ marginTop: 4 }}>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} width={14} height={14} fill={i < review.rating ? '#FBBF24' : '#E5E7EB'} stroke={i < review.rating ? '#FBBF24' : '#E5E7EB'} />
                      ))}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#2B313D' }}>{review.rating.toFixed(1)}</span>
                  </div>
                  {/* 후기 */}
                  <p style={{ fontSize: 14, color: '#51535C', lineHeight: '19px', marginTop: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: withImages ? 3 : 5, WebkitBoxOrient: 'vertical' as const }}>{review.content}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

      {/* Tabs with sliding underline indicator */}
      <div style={{ position: 'sticky', top: 48, zIndex: 30 }} className="bg-white lg:static">
        <div className="relative flex border-b border-gray-100">
          {tabs.map((t, i) => {
            const isActive = activeTab === t;
            return (
              <button
                key={t}
                ref={(el) => {
                  tabBtnRefs.current[i] = el;
                }}
                onClick={() => changeTab(t)}
                className="flex-1 py-3 text-[18px] font-semibold"
                style={{
                  color: isActive ? '#2B313D' : '#A4ABBA',
                  transition: 'color 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {t}
              </button>
            );
          })}
          <span
            aria-hidden
            className="absolute bottom-0 h-[2px] bg-[#2B313D] pointer-events-none"
            style={{
              left: tabIndicator.left,
              width: tabIndicator.width,
              transition:
                'left 380ms cubic-bezier(0.22, 1, 0.36, 1), width 380ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>
      </div>

      {/* Tab Content - open layout */}
      <div
        key={activeTab}
        className={tabDirection === 'right' ? 'tab-slide-right' : 'tab-slide-left'}
      >
      {activeTab === '상품설명' && (
        <div className="bg-white">
          <div className="aspect-[4/3] bg-gradient-to-br from-purple-50 to-purple-50 flex items-center justify-center overflow-hidden">
            <img src={detailImageUrl} alt={`${product.title} 상세 이미지`} className="h-full w-full object-cover" />
          </div>
          {product.description && product.description.trim().length > 0 && (
            <div className="px-5 py-5">
              <p className="text-[15px] leading-[1.7] text-[#191F28] whitespace-pre-wrap break-words">
                {product.description}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === '병원정보' && hospital && (
        <div>
          {/* Hospital cover image carousel — native scroll snap + counter pill */}
          {hospital.coverImages && hospital.coverImages.length > 0 && (
            <HospitalCoverSlider images={hospital.coverImages} />
          )}

          <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

          {/* 병원정보 */}
          <section className="bg-white px-4 py-5">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 16 }}>병원정보</h2>
            <div className="flex items-start gap-3">
              <div className="w-[68px] h-[68px] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#F4F5F7' }}>
                <img src={hospitalImageUrl} alt={hospital.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#2B313D', lineHeight: '24px' }}>{hospital.name}</h3>
                <p style={{ fontSize: 14, color: '#51535C', marginTop: 2 }} className="line-clamp-1">{hospital.address}</p>
                {hospital.tags && hospital.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {hospital.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center"
                        style={{ backgroundColor: '#F2F3F5', borderRadius: 6, fontSize: 13, color: '#51535C', padding: '3px 10px' }}
                      >
                        {tag}
                      </span>
                    ))}
                    {hospital.tags.length > 3 && (
                      <span
                        className="inline-flex items-center"
                        style={{ backgroundColor: '#F2F3F5', borderRadius: 6, fontSize: 13, color: '#A4ABBA', padding: '3px 10px' }}
                      >
                        +{hospital.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => window.open(`https://map.naver.com/p?q=${encodeURIComponent(hospital.address || hospital.name)}`, '_blank')}
              className="btn-press w-full flex items-center justify-center gap-2 mt-4"
              style={{ height: 48, borderRadius: 12, backgroundColor: '#F4F5F7', fontSize: 16, fontWeight: 700, color: '#2B313D' }}
            >
              <img src="/icons/naver-map.png" alt="" width={22} height={22} className="flex-shrink-0" />
              찾아가는길
            </button>
          </section>

          {/* 병원소개 */}
          {hospital.introduction && (
            <>
              <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />
              <section className="bg-white px-4 py-5">
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 12 }}>병원소개</h2>
                <p style={{ fontSize: 15, color: '#51535C', lineHeight: '24px', whiteSpace: 'pre-line' }}>
                  {hospital.introduction}
                </p>
              </section>
            </>
          )}

          {/* 운영일 및 시간 */}
          <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />
          <section className="bg-white px-4 py-5">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 12 }}>운영일 및 시간</h2>
            {hospital.holidayNotice && (
              <p style={{ fontSize: 14, color: '#EF4444', marginBottom: 10 }}>*{hospital.holidayNotice}</p>
            )}
            <div className="space-y-2">
              {hospital.operatingHours.map((oh) => (
                <div key={oh.day} className="flex items-baseline" style={{ gap: 28 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: '#2B313D', width: 16 }}>{oh.day}</span>
                  <span style={{ fontSize: 15, color: oh.isClosed ? '#A4ABBA' : '#51535C' }}>
                    {oh.isClosed ? '휴진' : `${oh.startTime}~${oh.endTime}`}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 병원위치 */}
          <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />
          <section className="bg-white px-4 py-5">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 12 }}>병원위치</h2>
            <div className="relative aspect-[16/10] rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(hospital.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade" title="병원 위치"
              />
              <button
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(hospital.address)}`, '_blank')}
                className="absolute top-2 right-2 w-8 h-8 bg-white rounded-md flex items-center justify-center"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
                aria-label="지도 확대"
              >
                <Maximize2 size={14} className="text-gray-700" />
              </button>
            </div>
            <p style={{ fontSize: 15, color: '#2B313D', marginTop: 12, lineHeight: '22px' }}>{hospital.address}</p>
            {hospital.addressDetail && (
              <p style={{ fontSize: 15, color: '#51535C', marginTop: 6, lineHeight: '22px', whiteSpace: 'pre-line' }}>
                {hospital.addressDetail}
              </p>
            )}
          </section>

          {/* 의사정보 */}
          {hospital.doctors && hospital.doctors.length > 0 && (
            <>
              <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />
              <section className="bg-white px-4 py-5">
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 16 }}>의사정보</h2>
                <div className="space-y-4">
                  {hospital.doctors.map((doctor) => (
                    <Link
                      key={doctor.id}
                      href={`/doctor/${doctor.id}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <Avatar
                        src={doctor.profileImage}
                        role="doctor"
                        seed={doctor.name}
                        size={56}
                        alt={doctor.name}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#2B313D' }}>
                          {doctor.name} {doctor.isOwner ? '대표원장' : doctor.title || '원장'}
                        </p>
                        {doctor.specialty && (
                          <p style={{ fontSize: 14, color: '#51535C', marginTop: 2 }}>
                            {doctor.specialty}
                          </p>
                        )}
                        <p style={{ fontSize: 13, color: '#A4ABBA', marginTop: 2 }}>{hospital.name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* 이 병원에 더많은 상품 — horizontal-scrolling ProductCards */}
          {hospitalProducts.length > 0 && (
            <>
              <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />
              <section className="bg-white pt-5 pb-6">
                <h2 className="px-4" style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 14 }}>
                  이 병원에 더많은 상품
                </h2>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-4">
                  {hospitalProducts.map((hp) => (
                    <div key={hp.id} className="w-[140px] flex-shrink-0">
                      <ProductCard product={hp} />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {activeTab === '병원정보' && !hospital && (
        <div className="bg-white py-10 text-center" style={{ fontSize: 14, color: '#A4ABBA' }}>병원 정보가 없습니다.</div>
      )}

      {activeTab === '리뷰' && (
        <div className="bg-white">
          {productReviews.length > 0 ? (
            <div>
              {productReviews.map((review, idx) => {
                const withImages = hasReviewImages(review);
                return (
                <div key={review.id} className="px-2.5 py-5" style={{ borderBottom: idx < productReviews.length - 1 ? '8px solid #F2F3F5' : 'none' }}>

                  {/* 닉네임 + 메뉴 */}
                  <div className="flex items-center justify-between">
                    <p style={{ fontSize: 16, fontWeight: 600, color: '#2B313D' }}>{review.authorName}</p>
                    <ReviewMenu reviewId={review.id} authorName={review.authorName} />
                  </div>

                  {/* 날짜 */}
                  <p style={{ fontSize: 14, color: '#A4ABBA', marginTop: 2 }}>{review.date}</p>

                  {/* 별점 */}
                  <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} width={24} height={24} fill={i < review.rating ? '#FBBF24' : '#E5E7EB'} stroke={i < review.rating ? '#FBBF24' : '#E5E7EB'} />
                      ))}
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 600, color: '#2B313D' }}>{review.rating.toFixed(1)}</span>
                  </div>

                  {withImages && (
                    <div style={{ marginTop: 14 }}>
                      <ReviewImagePair beforeImage={review.beforeImage} afterImage={review.afterImage} size="large" />
                    </div>
                  )}

                  {/* 시술명 */}
                  <p style={{ fontSize: 18, fontWeight: 600, color: '#2B313D', marginTop: 14 }}>{review.treatmentName}</p>

                  {/* 시술전체비용 */}
                  <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 14, color: '#A4ABBA' }}>시술전체비용</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#2B313D', backgroundColor: 'rgba(200,206,218,0.2)', borderRadius: 8, padding: '4px 10px' }}>{review.totalCost.toLocaleString()}원</span>
                  </div>

                  {/* 시술받은시기 */}
                  <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 14, color: '#A4ABBA' }}>시술받은시기</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#2B313D', backgroundColor: 'rgba(200,206,218,0.2)', borderRadius: 8, padding: '4px 10px' }}>{review.treatmentDate}</span>
                  </div>

                  {/* 후기 내용 - 더보기 */}
                  <ReviewContent content={review.content} />

                </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center" style={{ fontSize: 14, color: '#A4ABBA' }}>아직 작성된 리뷰가 없습니다.</div>
          )}
        </div>
      )}
      </div>{/* End tab content wrapper */}

      <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

      {/* FAQ Section - flat */}
      <div className="bg-white px-2.5 py-5">
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 12 }}>자주묻는질문</h2>
        {faqItems.map((faq, index) => (
          <div key={index} style={{ marginBottom: 4 }}>
            <button
              onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              className="w-full flex items-center justify-between text-left"
              style={{ padding: '12px 8px', borderRadius: 12, transition: 'background-color 0.15s ease', backgroundColor: expandedFaq === index ? '#F6F6F6' : 'transparent' }}
              onMouseDown={(e) => (e.currentTarget.style.backgroundColor = '#F0F0F0')}
              onMouseUp={(e) => (e.currentTarget.style.backgroundColor = expandedFaq === index ? '#F6F6F6' : 'transparent')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = expandedFaq === index ? '#F6F6F6' : 'transparent')}
            >
              <span style={{ fontSize: 16, fontWeight: 600, color: '#2B313D', flex: 1 }}>{faq.question}</span>
              <ChevronDown
                size={18}
                style={{
                  color: '#A4ABBA', flexShrink: 0,
                  transform: expandedFaq === index ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              />
            </button>
            <div
              style={{
                maxHeight: expandedFaq === index ? 300 : 0,
                opacity: expandedFaq === index ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.35s ease, opacity 0.3s ease',
              }}
            >
              <div style={{ padding: '4px 8px 12px 8px' }}>
                <p style={{ fontSize: 16, fontWeight: 500, color: '#51535C', lineHeight: '24px' }}>{faq.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      </div>{/* End Info Section */}
      </div>{/* End grid wrapper */}

      {/* Scroll to top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          position: 'fixed',
          bottom: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: 'rgba(17, 17, 17, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          border: 'none',
          cursor: 'pointer',
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        className="lg:hidden"
      >
        <ChevronUp size={22} style={{ color: '#fff' }} />
      </button>

      {/* Bottom Fixed Bar - portal to body */}
      <FixedBar position="bottom" className="lg:hidden">
        {/* Closed-hours banner */}
        {(() => {
          if (!hospital) return null;
          const dayMap: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
          const now = new Date();
          const todayIdx = now.getDay();
          const todayHour = hospital.operatingHours.find(oh => dayMap[oh.day] === todayIdx);
          if (!todayHour) return null;
          if (todayHour.isClosed) {
            // Find next open day
            const nextOpen = hospital.operatingHours.find((oh, i) => {
              const ohIdx = dayMap[oh.day];
              return ohIdx > todayIdx && !oh.isClosed;
            }) || hospital.operatingHours.find(oh => !oh.isClosed);
            return (
              <div style={{ backgroundColor: '#2B313D', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#fff' }}>
                오늘은 휴진입니다{nextOpen ? ` · ${nextOpen.day}요일 ${nextOpen.startTime}에 운영해요` : ''}
              </div>
            );
          }
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();
          const currentTime = currentHour * 60 + currentMin;
          const [startH, startM] = (todayHour.startTime || '09:00').split(':').map(Number);
          const [endH, endM] = (todayHour.endTime || '18:00').split(':').map(Number);
          const startTime = startH * 60 + startM;
          const endTime = endH * 60 + endM;
          if (currentTime < startTime) {
            return (
              <div style={{ backgroundColor: '#2B313D', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#fff' }}>
                아직 운영시간이 아니에요 · {todayHour.startTime}에 운영해요
              </div>
            );
          }
          if (currentTime > endTime) {
            return (
              <div style={{ backgroundColor: '#2B313D', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#fff' }}>
                오늘 운영이 종료되었습니다
              </div>
            );
          }
          return null;
        })()}
        <div className="bg-white px-2.5" style={{ borderTop: '1px solid #F2F3F5', paddingTop: 10, paddingBottom: 10 }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/booking?productId=${product.id}`)}
              style={{ height: 48, borderRadius: 12, backgroundColor: '#8037FF', fontSize: 16, fontWeight: 700 }}
              className="flex-1 text-white btn-press"
            >
              예약하기
            </button>
            <button
              onClick={() => router.push(`/booking?productId=${product.id}&payment=app`)}
              style={{ height: 48, borderRadius: 12, backgroundColor: '#2B313D', fontSize: 16, fontWeight: 700 }}
              className="flex-1 text-white btn-press"
            >
              앱결제
            </button>
          </div>
        </div>
      </FixedBar>
    </div>
  );
}

function ReviewMenu({ reviewId, authorName }: { reviewId: string; authorName: string }) {
  const [open, setOpen] = useState(false);
  const { showToast, showModal } = useStore();

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1">
        <MoreHorizontal size={20} style={{ color: '#A4ABBA' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl overflow-hidden scale-in" style={{ border: '1px solid #F2F3F5', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', minWidth: 160 }}>
            <button
              onClick={() => {
                setOpen(false);
                showModal('리뷰를 신고하시겠습니까?', '부적절한 리뷰는 검토 후 조치됩니다.', () => {
                  showToast('리뷰가 신고되었습니다.');
                });
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              style={{ fontSize: 14, color: '#2B313D', borderBottom: '1px solid #F2F3F5' }}
            >
              리뷰 신고하기
            </button>
            <button
              onClick={() => {
                setOpen(false);
                showModal(`${authorName}님을 차단하시겠습니까?`, '차단된 유저의 리뷰는 더 이상 표시되지 않습니다.', () => {
                  showToast(`${authorName}님이 차단되었습니다.`);
                });
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              style={{ fontSize: 14, color: '#EF4444' }}
            >
              유저 차단하기
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ReviewContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 200;

  return (
    <div style={{ marginTop: 14, position: 'relative' }}>
      <p style={{
        fontSize: 14, fontWeight: 400, color: '#2C2C2C', lineHeight: '22px',
        ...(isLong && !expanded ? { maxHeight: 220, overflow: 'hidden' } : {}),
      }}>
        {content}
      </p>
      {isLong && !expanded && (
        <>
          <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, white)' }} />
          <button
            onClick={() => setExpanded(true)}
            style={{ fontSize: 13, fontWeight: 600, color: '#8037FF', marginTop: 4, display: 'block' }}
          >
            더보기
          </button>
        </>
      )}
      {isLong && expanded && (
        <button
          onClick={() => setExpanded(false)}
          style={{ fontSize: 13, fontWeight: 600, color: '#A4ABBA', marginTop: 4, display: 'block' }}
        >
          접기
        </button>
      )}
    </div>
  );
}

/* Hospital cover image carousel — native horizontal scroll-snap + position pill.
   Counter updates on scroll, no JS animation needed. */
function HospitalCoverSlider({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="relative bg-gray-100">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        {images.map((src, i) => (
          <div key={i} className="aspect-[4/3] w-full flex-shrink-0 snap-start">
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div
          className="absolute bottom-3 right-3 text-white text-[11px] font-medium px-2 py-1 rounded-full backdrop-blur"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          {idx + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

