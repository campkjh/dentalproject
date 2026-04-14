'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Star } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { products } from '@/lib/mock-data';

export default function ReviewWritePageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <ReviewWritePage />
    </Suspense>
  );
}

function ReviewWritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const { user, addReview, showToast } = useStore();

  const product = products.find((p) => p.id === productId) ?? products[0];

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [treatmentDate, setTreatmentDate] = useState('');
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);

  const MAX_CONTENT = 2000;

  const handleImageUpload = (type: 'before' | 'after') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (type === 'before') {
            setBeforeImage(result);
          } else {
            setAfterImage(result);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSubmit = () => {
    if (rating === 0) {
      showToast('별점을 선택해주세요.');
      return;
    }
    if (!content.trim()) {
      showToast('리뷰 내용을 입력해주세요.');
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const review = {
      id: String(Date.now()),
      authorName: user?.name || '사용자',
      authorId: user?.id || 'guest',
      date: dateStr,
      rating,
      content: content.trim(),
      beforeImage: beforeImage || undefined,
      afterImage: afterImage || undefined,
      treatmentName: product.title,
      totalCost: parseInt(totalCost.replace(/[^0-9]/g, ''), 10) || 0,
      treatmentDate: treatmentDate || dateStr,
      productId: product.id,
      hospitalId: product.hospitalId,
    };

    addReview(review);
    showToast('리뷰가 등록되었습니다. +500P');
    router.push('/mypage/reviews');
  };

  const isFormValid = rating > 0 && content.trim().length > 0;

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    return Number(numericValue).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-white">
      <TopBar title="리뷰작성" />

      <div className="px-2.5 py-4 space-y-5">
        {/* Product Info Card */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🦷</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                {product.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{product.hospitalName}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{product.location}</p>
            </div>
          </div>
        </div>

        {/* Star Rating */}
        <div className="bg-white rounded-xl p-4">
          <label className="text-sm font-bold text-gray-900 mb-3 block">별점</label>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-1"
              >
                <Star
                  size={36}
                  className={`transition-colors ${
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-xs text-gray-500 mt-2">
              {rating}점
            </p>
          )}
        </div>

        {/* Before/After Photos */}
        <div className="bg-white rounded-xl p-4">
          <label className="text-sm font-bold text-gray-900 mb-3 block">
            <span className="text-gray-400 font-normal">[선택]</span> 전/후 사진
          </label>
          <div className="flex gap-3">
            {/* Before Photo */}
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-2 text-center">전</p>
              {beforeImage ? (
                <div
                  className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => handleImageUpload('before')}
                >
                  <img
                    src={beforeImage}
                    alt="시술 전"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <button
                  onClick={() => handleImageUpload('before')}
                  className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 bg-gray-50"
                >
                  <Camera size={28} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400">사진 추가</span>
                </button>
              )}
            </div>

            {/* After Photo */}
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-2 text-center">후</p>
              {afterImage ? (
                <div
                  className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => handleImageUpload('after')}
                >
                  <img
                    src={afterImage}
                    alt="시술 후"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <button
                  onClick={() => handleImageUpload('after')}
                  className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 bg-gray-50"
                >
                  <Camera size={28} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400">사진 추가</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Treatment Info */}
        <div className="bg-white rounded-xl p-4 space-y-4">
          <label className="text-sm font-bold text-gray-900 block">시술 정보</label>

          {/* Total Cost */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">시술전체비용</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-2.5 py-3 bg-white">
              <input
                type="text"
                inputMode="numeric"
                value={totalCost}
                onChange={(e) => setTotalCost(formatCurrency(e.target.value))}
                placeholder="0"
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
              />
              <span className="text-sm text-gray-400 ml-1">원</span>
            </div>
          </div>

          {/* Treatment Date */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">시술받은시기</label>
            <input
              type="date"
              value={treatmentDate}
              onChange={(e) => setTreatmentDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-3 text-sm outline-none focus:border-[#7C3AED] bg-white text-gray-900"
            />
          </div>
        </div>

        {/* Review Content */}
        <div className="bg-white rounded-xl p-4">
          <label className="text-sm font-bold text-gray-900 mb-2 block">리뷰 내용</label>
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CONTENT) {
                  setContent(e.target.value);
                }
              }}
              placeholder="시술 후기를 자유롭게 작성해 주세요"
              rows={6}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-3 text-sm outline-none focus:border-[#7C3AED] resize-none bg-white placeholder:text-gray-400"
            />
            <span className="absolute bottom-3 right-3 text-xs text-gray-400">
              {content.length}/{MAX_CONTENT}
            </span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="px-2.5 py-6">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors ${
            isFormValid
              ? 'bg-[#7C3AED] text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          리뷰 등록
        </button>
      </div>
    </div>
  );
}
