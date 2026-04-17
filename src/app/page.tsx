'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Send, ChevronRight, Star, MapPin, X } from 'lucide-react';
import ProductCard from '@/components/common/ProductCard';
import { useStore } from '@/store';

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
  const { products, hospitals, reviews, categories, isLoggedIn, recentlyViewed, recentSearches, removeRecentSearch } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [currentLocation, setCurrentLocation] = useState('내 근처');

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
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
          <span className="text-lg font-bold text-[#7C3AED]">로고</span>
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <Link href="/search"><Search size={22} /></Link>
              <Link href="/notifications" className="relative">
                <Send size={22} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">23</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="bg-[#7C3AED] text-white text-sm px-2.5 py-2 rounded-full font-medium">
                로그인
              </Link>
              <Link href="/search"><Search size={22} /></Link>
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
              <MapPin size={12} className="text-[#7C3AED]" />
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

        {/* Banner */}
        <div className="mx-4 lg:mx-auto lg:max-w-7xl lg:px-6 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] p-5 lg:p-8 mb-6 text-white relative overflow-hidden gradient-shift">
          <p className="text-sm opacity-90">첫방문 체험</p>
          <p className="text-xl font-bold mt-1">추가 15% 쿠폰 증정</p>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-20 h-20 bg-white/20 rounded-full flex items-center justify-center float">
            <div className="text-center">
              <div className="text-2xl font-bold">15%</div>
              <div className="text-[10px]">COUPON</div>
            </div>
          </div>
        </div>

        {/* Categories — 5x2 pager (swipe horizontally) */}
        <div ref={categorySectionRef}>
          <CategoryPager />
        </div>

        {/* 최근 본 태그 */}
        <RecentTagsSection tags={recentSearches} onRemove={removeRecentSearch} />

        {/* 최근 본 상품 */}
        <RecentlyViewedSection
          recentProducts={recentProducts}
          fallback={popularProducts}
        />

        {/* 치과 섹션 */}
        {dentalProducts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
              <div className="flex items-center gap-2">
                <img src="/icons/dental.svg" alt="치과" className="w-6 h-6" />
                <h2 className="font-bold">치과</h2>
              </div>
              <Link href="/search?category=dental" className="flex items-center gap-0.5 text-sm text-[#7C3AED] hover:underline">
                더보기 <ChevronRight size={14} />
              </Link>
            </div>
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
            <div className="flex items-center justify-between px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
              <div className="flex items-center gap-2">
                <img src="/icons/plastic.svg" alt="성형외과" className="w-6 h-6" />
                <h2 className="font-bold">성형외과</h2>
              </div>
              <Link href="/search?category=plastic" className="flex items-center gap-0.5 text-sm text-[#7C3AED] hover:underline">
                더보기 <ChevronRight size={14} />
              </Link>
            </div>
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
          <div className="flex items-center justify-between px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
            <h2 className="font-bold">나한테 꿀이되는 후기</h2>
          </div>
          <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2" style={{ scrollSnapType: 'x mandatory' }}>
              {reviews.slice(0, 10).map((review) => {
                const hospital = hospitals.find(h => h.id === review.hospitalId);
                const relatedProduct = products.find(p => p.id === review.productId || p.hospitalId === review.hospitalId);
                return (
                  <Link
                    key={review.id}
                    href={relatedProduct ? `/product/${relatedProduct.id}` : '#'}
                    className="flex-shrink-0 block"
                    style={{ width: 286, scrollSnapAlign: 'start' }}
                  >
                    {/* 전후 이미지 영역 */}
                    <div className="relative overflow-hidden" style={{ borderRadius: '16px 16px 0 0', backgroundColor: '#111' }}>
                      <div className="flex">
                        <div className="flex-1 aspect-square flex items-center justify-center" style={{ backgroundColor: '#EBEBEB' }}>
                          <span className="text-3xl">📷</span>
                        </div>
                        <div className="flex-1 aspect-square flex items-center justify-center" style={{ backgroundColor: '#DEDEDE' }}>
                          <span className="text-3xl">📷</span>
                        </div>
                      </div>
                      <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 13, fontWeight: 600, color: '#fff' }}>시술 후</span>
                    </div>
                    {/* 카드 본문 */}
                    <div style={{ backgroundColor: '#F6F6F8', borderRadius: '0 0 16px 16px', padding: '14px 16px' }}>
                      <p style={{ fontSize: 14, color: '#C8CEDA' }}>
                        {hospital?.location || currentLocation} · {hospital?.name || review.authorName}
                      </p>
                      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#2B313D', marginTop: 6, lineHeight: '24px' }} className="line-clamp-2">
                        {review.treatmentName}
                      </h3>
                      <div className="flex items-center gap-1.5" style={{ marginTop: 8 }}>
                        <Star size={16} fill="#FBBF24" stroke="#FBBF24" />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#2B313D' }}>{review.rating.toFixed(1)}</span>
                        <span style={{ fontSize: 14, color: '#A4ABBA' }}>({relatedProduct?.reviewCount?.toLocaleString() || '0'})</span>
                      </div>
                      <p style={{ fontSize: 20, fontWeight: 700, color: '#111111', marginTop: 6 }}>
                        {review.totalCost.toLocaleString()}원
                      </p>
                      <div className="flex items-center gap-1.5" style={{ marginTop: 10 }}>
                        <span className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 500, color: '#3B82F6', backgroundColor: '#EFF6FF', borderRadius: 4, padding: '3px 8px' }}>
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                          앱결제
                        </span>
                        <span className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 500, color: '#10B981', backgroundColor: '#ECFDF5', borderRadius: 4, padding: '3px 8px' }}>
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
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
          <div className="flex items-center justify-between px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
            <h2 className="font-bold">이번 주 인기 많은 패키지</h2>
            <Link href="/search" className="flex items-center gap-0.5 text-sm text-[#7C3AED] hover:underline">
              더보기 <ChevronRight size={14} />
            </Link>
          </div>
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
          <div className="flex items-center justify-between px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
            <h2 className="font-bold">이런 패키지는 어때요?</h2>
            <Link href="/search" className="flex items-center gap-0.5 text-sm text-[#7C3AED] hover:underline">
              더보기 <ChevronRight size={14} />
            </Link>
          </div>
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
          <div className="flex items-center justify-between px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
            <h2 className="font-bold">요즘 뜨고 있는 병원</h2>
          </div>
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
                return (
                  <Link
                    key={hp.id}
                    href={`/hospital/detail/${hp.id}`}
                    className="flex-shrink-0 block"
                    style={{ width: 286, scrollSnapAlign: 'start' }}
                  >
                    {/* 커버 이미지 */}
                    <div className="relative overflow-hidden" style={{ borderRadius: 16, aspectRatio: '64/26' }}>
                      <img src={hospitalCovers[hpIdx % hospitalCovers.length]} alt={hp.name} className="w-full h-full object-cover" />
                      {/* 로고 */}
                      <div className="absolute top-3 left-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                        <span className="text-xs">🦷</span>
                      </div>
                    </div>
                    {/* 정보 */}
                    <div style={{ padding: '12px 4px' }}>
                      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#2B313D' }}>{hp.name}</h3>
                      {topReview && (
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#7C3AED', marginTop: 4 }}>
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
          <div className="flex items-center justify-between px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
            <h2 className="font-bold">인기 상품</h2>
            <Link href="/search" className="flex items-center gap-0.5 text-sm text-[#7C3AED] hover:underline">
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>
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
        <p>(주)00000은 통신판매중개자로서 통신판매의 당사자가 아니며 개별 판매자가 제공하는 서비스에 대한 이행, 계약사항 등과 관련한 의무와 책임은 거래 당사자에게 있습니다.</p>
        <p className="mt-2">통신판매업신고번호 : 제 2025-서울송파-0000호</p>
        <p>(주)0000 | 우 00000</p>
        <p>주소 서울특별시 금천구 가산디지털1로 225, 11층 1123-에이-2호(가산동, 에이스 가산 포휴)</p>
        <p className="mt-1">T 070-000-0000 | E ceo@sample.com</p>
        <p className="mt-1">대표자 000 | 사업자 등록 번호 000-00-00000</p>
        <p>Copyright(c) 000. All right reserved.</p>
      </div>

    </div>
  );
}

/* ===================== 근처 핫플레이스 ===================== */

const HOTSPOTS = [
  {
    id: 'gangnam',
    name: '강남',
    region: '서울시 강남구',
    tags: ['#프리미엄 치과', '#강남 맛집', '#역삼역'],
    gradient: 'from-violet-600 to-indigo-500',
    emoji: '🏙️',
  },
  {
    id: 'seocho',
    name: '서초',
    region: '서울시 서초구',
    tags: ['#교대역 치과', '#양재 카페', '#서초 힐링'],
    gradient: 'from-blue-500 to-cyan-400',
    emoji: '🌿',
  },
  {
    id: 'songpa',
    name: '잠실·송파',
    region: '서울시 송파구',
    tags: ['#잠실 피부과', '#석촌호수', '#롯데타워'],
    gradient: 'from-rose-500 to-orange-400',
    emoji: '🎡',
  },
  {
    id: 'mapo',
    name: '마포·홍대',
    region: '서울시 마포구',
    tags: ['#홍대 성형', '#연남동 카페', '#합정역'],
    gradient: 'from-amber-500 to-yellow-400',
    emoji: '🎵',
  },
  {
    id: 'jongno',
    name: '종로·광화문',
    region: '서울시 종로구',
    tags: ['#광화문 치과', '#인사동', '#북촌한옥'],
    gradient: 'from-emerald-600 to-teal-400',
    emoji: '🏛️',
  },
  {
    id: 'yeongdeungpo',
    name: '여의도',
    region: '서울시 영등포구',
    tags: ['#여의도 피부과', '#IFC몰', '#한강뷰'],
    gradient: 'from-sky-500 to-blue-400',
    emoji: '🌉',
  },
];

function NearbyHotPlaces({
  currentLocation,
  hospitals,
}: {
  currentLocation: string;
  hospitals: { id: string; location: string; name: string }[];
}) {
  // Sort hotspots: current location first
  const sorted = [...HOTSPOTS].sort((a, b) => {
    const aMatch = currentLocation.includes(a.name) ? -1 : 0;
    const bMatch = currentLocation.includes(b.name) ? -1 : 0;
    return aMatch - bMatch;
  });

  // Count hospitals per region
  const countByRegion = (region: string) => {
    const key = region.replace(/시\s*/, '').replace(/구$/, '');
    return hospitals.filter((h) => (h.location ?? '').includes(key)).length;
  };

  return (
    <div className="mb-8">
      <div className="px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
        <h2 className="font-bold text-[16px] text-gray-900">근처 핫플레이스 알아보기</h2>
        <p className="text-[12px] text-gray-500 mt-1">나와 가까운 핫플이 어디인지 알려드려요.</p>
      </div>
      <div className="px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto">
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {sorted.map((spot) => {
            const hospitalCount = countByRegion(spot.region);
            return (
              <Link
                key={spot.id}
                href={`/search?region=${encodeURIComponent(spot.region)}`}
                className="flex-shrink-0 block card-press"
                style={{ width: 160 }}
              >
                <div
                  className={`relative overflow-hidden bg-gradient-to-br ${spot.gradient}`}
                  style={{ borderRadius: 16, aspectRatio: '3 / 4' }}
                >
                  {/* Emoji decoration */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      fontSize: 64,
                      opacity: 0.15,
                      right: -10,
                      top: -10,
                      transform: 'rotate(15deg)',
                    }}
                  >
                    {spot.emoji}
                  </div>

                  {/* Tags */}
                  <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1">
                    {spot.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold text-white/90 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 whitespace-nowrap"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 pt-8 bg-gradient-to-t from-black/50 to-transparent">
                    <p className="text-[16px] font-extrabold text-white leading-tight">
                      {spot.name}
                    </p>
                    {hospitalCount > 0 && (
                      <p className="text-[10px] text-white/80 mt-0.5">
                        병원 {hospitalCount}곳
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
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

  return (
    <div className="mb-8 lg:max-w-7xl lg:mx-auto">
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
              <div className="grid grid-cols-5 gap-y-4 gap-x-2">
                {pageItems.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/search?category=${cat.id}`}
                    className="flex flex-col items-center gap-1.5 card-press"
                  >
                    <div className="w-[52px] h-[52px] rounded-2xl bg-[#F4F5F7] flex items-center justify-center">
                      <img src={cat.icon} alt={cat.name} className="w-9 h-9" />
                    </div>
                    <span className="text-[12px] text-gray-700 font-medium text-center leading-tight">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === activePage ? 16 : 4,
                backgroundColor: i === activePage ? '#7C3AED' : '#E5E7EB',
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
      <div className="flex items-center justify-between px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold">최근 본 상품</h2>
          {!hasRecent && (
            <span className="text-[11px] text-gray-400 font-medium">
              추천으로 보여드려요
            </span>
          )}
        </div>
        <Link
          href="/wishlist"
          className="flex items-center gap-0.5 text-sm text-[#7C3AED] hover:underline"
        >
          더보기 <ChevronRight size={14} />
        </Link>
      </div>
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
      <div className="flex items-center justify-between px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-2">
        <h2 className="font-bold">최근 본 태그</h2>
      </div>
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
