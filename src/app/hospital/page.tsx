'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, MapPin, Package } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { useStore } from '@/store';
import { Reservation } from '@/types';

type ProductApprovalTab = 'approved' | 'pending' | 'rejected';

type HospitalProduct = {
  id: string;
  title: string;
  price: number | null;
  original_price?: number | null;
  discount?: number | null;
  image_url?: string | null;
  category?: string | null;
  sub_category?: string | null;
  status?: string | null;
};

const statusLabel: Record<Reservation['status'], string> = {
  pending: '새로운예약',
  confirmed: '예약확정',
  completed: '완료',
  cancelled: '취소',
};

const statusColor: Record<Reservation['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-[#E8F3FF] text-[#3182F6]',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function HospitalHomePage() {
  const { reservations, showModal, showToast, updateReservationStatus } = useStore();
  const [activeTab, setActiveTab] = useState('전체');
  const [productTab, setProductTab] = useState<ProductApprovalTab>('approved');
  const [products, setProducts] = useState<HospitalProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setProducts(data.hospital?.products ?? []);
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
  const cancelledCount = reservations.filter((r) => r.status === 'cancelled').length;

  const tabs = [
    { label: '전체', count: reservations.length },
    { label: '새로운예약', count: pendingCount },
    { label: '확정된예약', count: confirmedCount },
    { label: '취소된예약', count: cancelledCount },
  ];

  const filtered = reservations.filter((r) => {
    if (activeTab === '전체') return true;
    if (activeTab === '새로운예약') return r.status === 'pending';
    if (activeTab === '확정된예약') return r.status === 'confirmed';
    if (activeTab === '취소된예약') return r.status === 'cancelled';
    return true;
  });

  const productCounts = useMemo(() => ({
    approved: products.filter((product) => getProductApprovalTab(product.status) === 'approved').length,
    pending: products.filter((product) => getProductApprovalTab(product.status) === 'pending').length,
    rejected: products.filter((product) => getProductApprovalTab(product.status) === 'rejected').length,
  }), [products]);

  const filteredProducts = products.filter(
    (product) => getProductApprovalTab(product.status) === productTab
  );
  const productTabIndex = ['approved', 'pending', 'rejected'].indexOf(productTab);

  const handleConfirm = (id: string) => {
    showModal('예약 확정', '해당 예약을 확정하시겠습니까?', () => {
      updateReservationStatus(id, 'confirmed');
      showToast('예약이 확정되었습니다.');
    });
  };

  const handleCancel = (id: string) => {
    showModal('예약 취소', '해당 예약을 취소하시겠습니까?', () => {
      updateReservationStatus(id, 'cancelled', '병원측 취소');
      showToast('예약이 취소되었습니다.');
    });
  };

  return (
    <div className="pb-[86px] pt-12 bg-white min-h-screen">
      {/* Header */}
      <div className="fixed left-1/2 top-0 z-50 flex h-12 w-full max-w-[480px] -translate-x-1/2 items-center justify-between bg-white px-2.5 lg:top-[112px]">
        <h1 className="text-lg font-bold">홈</h1>
        <button className="p-1">
          <Bell size={22} className="text-gray-700" />
        </button>
      </div>

      <section className="bg-white">
        <div className="px-5 pt-3 pb-2">
          <h2 className="text-[17px] font-bold text-gray-900">등록상품</h2>
        </div>
        <div className="relative border-b border-gray-100">
          <div className="grid grid-cols-3">
            {[
              { key: 'approved' as const, label: '승인완료' },
              { key: 'pending' as const, label: '승인대기' },
              { key: 'rejected' as const, label: '반려' },
            ].map((tab) => {
              const isActive = productTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setProductTab(tab.key)}
                  className={`h-12 text-[16px] font-medium transition-colors ${
                    isActive
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {tab.label}({productCounts[tab.key]})
                </button>
              );
            })}
          </div>
          <span
            className="absolute bottom-[-1px] left-0 h-0.5 w-1/3 bg-gray-900 transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${productTabIndex * 100}%)` }}
          />
        </div>

        <div className="px-5 py-3">
          {filteredProducts.length === 0 ? (
            <div className="flex min-h-[112px] flex-col items-center justify-center rounded-lg bg-gray-50 text-center">
              <Package size={22} className="text-gray-300" />
              <p className="mt-2 text-[13px] font-medium text-gray-400">
                {productTab === 'approved'
                  ? '승인완료 상품이 없습니다.'
                  : productTab === 'pending'
                    ? '승인대기 상품이 없습니다.'
                    : '반려 상품이 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tab filters */}
      <div className="bg-white px-2.5 pb-3">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`px-2.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.label
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {tab.label} {tab.count}
            </button>
          ))}
        </div>
      </div>

      {/* Reservation list */}
      <div className="px-2.5 py-4">
        {filtered.length === 0 ? (
          <EmptyState icon="calendar" message="예약내역이 존재하지 않아요" />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                {/* Status badge + date */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusColor[reservation.status]
                    }`}
                  >
                    {statusLabel[reservation.status]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {reservation.date}
                  </span>
                </div>

                {/* Product info */}
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative">
                    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center"><span className="text-2xl">🦷</span></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 line-clamp-2">
                      {reservation.productTitle}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {reservation.hospitalName}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                      <p className="text-xs text-gray-400 truncate">
                        {reservation.location}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reservation details */}
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">예약자</span>
                    <span className="text-gray-700">{reservation.customerName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">예약일시</span>
                    <span className="text-gray-700">{reservation.reservationDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">금액</span>
                    <span className="font-bold text-gray-900">
                      {reservation.amount.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* Action buttons for pending */}
                {reservation.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleCancel(reservation.id)}
                      className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium"
                    >
                      예약취소
                    </button>
                    <button
                      onClick={() => handleConfirm(reservation.id)}
                      className="flex-1 py-2.5 bg-[#3182F6] text-white rounded-xl text-sm font-medium"
                    >
                      예약확정
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function getProductApprovalTab(status?: string | null): ProductApprovalTab {
  if (status === 'pending' || status === 'draft' || status === 'paused') return 'pending';
  if (status === 'rejected' || status === 'removed') return 'rejected';
  return 'approved';
}

function ProductRow({ product }: { product: HospitalProduct }) {
  const price = product.price ?? 0;
  const originalPrice = product.original_price ?? 0;
  const category = product.sub_category || product.category;

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-[62px] w-[62px] flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package size={20} className="text-gray-300" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {category && (
          <p className="mb-1 text-[11px] font-medium text-[#3182F6]">{category}</p>
        )}
        <p className="line-clamp-2 text-[14px] font-semibold leading-[19px] text-gray-900">
          {product.title}
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[14px] font-bold text-gray-900">
            {price.toLocaleString('ko-KR')}원
          </span>
          {originalPrice > price && (
            <span className="text-[12px] text-gray-400 line-through">
              {originalPrice.toLocaleString('ko-KR')}원
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
