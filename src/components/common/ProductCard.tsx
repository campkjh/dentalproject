'use client';

import { useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { Star, Heart, Crown } from 'lucide-react';
import { Product } from '@/types';
import { resolveProductImageUrl } from '@/lib/images';
import { useStore } from '@/store';

export default function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist } = useStore();
  const isWished = wishlist.includes(product.id);
  const [showHeart, setShowHeart] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const productImage = resolveProductImageUrl(product.imageUrl, product.id);

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
      className="block card-press"
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {/* 1:1 Image */}
      <div className="relative aspect-square rounded-[20px] overflow-hidden bg-gray-100 mb-2">
        <img
          src={productImage}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
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

      {/* Product Name */}
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2B313D', lineHeight: '20px' }} className="line-clamp-2 mb-0.5">{product.title}</h3>

      {/* Hospital Location - 1 line */}
      <p style={{ fontSize: 14, fontWeight: 400, color: '#A4ABBA' }} className="truncate">{product.location || product.hospitalName}</p>

      {/* Discount + Original Price */}
      {product.discount && product.originalPrice && (
        <div className="flex items-center gap-1.5 mt-1">
          <span style={{ fontSize: 13, fontWeight: 500, color: '#8037FF' }}>{product.discount}%</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: '#C8CEDA', textDecoration: 'line-through' }}>{product.originalPrice.toLocaleString()}원</span>
        </div>
      )}

      {/* Price */}
      <p style={{ fontSize: 18, fontWeight: 600, color: '#2B313D', marginTop: 2 }}>{product.price.toLocaleString()}원</p>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span style={{ fontSize: 11, fontWeight: 500, color: '#51535C', backgroundColor: '#F2F3F5', borderRadius: 4, padding: '2px 6px' }}>앱결제</span>
        {product.rating >= 4.8 && (
          <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: '#7A71FF' }}>
            <img src="/icons/brand-logo.png" alt="" width={16} height={16} className="flex-shrink-0" />
            인증병원
          </span>
        )}
        {product.likeCount >= 10 && (
          <span className="flex items-center gap-0.5" style={{ fontSize: 11, fontWeight: 500, color: '#F59E0B', backgroundColor: '#FFFBEB', borderRadius: 4, padding: '2px 6px' }}>
            <Crown size={10} /> 프라임
          </span>
        )}
      </div>
    </Link>
  );
}
