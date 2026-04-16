'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Send, ChevronRight, Star } from 'lucide-react';
import ProductCard from '@/components/common/ProductCard';
import { useStore } from '@/store';
import { categories, reviews, hospitals, products as allMockProducts } from '@/lib/mock-data';

const searchPlaceholders = [
  '입술필러 검색해보세요',
  '임플란트 검색해보세요',
  '라미네이트 검색해보세요',
  '치아미백 검색해보세요',
  '보톡스 검색해보세요',
];

export default function HomePage() {
  const router = useRouter();
  const { products, isLoggedIn, login, recentlyViewed } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

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
      // Start docking when the category bottom reaches y=120, finish by y=60
      const start = 120;
      const end = 60;
      const p = (start - rect.bottom) / (start - end);
      setDockProgress(Math.max(0, Math.min(1, p)));
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
              <button onClick={() => login('kakao')} className="bg-[#7C3AED] text-white text-sm px-2.5 py-2 rounded-full font-medium">
                테스트 로그인
              </button>
              <Link href="/search"><Search size={22} /></Link>
            </div>
          )}
        </div>

        {/* Scrolled Header (search bar) */}
        <div className={`px-2.5 transition-all duration-300 ${scrolled ? 'py-2 opacity-100' : 'h-0 overflow-hidden opacity-0 py-0'}`}>
          <button
            onClick={() => router.push('/search')}
            style={{ height: 46, borderRadius: 10, borderWidth: 1.4, borderColor: '#C8CEDA', backgroundColor: '#F9F9F9' }}
            className="w-full flex items-center gap-3 px-2.5 text-left border-solid"
          >
            <Search size={18} className="text-gray-400 flex-shrink-0" />
            <div style={{ fontSize: 16, height: 22, overflow: 'hidden' }} className="flex-1 relative">
              <span
                className={`block text-gray-400 transition-all duration-300 ${
                  animating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
                }`}
              >
                {searchPlaceholders[placeholderIdx]}
              </span>
            </div>
          </button>
        </div>

        {/* Docked compact category bar — shrinks in based on scroll progress */}
        <div
          style={{
            maxHeight: dockProgress * 64,
            opacity: dockProgress,
            transform: `translateY(${(1 - dockProgress) * -8}px)`,
            overflow: 'hidden',
            borderTop: dockProgress > 0.3 ? '1px solid #F2F3F5' : '1px solid transparent',
            transition: 'border-color 300ms ease',
          }}
        >
          <div
            className="flex items-center gap-3 overflow-x-auto hide-scrollbar px-2.5 py-2"
            style={{ scrollBehavior: 'smooth' }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/search?category=${cat.id}`}
                className="flex flex-col items-center gap-0.5 flex-shrink-0 card-press"
                style={{ width: 48 }}
              >
                <div
                  className="rounded-xl bg-[#F4F5F7] flex items-center justify-center"
                  style={{
                    width: 34 + dockProgress * 4,
                    height: 34 + dockProgress * 4,
                  }}
                >
                  <img src={cat.icon} alt={cat.name} className="w-7 h-7" />
                </div>
                <span
                  className="text-[10px] text-gray-600 font-medium whitespace-nowrap"
                  style={{ transform: `scale(${0.92 + dockProgress * 0.08})` }}
                >
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
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

        {/* 최근 본 상품 */}
        {recentProducts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🕐</span>
                <h2 className="font-bold">최근 본 상품</h2>
              </div>
            </div>
            <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible">
                {recentProducts.slice(0, 10).map((product) => (
                  <div key={product.id} className="w-[42vw] max-w-[180px] flex-shrink-0 lg:w-auto lg:max-w-none lg:flex-shrink">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 나한테 꿀이되는 후기 */}
        <div className="mb-8">
          <div className="flex items-center justify-between px-2.5 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
            <h2 className="font-bold">나한테 꿀이되는 후기</h2>
          </div>
          <div className="px-2.5 lg:max-w-7xl lg:mx-auto">
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2" style={{ scrollSnapType: 'x mandatory' }}>
              {reviews.slice(0, 10).map((review) => {
                const hospital = hospitals.find(h => h.id === review.hospitalId);
                const relatedProduct = allMockProducts.find(p => p.id === review.productId || p.hospitalId === review.hospitalId);
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
                        {hospital?.location || '서울 강남구'} · {hospital?.name || review.authorName}
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

function CategoryPager() {
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
