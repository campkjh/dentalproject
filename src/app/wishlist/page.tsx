'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import LoginRequired from '@/components/common/LoginRequired';
import EmptyState from '@/components/common/EmptyState';
import ProductCard from '@/components/common/ProductCard';
import { ArrowUp, X } from 'lucide-react';

export default function WishlistPage() {
  const { isLoggedIn, products, wishlist, toggleWishlist } = useStore();
  const [showScrollTop, setShowScrollTop] = useState(false);

  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto lg:max-w-7xl lg:px-6 lg:py-6">
      <TopBar title="찜목록" />

      {!isLoggedIn ? (
        <LoginRequired />
      ) : wishlistProducts.length === 0 ? (
        <EmptyState icon="heart" message="찜한 상품이 없습니다" />
      ) : (
        <div className="px-2.5 py-4">
          <p className="text-sm text-gray-500 mb-4">총 {wishlistProducts.length}개</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            {wishlistProducts.map((product) => (
              <div key={product.id} className="relative">
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                  aria-label="찜 삭제"
                >
                  <X size={14} className="text-gray-500" />
                </button>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scroll to top button */}
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
