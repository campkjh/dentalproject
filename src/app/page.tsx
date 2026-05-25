'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Search, Send, ChevronLeft, ChevronRight, Star, MapPin, X, ArrowUp } from 'lucide-react';
import ProductCard from '@/components/common/ProductCard';
import HomeBannerSlider from '@/components/home/HomeBannerSlider';
import { useStore } from '@/store';
import { resolveHospitalImageUrl } from '@/lib/images';
import { siteConfig } from '@/lib/site-config';

const searchPlaceholders = [
  '입술필러 검색해보세요',
  '임플란트 검색해보세요',
  '라미네이트 검색해보세요',
  '치아미백 검색해보세요',
  '보톡스 검색해보세요',
];

const DISTRICTS = [
  { name: '강남구', lat: 37.4979, lng: 127.0276 },
  { name: '서초구', lat: 37.4837, lng: 127.0324 },
  { name: '송파구', lat: 37.5145, lng: 127.1050 },
  { name: '강동구', lat: 37.5301, lng: 127.1237 },
  { name: '마포구', lat: 37.5564, lng: 126.9236 },
  { name: '종로구', lat: 37.5735, lng: 126.9790 },
  { name: '중구', lat: 37.5636, lng: 126.9976 },
  { name: '영등포구', lat: 37.5247, lng: 126.8965 },
  { name: '동작구', lat: 37.5124, lng: 126.9396 },
  { name: '관악구', lat: 37.4784, lng: 126.9516 },
  { name: '양천구', lat: 37.5170, lng: 126.8664 },
  { name: '금천구', lat: 37.4568, lng: 126.8956 },
];

function detectDistrict(lat: number, lng: number): string {
  let closest = DISTRICTS[0];
  let minDist = Infinity;
  for (const d of DISTRICTS) {
    const dist = Math.hypot(lat - d.lat, lng - d.lng);
    if (dist < minDist) { minDist = dist; closest = d; }
  }
  return closest.name;
}

export default function HomePage() {
  const router = useRouter();
  const { products, hospitals, reviews, categories, isLoggedIn, isDoctor, recentlyViewed, recentSearches, removeRecentSearch, catalogHydrated } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollTopLeaving, setScrollTopLeaving] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const showScrollTopRef = useRef(false);
  const scrollTopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentLocation, setCurrentLocation] = useState('내 근처');

  useEffect(() => {
    if (isLoggedIn && isDoctor) router.replace('/partner');
  }, [isLoggedIn, isDoctor, router]);

  // Detect current location on mount — silent fallback, never shows error
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!navigator?.geolocation) return;
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const detected = detectDistrict(latitude, longitude);
          setCurrentLocation(detected);
        },
        () => {
          // Permission denied or timeout — just keep "내 근처" silently
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    } catch {
      // Ignore — geolocation not available
    }
  }, []);

  const popularProducts = products.slice(0, 6);
  const recentProducts = recentlyViewed
    .map(id => products.find(p => p.id === id))
    .filter(Boolean) as typeof products;
  const dentalProducts = products.filter(p => p.category === 'dental').slice(0, 4);
  const plasticProducts = products.filter(p => p.category === 'plastic').slice(0, 4);

  // 이번 주 인기 많은 패키지: 리뷰 많은 순
  const weeklyPopularPackages = [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 8);
  // 이런 패키지는 어때요?: 할인율 높은 순
  const suggestedPackages = [...products].filter(p => p.discount).sort((a, b) => (b.discount || 0) - (a.discount || 0)).slice(0, 8);
  // 요즘 뜨고 있는 병원
  const trendingHospitals = hospitals.slice(0, 6);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const isPastHeader = scrollTop > 50;
      setScrolled(isPastHeader);

      if (isPastHeader) {
        if (scrollTopTimerRef.current) {
          clearTimeout(scrollTopTimerRef.current);
          scrollTopTimerRef.current = null;
        }
        showScrollTopRef.current = true;
        setShowScrollTop(true);
        setScrollTopLeaving(false);
        return;
      }

      if (!showScrollTopRef.current) return;
      setScrollTopLeaving(true);
      if (scrollTopTimerRef.current) clearTimeout(scrollTopTimerRef.current);
      scrollTopTimerRef.current = setTimeout(() => {
        showScrollTopRef.current = false;
        setShowScrollTop(false);
        setScrollTopLeaving(false);
      }, 260);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollTopTimerRef.current) clearTimeout(scrollTopTimerRef.current);
    };
  }, []);

  // Category dock detection (when category section scrolls past the header)
  const categorySectionRef = useRef<HTMLDivElement>(null);
  const [dockProgress, setDockProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = categorySectionRef.current;
      if (!el) {
        setDockProgress(0);
        return;
      }
      const rect = el.getBoundingClientRect();
      // Start docking when category bottom approaches header (160→40px window)
      const start = 160;
      const end = 40;
      const raw = (start - rect.bottom) / (start - end);
      const clamped = Math.max(0, Math.min(1, raw));
      // Ease-out for softer settle
      const eased = 1 - Math.pow(1 - clamped, 2);
      setDockProgress(eased);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Slot machine placeholder rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setPlaceholderIdx(prev => (prev + 1) % searchPlaceholders.length);
        setAnimating(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="pb-[86px] lg:pb-0 page-enter">
      {/* Sticky Header */}
      <div
        ref={headerRef}
        style={{ position: 'sticky', top: 0, zIndex: 40 }}
        className="bg-white lg:hidden transition-all duration-300"
      >
        {/* Default Header (logo + icons) */}
        <div className={`flex items-center justify-between px-2.5 py-3 transition-all duration-300 ${scrolled ? 'h-0 overflow-hidden opacity-0 py-0' : 'opacity-100'}`}>
          <span className="text-lg font-bold text-[#8037FF]">로고</span>
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link
                href="/search"
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 transition-all duration-200 active:scale-110"
                style={{
                  background: 'rgba(255, 255, 255, 0.56)',
                  border: '1px solid rgba(255, 255, 255, 0.72)',
                  boxShadow: '0 8px 24px rgba(17, 24, 39, 0.10)',
                  backdropFilter: 'blur(16px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                }}
              >
                <Search size={20} />
              </Link>
              <Link
                href="/notifications"
                className="relative w-10 h-10 rounded-full flex items-center justify-center text-gray-800 transition-all duration-200 active:scale-110"
                style={{
                  background: 'rgba(255, 255, 255, 0.56)',
                  border: '1px solid rgba(255, 255, 255, 0.72)',
                  boxShadow: '0 8px 24px rgba(17, 24, 39, 0.10)',
                  backdropFilter: 'blur(16px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                }}
              >
                <Send size={22} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">23</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm px-3.5 py-2 rounded-full font-semibold text-gray-900 transition-all duration-200 active:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.58)',
                  border: '1px solid rgba(255, 255, 255, 0.74)',
                  boxShadow: '0 8px 24px rgba(17, 24, 39, 0.10)',
                  backdropFilter: 'blur(16px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                }}
              >
                로그인
              </Link>
              <Link
                href="/search"
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 transition-all duration-200 active:scale-110"
                style={{
                  background: 'rgba(255, 255, 255, 0.58)',
                  border: '1px solid rgba(255, 255, 255, 0.74)',
                  boxShadow: '0 8px 24px rgba(17, 24, 39, 0.10)',
                  backdropFilter: 'blur(16px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                }}
              >
                <Search size={20} />
              </Link>
            </div>
          )}
        </div>

        {/* Scrolled Header (pill search bar + location) */}
        <div className={`px-2.5 transition-all duration-300 ${scrolled ? 'py-2 opacity-100' : 'h-0 overflow-hidden opacity-0 py-0'}`}>
          <button
            onClick={() => router.push('/search')}
            style={{
              height: 44,
              borderRadius: 9999,
              border: '1.4px solid #E5E7EB',
              backgroundColor: '#F9F9F9',
            }}
            className="w-full flex items-center gap-2 pl-1.5 pr-4 text-left"
          >
            {/* Location chip */}
            <span
              className="flex items-center gap-1 flex-shrink-0 bg-white rounded-full px-2.5"
              style={{ height: 32, border: '1px solid #E5E7EB' }}
            >
              <MapPin size={12} className="text-[#8037FF]" />
              <span className="text-[12px] font-semibold text-gray-800 whitespace-nowrap leading-none">
                {currentLocation}
              </span>
            </span>
            {/* Divider */}
            <span className="flex-shrink-0 w-px h-4 bg-gray-200" />
            {/* Rotating placeholder */}
            <div style={{ fontSize: 14, height: 20, overflow: 'hidden' }} className="flex-1 relative min-w-0">
              <span
                className={`block text-gray-400 truncate transition-all duration-300 ${
                  animating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
                }`}
              >
                {searchPlaceholders[placeholderIdx]}
              </span>
            </div>
            <Search size={18} className="text-gray-400 flex-shrink-0" />
          </button>
        </div>

        {/* Docked compact category bar — pill style, shrinks in with scroll */}
        <div
          className="relative"
          style={{
            maxHeight: dockProgress * 52,
            opacity: Math.min(1, dockProgress * 1.6),
            transform: `translateY(${(1 - dockProgress) * -6}px)`,
            overflow: 'hidden',
            boxShadow: dockProgress > 0.4 ? '0 1px 0 #F2F3F5' : 'none',
            transition: 'box-shadow 320ms ease',
          }}
        >
          <div
            className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar px-2.5 py-2"
            style={{ scrollBehavior: 'smooth' }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/search?category=${cat.id}`}
                className="flex items-center gap-1.5 flex-shrink-0 card-press rounded-full bg-[#F4F5F7] hover:bg-gray-200 transition-colors"
                style={{
                  height: 34,
                  paddingLeft: 6,
                  paddingRight: 12,
                  transform: `scale(${0.94 + dockProgress * 0.06})`,
                  transformOrigin: 'center',
                  transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <img
                  src={cat.icon}
                  alt=""
                  className="flex-shrink-0"
                  style={{ width: 22, height: 22 }}
                />
                <span className="text-[12px] text-gray-700 font-semibold whitespace-nowrap leading-none">
                  {cat.name}
                </span>
              </Link>
            ))}
            {/* Right spacer so last pill isn't cut off visually */}
            <div className="flex-shrink-0" style={{ width: 8 }} />
          </div>
          {/* Right-edge gradient fade */}
          <div
            className="absolute top-0 right-0 bottom-0 pointer-events-none"
            style={{
              width: 20,
              background: 'linear-gradient(to left, #fff, rgba(255,255,255,0))',
              opacity: dockProgress,
            }}
          />
        </div>
      </div>

      {/* Desktop content wrapper */}
      <div className="lg:bg-white lg:rounded-2xl lg:shadow-sm lg:my-6">

        <HomeBannerSlider />

        {/* Categories — 5x2 pager (swipe horizontally) */}
        <div ref={categorySectionRef}>
          <CategoryPager />
        </div>

        {/* 최근 본 태그 */}
        <RecentTagsSection tags={recentSearches} onRemove={removeRecentSearch} />

        {/* 스켈레톤 — catalog hydrate 전 */}
        {!catalogHydrated && products.length === 0 && <HomeSkeleton />}

        {/* 최근 본 상품 */}
        <RecentlyViewedSection
          recentProducts={recentProducts}
          fallback={popularProducts}
        />

        {/* 치과 섹션 */}
        {dentalProducts.length > 0 && (
          <div className="mb-8">
            <SectionHeader
              title="치과"
              subtitle="치아미백부터 임플란트까지 인기 시술을 모았어요."
              icon="/icons/dental.svg"
              action={<MoreButton href="/search?category=dental" />}
            />
            <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-2 lg:grid lg:grid-cols-4 lg:gap-1.5 lg:overflow-visible">
                {dentalProducts.map((product) => (
                  <div key={product.id} className="w-[42vw] max-w-[180px] flex-shrink-0 lg:w-auto lg:max-w-none lg:flex-shrink">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 성형외과 섹션 */}
        {plasticProducts.length > 0 && (
          <div className="mb-8">
            <SectionHeader
              title="성형외과"
              subtitle="요즘 많이 찾는 성형·리프팅 패키지를 확인해보세요."
              icon="/icons/plastic.svg"
              action={<MoreButton href="/search?category=plastic" />}
            />
            <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-2 lg:grid lg:grid-cols-4 lg:gap-1.5 lg:overflow-visible">
                {plasticProducts.map((product) => (
                  <div key={product.id} className="w-[42vw] max-w-[180px] flex-shrink-0 lg:w-auto lg:max-w-none lg:flex-shrink">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 근처 핫플레이스 알아보기 */}
        <NearbyHotPlaces currentLocation={currentLocation} hospitals={hospitals} />

        {/* 나한테 꿀이되는 후기 */}
        <div className="mb-8">
          <SectionHeader title="나한테 꿀이되는 후기" subtitle="실제 방문자가 남긴 시술 경험을 살펴보세요." />
          <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2" style={{ scrollSnapType: 'x mandatory' }}>
              {reviews.slice(0, 10).map((review) => {
                const hospital = hospitals.find(h => h.id === review.hospitalId);
                const relatedProduct = products.find(p => p.id === review.productId || p.hospitalId === review.hospitalId);
                const hasReviewImages = Boolean(review.beforeImage || review.afterImage);
                return (
	                  <Link
	                    key={review.id}
	                    href={relatedProduct ? `/product/${relatedProduct.id}` : '#'}
	                    className="flex-shrink-0 block"
	                    style={{ width: 230, scrollSnapAlign: 'start' }}
	                  >
                      {hasReviewImages && (
                        <div className="relative overflow-hidden" style={{ borderRadius: '14px 14px 0 0', backgroundColor: '#111' }}>
                          <div className="flex">
                            {review.beforeImage && (
                              <div className="relative flex-1 h-[104px]" style={{ backgroundColor: '#EBEBEB' }}>
                                <img src={review.beforeImage} alt="시술 전" className="h-full w-full object-cover" />
                                <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.45)', borderRadius: 999, padding: '2px 6px' }}>전</span>
                              </div>
                            )}
                            {review.afterImage && (
                              <div className="relative flex-1 h-[104px]" style={{ backgroundColor: '#DEDEDE' }}>
                                <img src={review.afterImage} alt="시술 후" className="h-full w-full object-cover" />
                                <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(49,130,246,0.84)', borderRadius: 999, padding: '2px 6px' }}>후</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
	                    {/* 카드 본문 */}
	                    <div style={{ backgroundColor: '#F6F6F8', borderRadius: hasReviewImages ? '0 0 14px 14px' : '14px', padding: '10px 12px' }}>
	                      <p className="truncate" style={{ fontSize: 12, color: '#C8CEDA' }}>
	                        {hospital?.location || currentLocation} · {hospital?.name || review.authorName}
	                      </p>
	                      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#2B313D', marginTop: 4, lineHeight: '20px' }} className="line-clamp-1">
	                        {review.treatmentName}
	                      </h3>
	                      <div className="flex items-center gap-1" style={{ marginTop: 5 }}>
	                        <Star size={13} fill="#FBBF24" stroke="#FBBF24" />
	                        <span style={{ fontSize: 12, fontWeight: 600, color: '#2B313D' }}>{review.rating.toFixed(1)}</span>
	                        <span style={{ fontSize: 12, color: '#A4ABBA' }}>({relatedProduct?.reviewCount?.toLocaleString() || '0'})</span>
	                      </div>
	                      <p style={{ fontSize: 16, fontWeight: 700, color: '#111111', marginTop: 4 }}>
	                        {review.totalCost.toLocaleString()}원
	                      </p>
	                      <div className="flex items-center gap-1" style={{ marginTop: 7 }}>
	                        <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 500, color: '#8037FF', backgroundColor: '#F4EFFF', borderRadius: 4, padding: '2px 6px' }}>
	                          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
	                          앱결제
	                        </span>
	                        <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 500, color: '#10B981', backgroundColor: '#ECFDF5', borderRadius: 4, padding: '2px 6px' }}>
	                          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
	                          앱예약
	                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* 이번 주 인기 많은 패키지 */}
        <div className="mb-8">
          <SectionHeader
            title="이번 주 인기 많은 패키지"
            subtitle="후기가 많은 패키지부터 빠르게 비교해보세요."
            action={<MoreButton href="/search" />}
          />
          <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-2 lg:grid lg:grid-cols-4 lg:gap-1.5 lg:overflow-visible">
              {weeklyPopularPackages.map((product) => (
                <div key={product.id} className="w-[42vw] max-w-[180px] flex-shrink-0 lg:w-auto lg:max-w-none lg:flex-shrink">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 이런 패키지는 어때요? */}
        <div className="mb-8">
          <SectionHeader
            title="이런 패키지는 어때요?"
            subtitle="할인율이 좋은 시술을 골라 추천해드려요."
            action={<MoreButton href="/search" />}
          />
          <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-2 lg:grid lg:grid-cols-4 lg:gap-1.5 lg:overflow-visible">
              {suggestedPackages.map((product) => (
                <div key={product.id} className="w-[42vw] max-w-[180px] flex-shrink-0 lg:w-auto lg:max-w-none lg:flex-shrink">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 요즘 뜨고 있는 병원 */}
        <div className="mb-8">
          <SectionHeader title="요즘 뜨고 있는 병원" subtitle="평점과 후기가 좋은 병원을 둘러보세요." />
          <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2" style={{ scrollSnapType: 'x mandatory' }}>
              {(() => {
                const BLOB = 'https://4ipmgcqyzk6ysqa7.public.blob.vercel-storage.com';
                const hospitalCovers = [
                  `${BLOB}/etc_1620284296.jpg`,
                  `${BLOB}/etc_1669967008.jpg`,
                  `${BLOB}/etc_1672388697.jpg`,
                  `${BLOB}/etc_1698051602.jpg`,
                  `${BLOB}/etc_1721806033.jpg`,
                  `${BLOB}/etc_1723509679.jpg`,
                  `${BLOB}/etc_1753324431.jpg`,
                  `${BLOB}/etc_1754971619.jpg`,
                  `${BLOB}/etc_1770601235.jpg`,
                ];
                return trendingHospitals.map((hp, hpIdx) => {
                const hpReviews = reviews.filter(r => r.hospitalId === hp.id);
                const topReview = hpReviews[0];
                const coverSrc = hp.coverImages?.[0] || hospitalCovers[hpIdx % hospitalCovers.length];
                const logoSrc = resolveHospitalImageUrl(hp);
                return (
                  <Link
                    key={hp.id}
                    href={`/hospital/detail/${hp.id}`}
                    className="flex-shrink-0 block"
                    style={{ width: 286, scrollSnapAlign: 'start' }}
                  >
                    {/* 커버 이미지 */}
                    <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '64/26' }}>
                      <img src={coverSrc} alt={hp.name} className="w-full h-full object-cover" />
                      {/* 로고 */}
                      <div className="absolute top-3 left-3 w-8 h-8 bg-white/90 rounded-full overflow-hidden flex items-center justify-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                        <img src={logoSrc} alt="" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    {/* 정보 */}
                    <div style={{ padding: '12px 4px' }}>
                      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#2B313D' }}>{hp.name}</h3>
                      {topReview && (
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#8037FF', marginTop: 4 }}>
                          {topReview.treatmentName} 후기 {hpReviews.length}개
                        </p>
                      )}
                      <div className="flex items-center gap-1" style={{ marginTop: 6, fontSize: 14, color: '#A4ABBA' }}>
                        <Star size={14} fill="#FBBF24" stroke="#FBBF24" />
                        <span style={{ fontWeight: 600, color: '#2B313D' }}>{hp.rating.toFixed(1)}</span>
                        <span>· 후기 {hp.reviewCount.toLocaleString()}개</span>
                        <span>· {hp.location}</span>
                      </div>
                    </div>
                  </Link>
                );
              });
              })()}
            </div>
          </div>
        </div>

        {/* 인기 상품 */}
        <div className="mb-6">
          <SectionHeader
            title="인기 상품"
            subtitle="많이 찜하고 예약한 상품을 확인해보세요."
            action={<MoreButton href="/search" label="전체보기" />}
          />
          <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 stagger-children">
              {popularProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>

      </div>{/* End desktop content wrapper */}

      {/* Footer */}
      <div className="mt-8 px-2.5 py-6 text-xs text-gray-400 border-t border-gray-100 lg:hidden">
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-4 text-gray-500">
          <Link href="/terms/privacy" className="hover:text-gray-700 underline">개인정보처리방침</Link>
          <Link href="/terms/service" className="hover:text-gray-700 underline">서비스이용약관</Link>
          <Link href="/terms/thirdparty" className="hover:text-gray-700 underline">제3자정보제공동의</Link>
          <Link href="/terms/refund" className="hover:text-gray-700 underline">환불약관</Link>
          <Link href="/terms/withdrawal" className="hover:text-gray-700 underline">회원탈퇴 문의</Link>
          <Link href="/terms/meta" className="hover:text-gray-700 underline">META서비스 이용방침</Link>
        </div>
        <p>{siteConfig.companyName}은 통신판매중개자로서 통신판매의 당사자가 아니며 개별 판매자가 제공하는 서비스에 대한 이행, 계약사항 등과 관련한 의무와 책임은 거래 당사자에게 있습니다.</p>
        <p className="mt-2">통신판매업신고번호 : {siteConfig.mailOrderNumber}</p>
        <p>{siteConfig.companyName}{siteConfig.postalCode ? ` | 우 ${siteConfig.postalCode}` : ''}</p>
        <p>주소 {siteConfig.address}</p>
        <p className="mt-1">T {siteConfig.phone} | E {siteConfig.email}</p>
        <p className="mt-1">{siteConfig.representative} | {siteConfig.businessNumber}</p>
        <p>Copyright(c) {siteConfig.copyrightName}. All right reserved.</p>
      </div>

      {showScrollTop &&
        createPortal(
          <button
            type="button"
            aria-label="상단으로 이동"
            onClick={scrollToTop}
            className={`${scrollTopLeaving ? 'scroll-top-leave' : 'scroll-top-bounce'} scroll-top-button fixed z-[10000] w-12 h-12 rounded-full p-0 text-gray-950`}
            style={{
              bottom: '104px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.82)',
              border: '1px solid rgba(229, 231, 235, 0.92)',
              boxShadow: '0 12px 34px rgba(17, 24, 39, 0.22)',
              backdropFilter: 'blur(18px) saturate(170%)',
              WebkitBackdropFilter: 'blur(18px) saturate(170%)',
            }}
          >
            <span className="scroll-top-button-inner">
              <ArrowUp size={21} strokeWidth={1.9} />
            </span>
          </button>,
          document.body
        )}

    </div>
  );
}

/* ===================== 근처 핫플레이스 ===================== */

const BLOB = 'https://4ipmgcqyzk6ysqa7.public.blob.vercel-storage.com';
const HOTSPOTS = [
  {
    id: 'suwon',
    name: '수원',
    sub: '행궁동',
    region: '수원시',
    tags: ['#아늑한 카페'],
    image: `${BLOB}/etc_1620284296.jpg`,
    color: '#8037FF',
  },
  {
    id: 'gangnam',
    name: '강남',
    sub: '',
    region: '서울시 강남구',
    tags: ['#놀면뭐하니'],
    image: `${BLOB}/etc_1669967008.jpg`,
    color: '#8037FF',
  },
  {
    id: 'apgujeong',
    name: '압구정',
    sub: '',
    region: '서울시 강남구',
    tags: ['#페미아드 시그니처...'],
    image: `${BLOB}/etc_1672388697.jpg`,
    color: '#10B981',
  },
  {
    id: 'hongdae',
    name: '홍대',
    sub: '합정',
    region: '서울시 마포구',
    tags: ['#힙한 거리'],
    image: `${BLOB}/etc_1698051602.jpg`,
    color: '#F59E0B',
  },
  {
    id: 'jamsil',
    name: '잠실',
    sub: '송파',
    region: '서울시 송파구',
    tags: ['#석촌호수'],
    image: `${BLOB}/etc_1721806033.jpg`,
    color: '#EF4444',
  },
  {
    id: 'yeouido',
    name: '여의도',
    sub: '',
    region: '서울시 영등포구',
    tags: ['#한강뷰'],
    image: `${BLOB}/etc_1723509679.jpg`,
    color: '#06B6D4',
  },
];

/* ===================== Home Skeleton ===================== */
function HomeSkeleton() {
  return (
    <div className="px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto space-y-8 mb-8">
      {/* 핫플레이스 skeleton */}
      <div>
        <div className="skeleton h-5 w-48 mb-2" />
        <div className="skeleton h-3 w-64 mb-4" />
        <div className="flex gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center" style={{ width: 140 }}>
              <div className="skeleton h-5 w-24 rounded-full mb-2" />
              <div
                className="skeleton"
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '100px 100px 100px 12px',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 상품 카드 skeleton */}
      <div>
        <div className="skeleton h-5 w-44 mb-3" />
        <div className="flex gap-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 space-y-2" style={{ width: 'calc(42vw)' }}>
              <div className="skeleton aspect-square rounded-xl" />
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>

      {/* 두 번째 상품 라인 */}
      <div>
        <div className="skeleton h-5 w-52 mb-3" />
        <div className="flex gap-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 space-y-2" style={{ width: 'calc(42vw)' }}>
              <div className="skeleton aspect-square rounded-xl" />
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>

      {/* 후기 skeleton */}
      <div>
        <div className="skeleton h-5 w-40 mb-3" />
        <div className="flex gap-2.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-shrink-0 space-y-2" style={{ width: 286 }}>
              <div className="skeleton h-36 rounded-xl" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>

      {/* 병원 skeleton */}
      <div>
        <div className="skeleton h-5 w-36 mb-3" />
        <div className="flex gap-2.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-shrink-0 space-y-2" style={{ width: 286 }}>
              <div className="skeleton rounded-2xl" style={{ aspectRatio: '64/26' }} />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NearbyHotPlaces({
  currentLocation,
  hospitals,
}: {
  currentLocation: string;
  hospitals: { id: string; location: string; name: string }[];
}) {
  const sorted = [...HOTSPOTS].sort((a, b) => {
    const aMatch = currentLocation.includes(a.name) ? -1 : 0;
    const bMatch = currentLocation.includes(b.name) ? -1 : 0;
    return aMatch - bMatch;
  });

  return (
    <div className="mb-8">
      <SectionHeader title="근처 핫플레이스 알아보기" subtitle="나와 가까운 핫플이 어디인지 알려드려요." />
      <div className="px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto">
        <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-2">
          {sorted.map((spot) => (
            <Link
              key={spot.id}
              href={`/search?region=${encodeURIComponent(spot.region)}`}
              className="flex-shrink-0 flex flex-col items-center card-press"
              style={{ width: 140 }}
            >
              {/* Container: bubble overlaps image top */}
              <div className="relative" style={{ paddingTop: 16 }}>
                {/* Speech bubble — overlaps top of image */}
                <div
                  className="absolute left-1/2 z-10 flex flex-col items-center"
                  style={{ top: 0, transform: 'translateX(-50%)', gap: 0 }}
                >
                  <span
                    className="text-[13px] font-medium text-gray-800 bg-white rounded-full px-3 py-1 whitespace-nowrap max-w-[140px] truncate"
                    style={{
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      marginBottom: -1,
                    }}
                  >
                    {spot.tags[0]}
                  </span>
                  {/* Tail — flush against pill */}
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderTop: '5px solid #fff',
                      filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.04))',
                    }}
                  />
                </div>

                {/* Image shape with dimmed overlay + text inside */}
                <div
                  className="relative overflow-hidden"
                  style={{
                    width: 140,
                    height: 140,
                    aspectRatio: '1/1',
                    borderRadius: '100px 100px 100px 12px',
                    marginTop: 8,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spot.image}
                    alt={spot.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Dim overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 60%)',
                    }}
                  />
                  {/* Text inside image */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[16px] font-bold text-white leading-tight">
                      {spot.name}
                    </p>
                    {spot.sub && (
                      <p className="text-[13px] font-medium text-white/80 leading-tight">
                        {spot.sub}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryPager() {
  const categories = useStore((s) => s.categories);
  const pageSize = 10; // 5 cols x 2 rows
  const totalPages = Math.ceil(categories.length / pageSize);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const pageIndex = Math.round(el.scrollLeft / el.clientWidth);
    setActivePage(pageIndex);
  };

  const scrollToPage = (direction: 'prev' | 'next') => {
    const el = scrollerRef.current;
    if (!el) return;
    const nextPage =
      direction === 'prev'
        ? Math.max(0, activePage - 1)
        : Math.min(totalPages - 1, activePage + 1);

    el.scrollTo({
      left: nextPage * el.clientWidth,
      behavior: 'smooth',
    });
    setActivePage(nextPage);
  };

  return (
    <div className="mb-8 lg:max-w-7xl lg:mx-auto">
      <div className="relative">
        {totalPages > 1 && (
          <>
            {activePage > 0 && (
              <button
                type="button"
                aria-label="이전 카테고리"
                onClick={() => scrollToPage('prev')}
                className="absolute left-1 lg:left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center text-gray-800 transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(255, 255, 255, 0.58)',
                  border: '1px solid rgba(255, 255, 255, 0.72)',
                  boxShadow: '0 8px 28px rgba(17, 24, 39, 0.14)',
                  backdropFilter: 'blur(16px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                }}
              >
                <ChevronLeft size={20} strokeWidth={2.4} />
              </button>
            )}
            {activePage < totalPages - 1 && (
              <button
                type="button"
                aria-label="다음 카테고리"
                onClick={() => scrollToPage('next')}
                className="absolute right-1 lg:right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center text-gray-800 transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(255, 255, 255, 0.58)',
                  border: '1px solid rgba(255, 255, 255, 0.72)',
                  boxShadow: '0 8px 28px rgba(17, 24, 39, 0.14)',
                  backdropFilter: 'blur(16px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                }}
              >
                <ChevronRight size={20} strokeWidth={2.4} />
              </button>
            )}
          </>
        )}

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto hide-scrollbar"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {Array.from({ length: totalPages }).map((_, pageIdx) => {
            const pageItems = categories.slice(pageIdx * pageSize, (pageIdx + 1) * pageSize);
            return (
              <div
                key={pageIdx}
                className="flex-shrink-0 w-full px-4 lg:px-6"
                style={{ scrollSnapAlign: 'start' }}
              >
                <div className="grid grid-cols-5 gap-y-5 gap-x-2">
                  {pageItems.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/search?category=${cat.id}`}
                      className="flex flex-col items-center gap-2 card-press"
                    >
                      <div className="w-[64px] h-[64px] rounded-[20px] bg-[#F4F5F7] flex items-center justify-center">
                        <img src={cat.icon} alt={cat.name} className="w-11 h-11" />
                      </div>
                      <span className="text-[13px] text-gray-700 font-semibold text-center leading-tight">
                        {cat.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === activePage ? 28 : 10,
                height: 3,
                backgroundColor: i === activePage ? '#111827' : '#E5E7EB',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type ProductType = React.ComponentProps<typeof ProductCard>['product'];

function RecentlyViewedSection({
  recentProducts,
  fallback,
}: {
  recentProducts: ProductType[];
  fallback: ProductType[];
}) {
  const hasRecent = recentProducts.length > 0;
  const items = (hasRecent ? recentProducts : fallback).slice(0, 10);
  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <SectionHeader
        title="최근 본 상품"
        subtitle={hasRecent ? '최근 둘러본 상품을 이어서 확인해보세요.' : '추천으로 보여드려요.'}
        action={<MoreButton href="/wishlist" />}
      />
      <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible">
          {items.map((p) => (
            <div
              key={p.id}
              className="w-[42vw] max-w-[180px] flex-shrink-0 lg:w-auto lg:max-w-none lg:flex-shrink"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon && <img src={icon} alt={title} className="w-6 h-6 flex-shrink-0" />}
          <h2 className="font-bold text-[22px] leading-[28px] text-[#2B313D]">{title}</h2>
        </div>
        {subtitle && (
          <p className="mt-0.5 text-[14px] leading-[19px] text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0 pt-0.5">{action}</div>}
    </div>
  );
}

function MoreButton({ href, label = '더보기' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-0.5 rounded-full pl-3 pr-2 py-1.5 text-[12px] font-semibold text-gray-900 transition-all duration-200 active:scale-105"
      style={{
        background: 'rgba(255, 255, 255, 0.58)',
        border: '1px solid rgba(255, 255, 255, 0.74)',
        boxShadow: '0 8px 24px rgba(17, 24, 39, 0.10)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
      }}
    >
      {label} <ChevronRight size={13} strokeWidth={2.3} />
    </Link>
  );
}

function RecentTagsSection({
  tags,
  onRemove,
}: {
  tags: string[];
  onRemove: (tag: string) => void;
}) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="mb-6">
      <SectionHeader title="최근 본 태그" />
      <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {tags.map((tag) => (
            <div
              key={tag}
              className="flex-shrink-0 flex items-center gap-1 pl-3 pr-1.5 rounded-full bg-[#F4F5F7] card-press"
              style={{ height: 32 }}
            >
              <Link
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="text-[13px] font-medium text-gray-700 whitespace-nowrap"
              >
                {tag}
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(tag);
                }}
                aria-label="삭제"
                className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={12} className="text-gray-400" />
              </button>
            </div>
          ))}
          <div className="flex-shrink-0" style={{ width: 4 }} />
        </div>
      </div>
    </div>
  );
}
