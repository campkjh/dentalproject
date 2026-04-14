'use client';

import { useState } from 'react';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import EmptyState from '@/components/common/EmptyState';
import LoginRequired from '@/components/common/LoginRequired';
import { reviews } from '@/lib/mock-data';
import { Star, MoreHorizontal } from 'lucide-react';

// Mock before/after pairs for demo reviews
const mockBeforeAfter: Record<string, { before: string; after: string }> = {
  r1: { before: '/images/face_1.jpeg', after: '/images/face_2.jpeg' },
  r2: { before: '/images/face_3.jpeg', after: '/images/face_4.jpeg' },
  r3: { before: '/images/face_5.jpeg', after: '/images/face_6.jpeg' },
  r4: { before: '/images/face_7.jpeg', after: '/images/face_8.jpeg' },
};

export default function MyReviewsPage() {
  const { isLoggedIn } = useStore();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <TopBar title="내리뷰" />
        <LoginRequired />
      </div>
    );
  }

  // Use first 4 reviews as user reviews for demo
  const userReviews = reviews.slice(0, 4);

  if (userReviews.length === 0) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <TopBar title="내리뷰" />
        <EmptyState icon="message" message="리뷰가 존재하지 않아요" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto page-enter">
      <TopBar title="내리뷰" />

      <div className="px-2.5 pt-3 pb-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          총 <span className="text-gray-900 font-semibold">{userReviews.length}</span>개
        </p>
      </div>

      <div>
        {userReviews.map((review, idx) => {
          const imgs = mockBeforeAfter[review.id] ?? {
            before: '/images/face_1.jpeg',
            after: '/images/face_2.jpeg',
          };
          return (
            <article
              key={review.id}
              className={`px-2.5 py-5 ${
                idx < userReviews.length - 1 ? 'border-b-8 border-gray-50' : ''
              }`}
            >
              {/* Header: treatment + rating + menu */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-400 mb-0.5">
                    {review.treatmentDate} 시술
                  </p>
                  <h3 className="text-[15px] font-bold text-gray-900 line-clamp-1 leading-snug">
                    {review.treatmentName}
                  </h3>
                  <div className="flex items-center gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < review.rating ? '#FBBF24' : 'transparent'}
                        stroke={i < review.rating ? '#FBBF24' : '#D1D5DB'}
                      />
                    ))}
                    <span className="text-[12px] text-gray-500 ml-1 font-medium">
                      {review.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === review.id ? null : review.id)}
                    className="p-1 -m-1 flex-shrink-0"
                  >
                    <MoreHorizontal size={18} className="text-gray-400" />
                  </button>
                  {openMenu === review.id && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setOpenMenu(null)}
                      />
                      <div
                        className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl overflow-hidden scale-in"
                        style={{
                          border: '1px solid #F2F3F5',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                          minWidth: 120,
                        }}
                      >
                        <button className="block w-full px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-gray-50">
                          수정
                        </button>
                        <button className="block w-full px-4 py-2.5 text-left text-[13px] text-red-500 hover:bg-gray-50 border-t border-gray-100">
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Before / After comparison */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={imgs.before}
                    alt="전"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded">
                    BEFORE
                  </span>
                </div>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={imgs.after}
                    alt="후"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#7C3AED] text-white text-[10px] font-bold rounded">
                    AFTER
                  </span>
                </div>
              </div>

              {/* Content */}
              <p className="text-[13px] text-gray-700 leading-relaxed mt-3 line-clamp-4 whitespace-pre-line">
                {review.content}
              </p>

              {/* Footer: hospital + cost + date */}
              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] text-gray-400">{review.date} 작성</span>
                <span className="text-[12px] text-gray-500">
                  총 <span className="font-bold text-gray-900">{review.totalCost.toLocaleString()}</span>
                  <span className="text-[11px]">원</span>
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="pb-24" />
    </div>
  );
}
