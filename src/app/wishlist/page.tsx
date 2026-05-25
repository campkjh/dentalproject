'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useStore } from '@/store';
import LoginRequired from '@/components/common/LoginRequired';
import ProductCard from '@/components/common/ProductCard';
import { ArrowUp, X } from 'lucide-react';

type Tab = 'wishlist' | 'recent';

const tabKeys: Tab[] = ['wishlist', 'recent'];

export default function WishlistPage() {
  const { isLoggedIn, products, wishlist, recentlyViewed, toggleWishlist } = useStore();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('wishlist');
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const activeIndex = tabKeys.indexOf(activeTab);

  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[activeIndex];
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeIndex]);

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));
  const recentProducts = recentlyViewed
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const displayed = activeTab === 'wishlist' ? wishlistProducts : recentProducts;
  const hasNew = recentProducts.length > 0;

  // 실시간 TOP 10 인기 시술 — 좋아요 + 리뷰 수 기반 정렬
  const topProducts = useMemo(() => {
    return [...products]
      .sort(
        (a, b) =>
          (b.likeCount ?? 0) + (b.reviewCount ?? 0) -
          ((a.likeCount ?? 0) + (a.reviewCount ?? 0)),
      )
      .slice(0, 10);
  }, [products]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      {/* Header — community-style: 22px extrabold */}
      <div className="sticky top-0 z-40 bg-white flex items-center px-2.5 lg:hidden" style={{ height: 56 }}>
        <h1 className="text-[22px] font-extrabold text-gray-900 leading-none">찜목록</h1>
      </div>

      {!isLoggedIn ? (
        <LoginRequired />
      ) : (
        <>
          {/* Tabs — partner-style sliding indicator */}
          <div className="partner-community-category-shell sticky top-[56px] bg-white z-10">
            <div className="partner-community-categories hide-scrollbar">
              <span
                aria-hidden
                className="partner-community-category-indicator"
                style={{
                  width: indicator.width,
                  transform: `translateX(${indicator.left}px)`,
                  opacity: indicator.width > 0 ? 1 : 0,
                }}
              />
              {tabKeys.map((tab, i) => {
                const isActive = activeTab === tab;
                const showActive = isActive && indicator.width > 0;
                const label = tab === 'wishlist' ? '찜목록' : '최근본';
                const count = tab === 'wishlist' ? wishlistProducts.length : recentProducts.length;
                return (
                  <button
                    key={tab}
                    ref={(el) => {
                      tabBtnRefs.current[i] = el;
                    }}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={showActive ? 'is-active' : undefined}
                  >
                    {label}{count > 0 ? ` ${count}` : ''}
                    {tab === 'recent' && hasNew && (
                      <span className="ml-1 inline-flex items-center justify-center align-middle text-[9px] font-bold text-white bg-red-500 rounded-full px-1.5 leading-[14px] h-[14px]">
                        NEW
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          {displayed.length === 0 ? (
            <>
              {/* Rich empty state (matches mockup) */}
              <div className="px-5 pt-12 pb-10 flex flex-col items-center text-center">
                <img
                  src="/icons/heart-empty.svg"
                  alt=""
                  width={62}
                  height={62}
                  className="mb-6"
                />
                <p className="text-[22px] leading-[30px] font-bold text-[#2B313D]">
                  {activeTab === 'wishlist'
                    ? '아직 찜한 상품이 없네요!'
                    : '최근 본 상품이 없네요!'}
                </p>
                <p className="mt-2 text-[16px] leading-[22px] font-medium text-[#51535C]">
                  {activeTab === 'wishlist'
                    ? '상품을 둘러보고 관심있는 상품을 찜해보세요!'
                    : '상품을 둘러보고 관심있는 상품을 찾아보세요!'}
                </p>
              </div>

              {/* 실시간 TOP 10 인기 시술 */}
              {topProducts.length > 0 && (
                <section className="mt-2 border-t border-[#F2F3F5] pt-6 pb-10">
                  <h2 className="px-4 mb-4 text-[22px] font-bold text-[#2B313D] leading-[28px]">
                    실시간 <span className="text-[#8037FF]">TOP 10</span> 인기 시술
                  </h2>
                  <div className="pl-4 pr-4 scroll-pl-4 pb-2 flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory">
                    {topProducts.map((product) => (
                      <div
                        key={product.id}
                        className="snap-start flex-shrink-0 w-[156px]"
                      >
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div key={activeTab} className="px-2.5 py-4 list-fade-slide">
              <p className="text-sm text-gray-500 mb-4">총 {displayed.length}개</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                {displayed.map((product) => (
                  <div key={product.id} className="relative">
                    {activeTab === 'wishlist' && (
                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className="absolute top-2 right-2 z-10 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                        aria-label="찜 삭제"
                      >
                        <X size={14} className="text-gray-500" />
                      </button>
                    )}
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 max-w-[480px] w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-gray-50 transition-colors"
        >
          <ArrowUp size={18} className="text-gray-600" />
        </button>
      )}

      <div className="pb-24 lg:pb-0" />
    </div>
  );
}

