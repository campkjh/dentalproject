'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import LoginRequired from '@/components/common/LoginRequired';
import EmptyState from '@/components/common/EmptyState';
import ProductCard from '@/components/common/ProductCard';
import { ArrowUp, X } from 'lucide-react';

type Tab = 'wishlist' | 'recent';

export default function WishlistPage() {
  const { isLoggedIn, products, wishlist, recentlyViewed, toggleWishlist } = useStore();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('wishlist');

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));
  const recentProducts = recentlyViewed
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const displayed = activeTab === 'wishlist' ? wishlistProducts : recentProducts;
  const hasNew = recentProducts.length > 0;

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <TopBar title="찜목록" />

      {!isLoggedIn ? (
        <LoginRequired />
      ) : (
        <>
          {/* Tabs */}
          <div className="px-2.5 border-b border-gray-100 sticky top-12 bg-white z-10">
            <div className="flex gap-5">
              <TabButton
                active={activeTab === 'wishlist'}
                onClick={() => setActiveTab('wishlist')}
                label="찜목록"
                count={wishlistProducts.length}
              />
              <TabButton
                active={activeTab === 'recent'}
                onClick={() => setActiveTab('recent')}
                label="최근본"
                count={recentProducts.length}
                badge={hasNew ? 'NEW' : undefined}
              />
            </div>
          </div>

          {/* Content */}
          {displayed.length === 0 ? (
            <EmptyState
              icon={activeTab === 'wishlist' ? 'heart' : 'clock'}
              message={activeTab === 'wishlist' ? '찜한 상품이 없습니다' : '최근 본 상품이 없습니다'}
            />
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

function TabButton({
  active,
  onClick,
  label,
  count,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative pt-3 pb-3 flex items-center gap-1.5"
      style={{ transition: 'color 200ms ease' }}
    >
      <span
        className={`text-[15px] font-bold ${active ? 'text-gray-900' : 'text-gray-400'}`}
        style={{ transition: 'color 200ms ease' }}
      >
        {label}
      </span>
      {count > 0 && (
        <span
          className={`text-[13px] font-semibold ${active ? 'text-[#7C3AED]' : 'text-gray-300'}`}
        >
          {count}
        </span>
      )}
      {badge && (
        <span className="ml-0.5 text-[9px] font-bold text-white bg-red-500 rounded-full px-1.5 leading-[14px] h-[14px] flex items-center">
          {badge}
        </span>
      )}
      <span
        aria-hidden
        className="absolute left-0 right-0 bottom-0 h-[2px] bg-gray-900 rounded-full"
        style={{
          transform: active ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'center',
          transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </button>
  );
}
