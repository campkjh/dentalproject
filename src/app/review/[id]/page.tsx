'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, ChevronRight, Share2, Flag, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import TopBar from '@/components/common/TopBar';
import Avatar from '@/components/common/Avatar';
import { reviews, products, hospitals } from '@/lib/mock-data';
import { useStore } from '@/store';

const FACE_PAIRS: Record<string, { before: string; after: string }> = {
  r1: { before: '/images/face_1.jpeg', after: '/images/face_2.jpeg' },
  r2: { before: '/images/face_3.jpeg', after: '/images/face_4.jpeg' },
  r3: { before: '/images/face_5.jpeg', after: '/images/face_6.jpeg' },
  r4: { before: '/images/face_7.jpeg', after: '/images/face_8.jpeg' },
  r5: { before: '/images/face_9.jpeg', after: '/images/face_10.jpeg' },
  r6: { before: '/images/face_11.jpeg', after: '/images/face_12.jpeg' },
};

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const review = reviews.find((r) => r.id === id);

  if (!review) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <TopBar title="리뷰" />
        <div className="flex flex-col items-center justify-center py-20 px-2.5">
          <p className="text-sm text-gray-500 mb-4">리뷰를 찾을 수 없습니다.</p>
          <button onClick={() => router.back()} className="text-sm text-[#7C3AED] font-semibold">
            이전으로
          </button>
        </div>
      </div>
    );
  }

  const product = products.find((p) => p.id === review.productId);
  const hospital = hospitals.find((h) => h.id === review.hospitalId);

  const imgs = FACE_PAIRS[review.id] ?? {
    before: '/images/face_1.jpeg',
    after: '/images/face_2.jpeg',
  };

  const relatedReviews = reviews
    .filter((r) => r.id !== review.id && (r.hospitalId === review.hospitalId || r.productId === review.productId))
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto pb-12 page-enter">
      <TopBar
        title="리뷰"
        rightContent={
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1">
              <MoreHorizontal size={22} className="text-gray-700" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl overflow-hidden scale-in"
                  style={{
                    border: '1px solid #F2F3F5',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    minWidth: 140,
                  }}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      showToast('리뷰 링크를 복사했습니다.');
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-gray-50"
                  >
                    <Share2 size={14} /> 공유하기
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      showToast('리뷰가 신고되었습니다.');
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-[13px] text-red-500 hover:bg-gray-50 border-t border-gray-100"
                  >
                    <Flag size={14} /> 신고하기
                  </button>
                </div>
              </>
            )}
          </div>
        }
      />

      {/* Author row */}
      <div className="px-2.5 pt-3 pb-4 flex items-center gap-3 border-b border-gray-100">
        <Avatar seed={review.authorId || review.id} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-900 leading-tight">
            {review.authorName}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  fill={i < review.rating ? '#FBBF24' : 'transparent'}
                  stroke={i < review.rating ? '#FBBF24' : '#D1D5DB'}
                />
              ))}
            </div>
            <span className="text-[12px] font-semibold text-gray-700">
              {review.rating.toFixed(1)}
            </span>
            <span className="text-[11px] text-gray-400">· {review.date}</span>
          </div>
        </div>
      </div>

      {/* Before / After */}
      <div className="px-2.5 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
            <img src={imgs.before} alt="전" className="w-full h-full object-cover" />
            <span
              className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
            >
              BEFORE
            </span>
          </div>
          <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
            <img src={imgs.after} alt="후" className="w-full h-full object-cover" />
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded bg-[#7C3AED] text-white">
              AFTER
            </span>
          </div>
        </div>
      </div>

      {/* Treatment meta chips */}
      <div className="px-2.5 pt-3 flex flex-wrap gap-1.5">
        <Chip label={review.treatmentName} />
        <Chip label={`${review.totalCost.toLocaleString()}원`} />
        <Chip label={`${review.treatmentDate} 시술`} />
        {review.doctorName && <Chip label={`${review.doctorName} 원장`} />}
      </div>

      {/* Content */}
      <div className="px-2.5 pt-4 pb-5">
        <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-line">
          {review.content}
        </p>
      </div>

      {/* Product link */}
      {product && (
        <div className="border-t border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 px-2.5 pt-4 pb-2">시술받은 상품</p>
          <Link
            href={`/product/${product.id}`}
            className="flex items-center gap-3 px-2.5 py-3 card-press"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🦷</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-500 leading-tight">{product.hospitalName}</p>
              <p className="text-[13px] font-semibold text-gray-900 line-clamp-1 leading-tight mt-0.5">
                {product.title}
              </p>
              <p className="text-[13px] font-bold text-gray-900 mt-0.5">
                {product.price.toLocaleString()}
                <span className="text-[11px] text-gray-500 font-medium ml-0.5">원</span>
              </p>
            </div>
            <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
          </Link>
        </div>
      )}

      {/* Hospital link */}
      {hospital && (
        <div className="border-t border-gray-100">
          <Link
            href={`/hospital/detail/${hospital.id}`}
            className="flex items-center justify-between px-2.5 py-4 card-press"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-500">방문 병원</p>
              <p className="text-[14px] font-semibold text-gray-900 line-clamp-1 mt-0.5">
                {hospital.name}
              </p>
            </div>
            <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
          </Link>
        </div>
      )}

      {/* Related reviews */}
      {relatedReviews.length > 0 && (
        <div className="mt-2 border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between px-2.5 mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">비슷한 후기</h3>
            <span className="text-[12px] text-gray-400">{relatedReviews.length}건</span>
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar px-2.5 pb-1">
            {relatedReviews.map((r) => {
              const rImgs = FACE_PAIRS[r.id] ?? FACE_PAIRS.r1;
              return (
                <Link
                  key={r.id}
                  href={`/review/${r.id}`}
                  className="flex-shrink-0 w-44 card-press"
                >
                  <div className="grid grid-cols-2 gap-1">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img src={rImgs.before} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img src={rImgs.after} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <p className="text-[13px] font-semibold text-gray-900 mt-2 line-clamp-1">
                    {r.treatmentName}
                  </p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Star size={11} fill="#FBBF24" stroke="#FBBF24" />
                    <span className="text-[11px] text-gray-600 font-semibold">
                      {r.rating.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-gray-400 ml-1">
                      {r.authorName}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer disclaimer */}
      <div className="mx-2.5 mt-5 px-3 py-2.5 rounded-lg bg-gray-50">
        <p className="text-[11px] text-gray-500 leading-snug">
          시술 효과는 개인에 따라 차이가 있으며, 본 리뷰는 작성자의 경험을 바탕으로 한 주관적인 후기입니다.
        </p>
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center text-[11px] font-semibold text-gray-700 bg-gray-100 rounded-full"
      style={{ padding: '4px 10px' }}
    >
      {label}
    </span>
  );
}
