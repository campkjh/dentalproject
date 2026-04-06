'use client';

import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';
import { reviews } from '@/lib/mock-data';
import { Star } from 'lucide-react';

export default function MyReviewsPage() {
  const { isLoggedIn } = useStore();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white max-w-[430px] mx-auto">
        <TopBar title="내리뷰" />
        <LoginRequired />
      </div>
    );
  }

  // For demo, show the first two reviews as user reviews
  const userReviews = reviews.slice(0, 2);

  if (userReviews.length === 0) {
    return (
      <div className="min-h-screen bg-white max-w-[430px] mx-auto">
        <TopBar title="내리뷰" />
        <EmptyState icon="message" message="리뷰가 존재하지 않아요" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-[430px] mx-auto">
      <TopBar title="내리뷰" />

      <div className="px-2.5 py-4 space-y-3">
        {userReviews.map((review) => (
          <div key={review.id} className="bg-white rounded-xl p-4 border border-gray-100">
            {/* Product Info */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🦷</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-1">{review.treatmentName}</p>
                <p className="text-xs text-gray-400">{review.treatmentDate}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i < review.rating ? '#FBBF24' : 'transparent'}
                  stroke={i < review.rating ? '#FBBF24' : '#D1D5DB'}
                />
              ))}
              <span className="text-xs text-gray-500 ml-1">{review.rating}</span>
            </div>

            {/* Content */}
            <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
              {review.content}
            </p>

            {/* Date & Cost */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <span className="text-xs text-gray-400">{review.date}</span>
              <span className="text-xs text-gray-500">
                총 비용: <span className="font-medium">{review.totalCost.toLocaleString()}원</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
