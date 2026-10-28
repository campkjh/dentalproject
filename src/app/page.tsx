'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, ArrowUp } from 'lucide-react';
import ProductCard from '@/components/common/ProductCard';
import HospitalToneCard from '@/components/common/HospitalToneCard';
import ReviewMarquee from '@/components/home/ReviewMarquee';
import { useImageTone } from '@/lib/image-tone';
import { Reveal } from '@/components/detail/DetailKit';
import MobileHomeHeader from '@/components/common/MobileHomeHeader';
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
  // Live unread count for the 쪽지 badge — only counted once /api/me has hydrated
  // so we don't briefly render a 0 on the wrong account.
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollTopLeaving, setScrollTopLeaving] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const showScrollTopRef = useRef(false);
  const scrolledRef = useRef(false);
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
      // 들어갈 땐 60↑, 나올 땐 20↓ — 경계에서 왔다 갔다 하며 떨리지 않게
      const isPastHeader = scrollTop > (scrolledRef.current ? 20 : 60);
      scrolledRef.current = isPastHeader;
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
    <div className="pb-[86px] pc:pb-16 overflow-x-clip">
      {/* 머리 — 화면 위에 고정(높이 64 고정 + 같은 높이 빈칸). 로고 줄 ↔ 검색 줄은 같은 칸에서 겹쳐 바뀌고,
          카테고리 줄은 머리 아래에 겹쳐 내려온다 — 문서 높이가 안 바뀌어 스크롤이 떨리지 않는다 */}
      <div
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-40 mx-auto max-w-[640px] pt-[env(safe-area-inset-top)] pc:hidden"
      >
        {/* 머리 바탕 — 맨 위에선 안전영역부터 머리 끝까지 흰색→투명 그라데이션(배너 색 번짐이 비쳐 보이게),
            내리면 흰색으로 채워지고 그 아래로 흰 그늘이 자연스럽게 이어진다 */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.88) 55%, rgba(255,255,255,0) 100%)' }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-300" style={{ opacity: scrolled ? 1 : 0 }} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-5 transition-opacity duration-300"
          style={{ top: `calc(100% + ${Math.max(0, dockProgress * 52 - (1 - dockProgress) * 6)}px - 1px)`, opacity: scrolled ? 1 : 0, background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0) 100%)' }}
        />
        <div className="relative h-16">
        <MobileHomeHeader hidden={scrolled} />

        {/* Scrolled Header — flat #F2F4F6 bar, 12px radius, no border.
            Search icon docks left; location text + chevron precede a thin
            divider and the rotating placeholder. Right edge fades to the
            bar's own bg so long placeholders don't hit the wall. */}
        <div
          className="absolute inset-x-0 top-0 flex h-16 items-center px-2.5 transition-[opacity,transform] duration-300"
          style={{ opacity: scrolled ? 1 : 0, transform: scrolled ? 'none' : 'translateY(8px)', pointerEvents: scrolled ? 'auto' : 'none' }}
          aria-hidden={!scrolled}
        >
          <button
            onClick={() => router.push('/search')}
            style={{
              height: 44,
              borderRadius: 12,
              backgroundColor: '#F2F4F6',
            }}
            className="w-full flex items-center text-left relative overflow-hidden"
          >
            {/* Search icon on the left */}
            <Search
              size={20}
              strokeWidth={2}
              className="flex-shrink-0 ml-3 mr-2.5"
              style={{ color: 'rgba(0, 19, 43, 0.58)' }}
            />

            {/* Location + chevron — visible at all times so users see the area */}
            <span className="flex items-center gap-0.5 flex-shrink-0">
              <span
                className="text-[14px] font-semibold whitespace-nowrap"
                style={{ color: 'rgba(3, 24, 50, 0.7)' }}
              >
                {currentLocation}
              </span>
              <ChevronDown size={14} style={{ color: 'rgba(3, 24, 50, 0.46)' }} />
            </span>

            {/* Divider */}
            <span
              className="flex-shrink-0 w-px h-3.5 mx-2"
              style={{ backgroundColor: 'rgba(3, 24, 50, 0.18)' }}
            />

            {/* Rotating placeholder */}
            <div
              style={{ fontSize: 14, height: 20, overflow: 'hidden' }}
              className="flex-1 relative min-w-0"
            >
              <span
                className={`block truncate transition-all duration-300 ${
                  animating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
                }`}
                style={{ color: 'rgba(3, 24, 50, 0.46)' }}
              >
                {searchPlaceholders[placeholderIdx]}
              </span>
            </div>

            {/* Right-edge fade-out to mask placeholder overflow */}
            <div
              aria-hidden
              className="absolute pointer-events-none"
              style={{
                top: 0,
                right: 0,
                bottom: 0,
                width: 32,
                background:
                  'linear-gradient(to right, rgba(242,244,246,0) 0%, #F2F4F6 50%, #F2F4F6 100%)',
              }}
            />
          </button>
        </div>

        </div>

        {/* Docked compact category bar — pill style, 머리 아래에 겹쳐 내려온다(흐름 밖).
            아래 경계선은 두지 않는다 — 흰 그늘이 이 줄 바로 밑(1px 겹침)에서 이어져야 틈이 안 보인다 */}
        <div
          className="absolute inset-x-0 top-full bg-white"
          style={{
            maxHeight: dockProgress * 52,
            opacity: Math.min(1, dockProgress * 1.6),
            transform: `translateY(${(1 - dockProgress) * -6}px)`,
            overflow: 'hidden',
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

      <div className="h-[calc(64px+env(safe-area-inset-top))] pc:hidden" aria-hidden />

      {/* Desktop content wrapper — 등장 애니메이션은 여기만(transform 이 남아 고정 머리가 밀리지 않게) */}
      <div className="page-enter pc:pt-6">

        <HomeBannerSlider />


        {/* Categories — 5x2 pager (swipe horizontally) */}
        {/* 배너 뒤 색 번짐(HomeBannerSlider BannerWash)이 아래로 흘러와도 칸은 그 위에 놓이게 */}
        <div ref={categorySectionRef} className="relative z-[1]">
          <CategoryPager />
          <PcCategoryRow />
        </div>

        {/* 인기 상품 */}
        <div className="mb-6">
          <SectionHeader
            title="인기 상품"
          />
          <div className="px-[10px] pc:px-0">
            <div className="grid grid-cols-2 pc:grid-cols-5 gap-2.5 pc:gap-4 pc:[&>*:nth-child(n+6)]:hidden stagger-children">
              {popularProducts.map((product) => (
                <ProductCard key={product.id} product={product} index={popularProducts.indexOf(product)} />
              ))}
            </div>
          </div>
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

        {/* 나한테 꿀이되는 후기 — 위아래 두 줄이 서로 반대로 흘러가는 캐러셀(PC 는 카드를 정비례로 크게) */}
        <div className="mb-8 pc:-mx-8">
          <div className="pc:px-8"><SectionHeader title="나한테 꿀이되는 후기" /></div>
          <ReviewMarquee reviews={reviews.slice(0, 12)} products={products} />
        </div>

        {/* 이번 주 인기 많은 패키지 */}
        <div className="mb-8">
          <SectionHeader
            title="이번 주 인기 많은 패키지"
          />
          <div className="px-[10px] pc:px-0">
            <div className="flex snap-x gap-2.5 overflow-x-auto hide-scrollbar pb-2 scroll-px-[10px] pc:grid pc:grid-cols-5 pc:gap-4 pc:overflow-visible pc:[&>*:nth-child(n+6)]:hidden">
              {weeklyPopularPackages.map((product) => (
                <div key={product.id} className="w-[44vw] max-w-[200px] flex-shrink-0 snap-start pc:w-auto pc:max-w-none pc:shrink">
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
          />
          <div className="px-[10px] pc:px-0">
            <div className="flex snap-x gap-2.5 overflow-x-auto hide-scrollbar pb-2 scroll-px-[10px] pc:grid pc:grid-cols-5 pc:gap-4 pc:overflow-visible pc:[&>*:nth-child(n+6)]:hidden">
              {suggestedPackages.map((product) => (
                <div key={product.id} className="w-[44vw] max-w-[200px] flex-shrink-0 snap-start pc:w-auto pc:max-w-none pc:shrink">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 요즘 뜨고 있는 병원 */}
        <div className="mb-8">
          <SectionHeader title="요즘 뜨고 있는 병원" />
          <div className="px-[10px] pc:px-0">
            <div className="flex snap-x gap-3 overflow-x-auto pb-2 hide-scrollbar scroll-px-[10px] pc:grid pc:grid-cols-3 pc:gap-4 pc:overflow-visible">
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
                return trendingHospitals.map((hp, hpIdx) => (
                  <div key={hp.id} className="w-[78vw] max-w-[320px] shrink-0 snap-start pc:w-auto pc:max-w-none">
                    <HospitalToneCard
                      index={hpIdx}
                      hospital={{
                        id: hp.id,
                        name: hp.name,
                        location: hp.location,
                        image: hp.coverImages?.[0] || hospitalCovers[hpIdx % hospitalCovers.length],
                        logo: resolveHospitalImageUrl(hp),
                        rating: hp.rating,
                        reviewCount: hp.reviewCount,
                        tags: hp.tags || [],
                      }}
                    />
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

      </div>{/* End desktop content wrapper */}

      {/* Footer */}
      <div className="mt-8 px-2.5 py-6 text-xs text-gray-400 border-t border-gray-100 pc:hidden">
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-4 text-gray-500">
          <Link href="/terms/privacy" className="hover:text-gray-700 underline">개인정보처리방침</Link>
          <Link href="/terms/service" className="hover:text-gray-700 underline">서비스이용약관</Link>
          <Link href="/terms/thirdparty" className="hover:text-gray-700 underline">제3자정보제공동의</Link>
          <Link href="/terms/refund" className="hover:text-gray-700 underline">환불약관</Link>
          <Link href="/terms/withdrawal" className="hover:text-gray-700 underline">회원탈퇴 문의</Link>
          <Link href="/terms/meta" className="hover:text-gray-700 underline">META서비스 이용방침</Link>
        </div>
        <p>{siteConfig.copyrightName}은 {siteConfig.companyName}가 운영하는 서비스입니다.</p>
        <p>{siteConfig.companyName}은(는) 통신판매중개자로서 통신판매의 당사자가 아니며 개별 판매자가 제공하는 서비스에 대한 이행, 계약사항 등과 관련한 의무와 책임은 거래 당사자에게 있습니다.</p>
        <p className="mt-2">상호명 {siteConfig.companyName}</p>
        <p>대표자 {siteConfig.representative}</p>
        <p>사업자등록번호 {siteConfig.businessNumber}</p>
        {siteConfig.mailOrderNumber && <p>통신판매업신고번호 {siteConfig.mailOrderNumber}</p>}
        <p>주소 {siteConfig.address}{siteConfig.postalCode ? ` (우 ${siteConfig.postalCode})` : ''}</p>
        <p className="mt-1">
          {[siteConfig.phone && `T ${siteConfig.phone}`, `E ${siteConfig.email}`]
            .filter(Boolean)
            .join(' | ')}
        </p>
        <p className="mt-1">Copyright(c) {siteConfig.copyrightName}. All right reserved.</p>
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

function HomeSkeleton() {
  return (
    <div className="px-2.5 pc:px-0 space-y-8 mb-8">
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

/** 카테고리 아이콘 타일 — 프리티풀 홈 카테고리 칸 그대로: 둥근 타일(60 · 모서리 20)에 그 아이콘 그림 색을 아주 옅게 깔고 아이콘 44 */
function CategoryTile({ name, icon, href, index }: { name: string; icon: string; href: string; index: number }) {
  const tone = useImageTone(icon, 'square');
  // 사진 색(파스텔)을 흰색에 한 번 더 섞어 아주 옅게 — 색을 아직 못 뽑았으면 앱 회색
  const tint = tone ? `color-mix(in srgb, ${tone.bg} 62%, #ffffff)` : '#F4F5F7';
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-1.5"
      style={{ animation: `fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.12 + index * 0.03}s both` }}
    >
      <span
        className="flex h-[60px] w-[60px] items-center justify-center rounded-[20px] transition-[transform,background-color] duration-300 group-active:scale-95 pc:h-16 pc:w-16 pc:rounded-[21px] pc:group-hover:-translate-y-0.5"
        style={{ backgroundColor: tint }}
      >
        <img src={icon} alt="" className="h-11 w-11 object-contain pc:h-[46px] pc:w-[46px]" />
      </span>
      <span className="text-center text-[12px] font-medium leading-tight text-[#51535C] pc:text-[13px]">{name}</span>
    </Link>
  );
}

/** '전체' 칸 — 펼치면 '접기'(화살표가 돌아간다) */
function CategoryMoreTile({ open, onToggle, index }: { open: boolean; onToggle: () => void; index: number }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="group flex flex-col items-center gap-1.5"
      style={{ animation: `fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.12 + index * 0.03}s both` }}
    >
      <span className="flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-[#F2F4F6] transition-transform duration-300 group-active:scale-95">
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 15l6-6 6 6" stroke="#4E5968" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            {[6, 12, 18].flatMap(x => [6, 12, 18].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.9" fill="#4E5968" />))}
          </svg>
        )}
      </span>
      <span className="text-center text-[12px] font-medium leading-tight text-[#51535C]">{open ? '접기' : '전체'}</span>
    </button>
  );
}

// PC 카테고리 — 페이지 넘김 없이 한 줄(프리티풀 PC 홈 카테고리 줄처럼 아이콘 칸 + 이름)
function PcCategoryRow() {
  const categories = useStore(s => s.categories);
  return (
    <div className="mb-10 mt-2 hidden grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-x-2 gap-y-5 pc:grid">
      {categories.map((cat, i) => (
        <CategoryTile key={cat.id} name={cat.name} icon={cat.icon} href={`/search?category=${cat.id}`} index={i} />
      ))}
    </div>
  );
}

// 모바일 카테고리 — 옆으로 넘기지 않고 두 줄(9칸 + '전체')만 보이다가 '전체'를 누르면 아래로 촤라락 펼쳐진다.
//  펼치면 '전체' 자리에 열 번째 칸이 들어가고 '접기'는 펼친 목록 맨 끝으로
function CategoryPager() {
  const categories = useStore((s) => s.categories);
  const [open, setOpen] = useState(false);
  const FIRST = 9;
  const hasMore = categories.length > FIRST + 1;
  const first = categories.slice(0, hasMore ? FIRST : categories.length);
  const tenth = hasMore ? categories[FIRST] : null;
  const rest = hasMore ? categories.slice(FIRST + 1) : [];
  return (
    <div className="mb-8 px-[10px] pc:hidden">
      <div className="grid grid-cols-5 gap-x-1 gap-y-4 py-2">
        {first.map((cat, i) => (
          <CategoryTile key={cat.id} name={cat.name} icon={cat.icon} href={`/search?category=${cat.id}`} index={i} />
        ))}
        {tenth && (open
          ? <CategoryTile key={tenth.id} name={tenth.name} icon={tenth.icon} href={`/search?category=${tenth.id}`} index={0} />
          : <CategoryMoreTile open={false} onToggle={() => setOpen(true)} index={FIRST} />)}
      </div>
      {hasMore && (
        <div className="grid transition-[grid-template-rows,opacity] duration-500" style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div className="overflow-hidden">
            {/* 펼칠 때마다 다시 그려 칸이 차례로 떠오른다 */}
            {open && (
              <div className="grid grid-cols-5 gap-x-1 gap-y-4 pb-2 pt-2">
                {rest.map((cat, i) => (
                  <CategoryTile key={cat.id} name={cat.name} icon={cat.icon} href={`/search?category=${cat.id}`} index={i + 1} />
                ))}
                <CategoryMoreTile open onToggle={() => setOpen(false)} index={rest.length + 1} />
              </div>
            )}
          </div>
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
      />
      <div className="px-[10px] pc:px-0">
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pc:grid pc:grid-cols-5 pc:gap-4 pc:overflow-visible pc:[&>*:nth-child(n+6)]:hidden">
          {items.map((p) => (
            <div
              key={p.id}
              className="w-[42vw] max-w-[180px] flex-shrink-0 pc:w-auto pc:max-w-none pc:shrink"
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
  // 프리티풀 홈 섹션 머리 규격 — 앞 그림 48(바탕 칸 없이) · 사이 10 · 제목 18/PC 20 semibold · 부제 14 회색 위 4 · 아래 24, 오른쪽 '전체보기 >' 13.
  //  화면에 닿으면 아래→위로 흐리게 떠오른다(프리티풀 Reveal)
  return (
    <Reveal className="mb-6 px-[10px] pc:px-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <img src={icon} alt="" className="h-12 w-12 shrink-0 object-contain" />}
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold leading-tight tracking-tight text-gray-900 pc:text-[20px]">{title}</h2>
            {subtitle && <p className="mt-1 text-[14px] font-normal leading-relaxed text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </Reveal>
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
      <div className="px-[10px] pc:px-0">
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
