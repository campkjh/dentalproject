'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { products, coupons } from '@/lib/mock-data';

export default function PaymentPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <PaymentPage />
    </Suspense>
  );
}

function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const { user, showToast, addReservation } = useStore();
  const [showCouponDropdown, setShowCouponDropdown] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [pointInput, setPointInput] = useState('');

  const product = products.find(p => p.id === productId) ?? products[0];
  const hospital = product.hospitalName;

  const availableCoupons = coupons.filter((c) => c.status === 'available');
  const selectedCoupon = availableCoupons.find((c) => c.id === selectedCouponId);

  const userPoints = user?.points ?? 5000;
  const pointsToUse = Math.min(
    parseInt(pointInput || '0', 10) || 0,
    userPoints
  );

  const basePrice = product.price;
  const vatAmount = Math.round(basePrice * 0.1);
  const couponDiscount = selectedCoupon?.discountAmount ?? 0;
  const totalPrice = Math.max(basePrice + vatAmount - couponDiscount - pointsToUse, 0);

  const handleUseAllPoints = () => {
    setPointInput(String(userPoints));
  };

  const handlePayment = () => {
    const newReservation = {
      id: `res-${Date.now()}`,
      status: 'pending' as const,
      date: new Date().toLocaleDateString('ko-KR'),
      productTitle: product.title,
      productImage: product.imageUrl,
      hospitalName: product.hospitalName,
      hospitalId: product.hospitalId,
      location: product.location,
      visitDate: '2026년 4월 15일',
      reservationDate: '2026년 4월 15일 17:00',
      amount: totalPrice,
      customerName: user?.name ?? '홍길동',
      customerPhone: user?.phone ?? '010-0000-0000',
      paymentMethod: '카드결제',
    };
    addReservation(newReservation);
    showToast('결제가 완료되었습니다!');
    router.push('/payment/success');
  };

  const handleCouponSelect = (couponId: string) => {
    setSelectedCouponId(couponId === selectedCouponId ? null : couponId);
    setShowCouponDropdown(false);
  };

  return (
    <div className="pb-28 bg-gray-50 min-h-screen lg:max-w-2xl lg:mx-auto lg:py-8">
      <TopBar title="결제하기" />

      {/* Product Info Card */}
      <div className="mx-4 mt-2 mb-3 bg-white rounded-xl p-4">
        <div className="flex gap-3">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🦷</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold mb-1 line-clamp-2">{product.title}</h3>
            <p className="text-xs text-gray-400">{hospital}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{product.location}</p>
          </div>
        </div>
      </div>

      {/* Reservation Info */}
      <div className="mx-4 mb-3 bg-white rounded-xl p-4">
        <h3 className="font-bold text-sm mb-3">예약 정보</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">예약자</span>
            <span className="text-sm font-medium">{user?.name ?? '홍길동'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">예약일시</span>
            <span className="text-sm font-medium">2026년 4월 15일 17:00</span>
          </div>
        </div>
      </div>

      {/* Coupon Section */}
      <div className="mx-4 mb-3 bg-white rounded-xl p-4">
        <h3 className="font-bold text-sm mb-3">쿠폰</h3>
        <div className="relative">
          <button
            onClick={() => setShowCouponDropdown(!showCouponDropdown)}
            className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-2.5 py-3"
          >
            <span className={`text-sm ${selectedCoupon ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {selectedCoupon
                ? `${selectedCoupon.name} (-${selectedCoupon.discountAmount.toLocaleString()}원)`
                : `사용 가능한 쿠폰 ${availableCoupons.length}장`}
            </span>
            {showCouponDropdown ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>
          {showCouponDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 max-h-60 overflow-y-auto">
              {/* No coupon option */}
              <button
                onClick={() => {
                  setSelectedCouponId(null);
                  setShowCouponDropdown(false);
                }}
                className={`w-full text-left px-2.5 py-3 text-sm border-b border-gray-50 ${
                  !selectedCouponId ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-500'
                }`}
              >
                쿠폰 미사용
              </button>
              {availableCoupons.map((coupon) => (
                <button
                  key={coupon.id}
                  onClick={() => handleCouponSelect(coupon.id)}
                  className={`w-full text-left px-2.5 py-3 border-b border-gray-50 last:border-0 ${
                    selectedCouponId === coupon.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <p
                    className={`text-sm ${
                      selectedCouponId === coupon.id ? 'text-[#7C3AED] font-medium' : 'text-gray-800'
                    }`}
                  >
                    {coupon.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    -{coupon.discountAmount.toLocaleString()}원
                    {coupon.daysLeft !== undefined && ` | ${coupon.daysLeft}일 남음`}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Points Section */}
      <div className="mx-4 mb-3 bg-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">포인트</h3>
          <span className="text-xs text-gray-400">
            보유 <span className="text-[#7C3AED] font-medium">{userPoints.toLocaleString()}</span>P
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center border border-gray-200 rounded-xl px-2.5 py-2.5">
            <input
              type="number"
              value={pointInput}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 0) {
                  setPointInput('');
                } else if (val > userPoints) {
                  setPointInput(String(userPoints));
                } else {
                  setPointInput(e.target.value);
                }
              }}
              placeholder="0"
              className="flex-1 text-sm outline-none bg-transparent"
            />
            <span className="text-sm text-gray-400 ml-1">P</span>
          </div>
          <button
            onClick={handleUseAllPoints}
            className="px-2.5 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 whitespace-nowrap"
          >
            전액사용
          </button>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="mx-4 mb-3 bg-white rounded-xl p-4">
        <h3 className="font-bold text-sm mb-3">결제 금액</h3>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">금액</span>
            <span className="text-sm">{basePrice.toLocaleString()}원</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">부가세 VAT</span>
            <span className="text-sm">{vatAmount.toLocaleString()}원</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">쿠폰</span>
              <span className="text-sm text-[#7C3AED]">-{couponDiscount.toLocaleString()}원</span>
            </div>
          )}
          {pointsToUse > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">포인트사용</span>
              <span className="text-sm text-[#7C3AED]">-{pointsToUse.toLocaleString()}원</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">총금액</span>
              <span className="text-lg font-bold text-[#7C3AED]">{totalPrice.toLocaleString()}원</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Payment Button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-2.5 py-3 z-50 lg:static lg:mt-4 lg:px-0 lg:border-0 lg:transform-none lg:left-auto lg:max-w-none">
        <button
          onClick={handlePayment}
          className="w-full py-3.5 bg-[#7C3AED] text-white rounded-xl font-bold text-sm"
        >
          {totalPrice.toLocaleString()}원 결제하기
        </button>
      </div>
    </div>
  );
}
