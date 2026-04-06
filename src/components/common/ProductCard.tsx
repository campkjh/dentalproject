'use client';

import { useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { Star, Heart } from 'lucide-react';
import { Product } from '@/types';
import { useStore } from '@/store';

export default function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist } = useStore();
  const isWished = wishlist.includes(product.id);
  const [showHeart, setShowHeart] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handleTouchStart = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      toggleWishlist(product.id);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }, 500);
  }, [product.id, toggleWishlist]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (didLongPress.current) {
      e.preventDefault();
      didLongPress.current = false;
    }
  }, []);

  return (
    <Link
      href={`/product/${product.id}`}
      className="block hover-lift p-1"
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 mb-2">
        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center transition-transform duration-300 hover:scale-105">
          <span className="text-4xl">🦷</span>
        </div>
        {product.discount && (
          <div className="absolute top-2 left-2 bg-[#7C3AED] text-white text-xs px-2 py-0.5 rounded">
            {product.discount}%
          </div>
        )}
        {/* Wishlist indicator */}
        {isWished && (
          <div className="absolute top-2 right-2">
            <Heart size={18} fill="#EF4444" stroke="#EF4444" />
          </div>
        )}
        {/* Long press heart animation */}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <Heart size={40} fill="#EF4444" stroke="#EF4444" className="heart-pop drop-shadow-lg" />
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium line-clamp-2 mb-1">{product.title}</h3>
      <div className="flex flex-wrap gap-1 mb-1">
        {product.tags.slice(0, 3).map((tag) => (
          <span key={tag} style={{ backgroundColor: '#F2F3F5', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#51535C' }} className="px-2 py-0.5">{tag}</span>
        ))}
      </div>
      <div className="flex items-baseline gap-1 mb-1">
        {product.discount && (
          <span className="text-[#7C3AED] font-bold text-sm">{product.discount}%</span>
        )}
        <span className="font-bold text-sm">{product.price.toLocaleString()}원</span>
        <span className="text-[11px] text-gray-400">vat포함</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-0.5">
          <Star size={12} fill="#FBBF24" stroke="#FBBF24" />
          <span>{product.rating}</span>
          <span className="text-gray-400">({product.reviewCount})</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Heart size={12} fill={isWished ? '#EF4444' : '#F87171'} stroke={isWished ? '#EF4444' : '#F87171'} />
          <span>{product.likeCount}</span>
        </div>
      </div>
    </Link>
  );
}
