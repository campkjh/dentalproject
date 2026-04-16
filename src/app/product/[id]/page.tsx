'use client';

import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  Share2,
  Star,
  Phone,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  ChevronLeft,
  User,
  MoreHorizontal,
} from 'lucide-react';
import TabBar from '@/components/common/TabBar';
import FixedBar from '@/components/common/FixedBar';
import { useStore } from '@/store';

const faqItems = [
  {
    question: '시술 전 준비사항이 있나요?',
    answer: '시술 전 특별한 준비사항은 없습니다. 다만, 시술 당일에는 음식물 섭취를 자제해주시고, 병원 방문 시 편한 복장으로 와주시면 됩니다.',
  },
  {
    question: '시술 후 주의사항은 무엇인가요?',
    answer: '시술 후 24시간 동안은 뜨거운 음식이나 자극적인 음식을 피해주세요. 시술 부위를 손으로 만지지 말아주시고, 처방된 약을 정해진 시간에 복용해주세요.',
  },
  {
    question: '환불 및 취소 규정이 어떻게 되나요?',
    answer: '예약 3일 전까지 무료 취소가 가능합니다. 예약 1~2일 전 취소 시 예약금의 50%가 환불되며, 당일 취소 시에는 환불이 어렵습니다.',
  },
  {
    question: '분할 결제가 가능한가요?',
    answer: '네, 카드 분할 결제가 가능합니다. 병원 방문 시 상담을 통해 최대 12개월까지 무이자 할부 결제를 진행하실 수 있습니다.',
  },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { products, hospitals, reviews, wishlist, toggleWishlist, addRecentlyViewed, showToast } = useStore();
  const tabs = ['상품설명', '병원정보', '리뷰'];
  const [activeTab, setActiveTab] = useState('상품설명');
  const [tabDirection, setTabDirection] = useState<'left' | 'right'>('right');
  const prevTabIdxRef = useRef(0);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  const activeTabIdx = tabs.indexOf(activeTab);

  const changeTab = (t: string) => {
    const nextIdx = tabs.indexOf(t);
    setTabDirection(nextIdx >= prevTabIdxRef.current ? 'right' : 'left');
    prevTabIdxRef.current = nextIdx;
    setActiveTab(t);
  };

  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[activeTabIdx];
    if (!btn) return;
    setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeTabIdx]);

  useEffect(() => {
    const onResize = () => {
      const btn = tabBtnRefs.current[activeTabIdx];
      if (!btn) return;
      setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeTabIdx]);

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [heartAnim, setHeartAnim] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const reviewSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (reviewSectionRef.current) {
        const rect = reviewSectionRef.current.getBoundingClientRect();
        setShowScrollTop(rect.bottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const product = useMemo(() => {
    const found = products.find((p) => p.id === params.id);
    if (found) addRecentlyViewed(found.id);
    return found;
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hospital = useMemo(
    () => hospitals.find((h) => h.id === product?.hospitalId),
    [product]
  );

  const productReviews = useMemo(
    () => reviews.filter((r) => r.productId === product?.id || r.hospitalId === product?.hospitalId),
    [product]
  );

  const hospitalProducts = useMemo(
    () => products.filter((p) => p.hospitalId === product?.hospitalId && p.id !== product?.id),
    [product]
  );

  const isWished = product ? wishlist.includes(product.id) : false;

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">상품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const avgRating = productReviews.length > 0
    ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
    : product.rating.toFixed(1);

  return (
    <div className="bg-white min-h-screen page-enter" style={{ paddingTop: 48, paddingBottom: 72 }}>

      {/* Fixed Header - portal to body */}
      <FixedBar position="top" className="lg:hidden">
        <div className="flex items-center justify-between px-2.5 h-12 bg-white/90 backdrop-blur-md">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft size={24} style={{ color: '#2B313D' }} />
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { toggleWishlist(product.id); setHeartAnim(true); setTimeout(() => setHeartAnim(false), 400); }}
            >
              <Heart
                size={22}
                className={`${isWished ? 'text-red-500' : ''} ${heartAnim ? 'heart-pop' : ''}`}
                style={{ color: isWished ? '#EF4444' : '#2B313D' }}
                fill={isWished ? '#EF4444' : 'none'}
              />
            </button>
            <button onClick={() => { if (navigator.share) { navigator.share({ title: product.title, url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href); showToast('링크가 복사되었습니다.'); } }}>
              <Share2 size={22} style={{ color: '#2B313D' }} />
            </button>
          </div>
        </div>
      </FixedBar>

      <div className="lg:max-w-7xl lg:mx-auto lg:grid lg:grid-cols-5 lg:gap-8 lg:py-8 lg:px-6">
      {/* Product Image Area */}
      <div className="relative lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
        <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center lg:rounded-2xl">
          <span className="text-6xl">🦷</span>
        </div>
      </div>

      {/* Info Section */}
      <div className="lg:col-span-3 fade-in-up">

      {/* Product Info - open layout, no wrapping */}
      <div className="bg-white px-2.5 pt-5 pb-4">
        <Link href={`/hospital/detail/${product.hospitalId}`} style={{ fontSize: 13, color: '#A4ABBA' }} className="hover:underline">{product.hospitalName}</Link>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D', lineHeight: '28px', marginTop: 4 }}>{product.title}</h1>
        <div className="flex items-center gap-1.5 mt-2">
          <Star size={15} fill="#FBBF24" stroke="#FBBF24" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#2B313D' }}>{avgRating}</span>
          <span style={{ fontSize: 13, color: '#A4ABBA' }}>({product.reviewCount})</span>
        </div>

        {/* Pricing - bigger, open */}
        <div className="mt-4">
          {product.originalPrice && (
            <p style={{ fontSize: 14, color: '#A4ABBA', textDecoration: 'line-through' }}>
              {product.originalPrice.toLocaleString()}원
            </p>
          )}
          <div className="flex items-baseline gap-2 mt-0.5">
            {product.discount && (
              <span style={{ fontSize: 24, fontWeight: 600, color: '#8037FF' }}>{product.discount}%</span>
            )}
            <span style={{ fontSize: 24, fontWeight: 600, color: '#2B313D' }}>{product.price.toLocaleString()}원</span>
            <span style={{ fontSize: 12, color: '#A4ABBA' }}>VAT포함</span>
          </div>
        </div>

        {/* Tags - flat, no box */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {product.tags.map((tag) => (
            <span key={tag} style={{ backgroundColor: '#F2F3F5', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#51535C' }} className="px-2.5 py-1">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

      {/* Product Options - separated section */}
      {product.options && product.options.length > 0 && (
        <>
          <div className="bg-white px-2.5 py-4">
            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D', marginBottom: 12 }}>옵션 선택</h3>
            {product.options.map((option, idx) => (
              <div
                key={option.id}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: idx < product.options!.length - 1 ? '1px solid #F2F3F5' : 'none' }}
              >
                <span style={{ fontSize: 14, color: '#51535C' }}>{option.name}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#2B313D' }}>{option.price.toLocaleString()}원</span>
              </div>
            ))}
          </div>
          <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />
        </>
      )}

      {/* Customer Reviews Summary - open */}
      <div ref={reviewSectionRef} className="bg-white px-2.5 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D' }}>고객후기모음</h2>
          <span className="text-sm text-gray-400">{productReviews.length}건</span>
        </div>
        {/* Rating summary with progress bars */}
        {productReviews.length > 0 && (() => {
          const counts = [0, 0, 0, 0, 0];
          productReviews.forEach(r => { const idx = Math.min(Math.max(Math.round(r.rating) - 1, 0), 4); counts[idx]++; });
          const total = productReviews.length;
          return (
            <div className="flex gap-5 mb-4" style={{ padding: '16px', backgroundColor: '#F9F9FB', borderRadius: 12 }}>
              {/* Left: score + stars */}
              <div className="flex flex-col items-center justify-center" style={{ minWidth: 80 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#2B313D', lineHeight: 1 }}>{avgRating}</span>
                <div className="flex gap-0.5 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < Math.round(Number(avgRating)) ? '#FBBF24' : '#E5E7EB'} stroke={i < Math.round(Number(avgRating)) ? '#FBBF24' : '#E5E7EB'} />
                  ))}
                </div>
              </div>
              {/* Right: progress bars */}
              <div className="flex-1 flex flex-col justify-center gap-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = counts[star - 1];
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#A4ABBA', width: 14, textAlign: 'right' }}>{star}</span>
                      <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#FBBF24', transition: 'width 0.3s ease' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#A4ABBA', width: 32, textAlign: 'right' }}>{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {productReviews.length > 0 && (
          <div className="flex overflow-x-auto hide-scrollbar pb-2" style={{ gap: 6, scrollSnapType: 'x mandatory' }}>
            {productReviews.map((review) => (
              <Link
                key={review.id}
                href={`/review/${review.id}`}
                className="flex-shrink-0 flex flex-col card-press"
                style={{ width: 288, height: 358, borderRadius: 12, backgroundColor: '#F6F6F6', padding: 12, overflow: 'hidden', scrollSnapAlign: 'start' }}
              >
                {/* 전/후 이미지 - r값: 전=좌상좌하12, 후=우상우하12 */}
                <div className="flex" style={{ gap: 0 }}>
                  <div className="flex-1 aspect-square relative overflow-hidden" style={{ borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#EBEBEB' }}>
                      <span className="text-2xl">📷</span>
                    </div>
                    <span style={{ position: 'absolute', top: 0, left: 0, fontSize: 11, fontWeight: 600, color: '#fff', backgroundColor: '#8037FF', borderTopLeftRadius: 12, borderBottomRightRadius: 12, padding: '3px 10px', lineHeight: '11px', width: 28, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>전</span>
                  </div>
                  <div className="flex-1 aspect-square relative overflow-hidden" style={{ borderTopRightRadius: 12, borderBottomRightRadius: 12, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#EBEBEB' }}>
                      <span className="text-2xl">📷</span>
                    </div>
                    <span style={{ position: 'absolute', top: 0, right: 0, fontSize: 11, fontWeight: 600, color: '#fff', backgroundColor: '#2B313D', borderTopRightRadius: 12, borderBottomLeftRadius: 12, padding: '3px 10px', lineHeight: '11px', width: 28, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>후</span>
                  </div>
                </div>
                {/* 시술비용 + 시술시기 태그 */}
                <div className="flex gap-1" style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#2B313D', backgroundColor: 'rgba(200,206,218,0.2)', borderRadius: 6, padding: '2px 6px' }}>{review.totalCost.toLocaleString()}원</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#2B313D', backgroundColor: 'rgba(200,206,218,0.2)', borderRadius: 6, padding: '2px 6px' }}>{review.treatmentDate}</span>
                </div>
                {/* 시술명 */}
                <p style={{ fontSize: 13, fontWeight: 600, color: '#2B313D', marginTop: 6 }} className="truncate">{review.treatmentName}</p>
                {/* 날짜 */}
                <p style={{ fontSize: 11, color: '#A4ABBA', marginTop: 2 }}>{review.date}</p>
                {/* 별점 */}
                <div className="flex items-center gap-1" style={{ marginTop: 4 }}>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} width={14} height={14} fill={i < review.rating ? '#FBBF24' : '#E5E7EB'} stroke={i < review.rating ? '#FBBF24' : '#E5E7EB'} />
                    ))}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2B313D' }}>{review.rating.toFixed(1)}</span>
                </div>
                {/* 후기 */}
                <p style={{ fontSize: 12, color: '#51535C', lineHeight: '17px', marginTop: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>{review.content}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

      {/* Tabs with sliding underline indicator */}
      <div style={{ position: 'sticky', top: 48, zIndex: 30 }} className="bg-white lg:static">
        <div className="relative flex border-b border-gray-100">
          {tabs.map((t, i) => {
            const isActive = activeTab === t;
            return (
              <button
                key={t}
                ref={(el) => {
                  tabBtnRefs.current[i] = el;
                }}
                onClick={() => changeTab(t)}
                className="flex-1 py-3 text-[14px] font-semibold"
                style={{
                  color: isActive ? '#2B313D' : '#A4ABBA',
                  transition: 'color 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {t}
              </button>
            );
          })}
          <span
            aria-hidden
            className="absolute bottom-0 h-[2px] bg-[#2B313D] pointer-events-none"
            style={{
              left: tabIndicator.left,
              width: tabIndicator.width,
              transition:
                'left 380ms cubic-bezier(0.22, 1, 0.36, 1), width 380ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>
      </div>

      {/* Tab Content - open layout */}
      <div
        key={activeTab}
        className={tabDirection === 'right' ? 'tab-slide-right' : 'tab-slide-left'}
      >
      {activeTab === '상품설명' && (
        <div className="bg-white">
          <div className="aspect-[4/3] bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <span className="text-5xl block mb-2">🦷</span>
              <p style={{ fontSize: 13, color: '#A4ABBA' }}>상품 상세 이미지</p>
            </div>
          </div>
          <div className="px-2.5 py-5">
            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D', marginBottom: 8 }}>{product.title}</h3>
            <p style={{ fontSize: 14, color: '#51535C', lineHeight: '22px' }}>
              {product.hospitalName}에서 제공하는 {product.title} 시술입니다.
              최고 수준의 의료진과 첨단 장비로 안전하고 만족스러운 결과를 약속드립니다.
            </p>
          </div>
        </div>
      )}

      {activeTab === '병원정보' && hospital && (
        <div>
          {/* Hospital info */}
          <div className="bg-white px-2.5 py-5">
            <Link href={`/hospital/detail/${hospital.id}`} className="flex items-start gap-3 hover:opacity-80 transition-opacity">
              <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: '#F2F3F5' }}>
                {hospital.logoUrl ? (
                  <img src={hospital.logoUrl} alt={hospital.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">🏥</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2B313D' }}>{hospital.name}</h3>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#51535C' }}>{hospital.address}</p>
                <div className="flex flex-wrap gap-1.5">
                  {hospital.tags.map((tag) => (
                    <span key={tag} style={{ backgroundColor: '#F2F3F5', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#51535C' }} className="px-2.5 py-1">{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
            <button
              onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(hospital.name + ' ' + hospital.address)}`, '_blank')}
              style={{ height: 48, borderRadius: 12, backgroundColor: '#F2F3F5', fontSize: 18, fontWeight: 600, color: '#2B313D' }}
              className="w-full flex items-center justify-center gap-2 mt-4"
            >
              <img src="/icons/naver-map.svg" alt="" width={20} height={26} />
              찾아오시는길
            </button>
          </div>

          <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

          {/* Address + Map */}
          <div className="bg-white px-2.5 py-5">
            {hospital.addressDetail && (
              <div className="flex items-start gap-2 mb-4">
                <MapPin size={16} style={{ color: '#A4ABBA', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, color: '#51535C', lineHeight: '20px', whiteSpace: 'pre-line' }}>{hospital.addressDetail}</p>
              </div>
            )}
            <div className="aspect-[16/9] rounded-xl overflow-hidden" style={{ border: '1px solid #C8CEDA' }}>
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(hospital.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade" title="병원 위치"
              />
            </div>
          </div>

          <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

          {/* Operating Hours */}
          <div className="bg-white px-2.5 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} style={{ color: '#A4ABBA' }} />
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D' }}>진료시간</h3>
            </div>
            {(() => {
              const dayMap: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
              const todayIdx = new Date().getDay();
              return hospital.operatingHours.map((oh) => {
                const isToday = dayMap[oh.day] === todayIdx;
                const isClosed = oh.isClosed;
                return (
                  <div
                    key={oh.day}
                    className="flex items-center justify-between"
                    style={{
                      padding: '8px 8px',
                      borderRadius: 8,
                      marginBottom: 2,
                      opacity: isClosed ? 0.6 : 1,
                      backgroundColor: isToday ? '#F0EBFF' : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500, color: isToday ? '#7C3AED' : '#2B313D', width: 28 }}>{oh.day}</span>
                    {isClosed ? (
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#51535C', backgroundColor: '#F2F3F5', borderRadius: 8, padding: '4px 10px' }}>휴진</span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#51535C', backgroundColor: '#F2F3F5', borderRadius: 8, padding: '4px 10px' }}>{oh.startTime} - {oh.endTime}</span>
                    )}
                  </div>
                );
              });
            })()}
            {hospital.holidayNotice && (
              <p style={{ fontSize: 12, color: '#EF4444', marginTop: 8 }}>{hospital.holidayNotice}</p>
            )}
          </div>

          <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

          {/* Doctors - flat list */}
          <div className="bg-white px-2.5 py-5">
            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D', marginBottom: 16 }}>의료진 소개</h3>
            {(() => {
              const BLOB = 'https://4ipmgcqyzk6ysqa7.public.blob.vercel-storage.com';
              const faceImages = [
                `${BLOB}/face.jpeg`, `${BLOB}/face_1.jpeg`, `${BLOB}/face_2.jpeg`, `${BLOB}/face_3.jpeg`,
                `${BLOB}/face_4.jpeg`, `${BLOB}/face_5.jpeg`, `${BLOB}/face_6.jpeg`, `${BLOB}/face_7.jpeg`,
                `${BLOB}/face_8.jpeg`, `${BLOB}/face_9.jpeg`, `${BLOB}/face_10.jpeg`, `${BLOB}/face_11.jpeg`,
                `${BLOB}/face_12.jpeg`, `${BLOB}/face_13.jpeg`, `${BLOB}/face_14.jpeg`, `${BLOB}/face_15.jpeg`,
                `${BLOB}/face_16.jpeg`, `${BLOB}/face_17.jpeg`, `${BLOB}/face_18.jpeg`,
              ];
              return hospital.doctors.map((doctor, idx) => (
              <Link key={doctor.id} href={`/doctor/${doctor.id}`}
                className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity"
                style={{ borderBottom: idx < hospital.doctors.length - 1 ? '1px solid #F2F3F5' : 'none' }}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F2F3F5' }}>
                  <img src={faceImages[idx % faceImages.length]} alt={doctor.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#2B313D' }}>{doctor.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#8037FF' }}>{doctor.title}</span>
                    {doctor.isOwner && (
                      <span style={{ fontSize: 10, backgroundColor: '#8037FF', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>대표</span>
                    )}
                  </div>
                  {doctor.specialty && (
                    <p style={{ fontSize: 12, color: '#A4ABBA', marginTop: 2 }}>{doctor.specialty}</p>
                  )}
                </div>
              </Link>
            ));
            })()}
          </div>

          {/* More Products from Hospital */}
          {hospitalProducts.length > 0 && (
            <>
              <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />
              <div className="bg-white px-2.5 py-5">
                <h3 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D', marginBottom: 12 }}>이 병원의 다른 상품</h3>
                {hospitalProducts.map((hp, idx) => (
                  <button key={hp.id} onClick={() => router.push(`/product/${hp.id}`)}
                    className="w-full flex items-center gap-3 py-3 text-left"
                    style={{ borderBottom: idx < hospitalProducts.length - 1 ? '1px solid #F2F3F5' : 'none' }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🦷</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#2B313D' }} className="truncate">{hp.title}</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        {hp.discount && <span style={{ fontSize: 15, fontWeight: 600, color: '#8037FF' }}>{hp.discount}%</span>}
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#2B313D' }}>{hp.price.toLocaleString()}원</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === '병원정보' && !hospital && (
        <div className="bg-white py-10 text-center" style={{ fontSize: 14, color: '#A4ABBA' }}>병원 정보가 없습니다.</div>
      )}

      {activeTab === '리뷰' && (
        <div className="bg-white">
          {productReviews.length > 0 ? (
            <div>
              {productReviews.map((review, idx) => (
                <div key={review.id} className="px-2.5 py-5" style={{ borderBottom: idx < productReviews.length - 1 ? '8px solid #F2F3F5' : 'none' }}>

                  {/* 닉네임 + 메뉴 */}
                  <div className="flex items-center justify-between">
                    <p style={{ fontSize: 16, fontWeight: 600, color: '#2B313D' }}>{review.authorName}</p>
                    <ReviewMenu reviewId={review.id} authorName={review.authorName} />
                  </div>

                  {/* 날짜 */}
                  <p style={{ fontSize: 14, color: '#A4ABBA', marginTop: 2 }}>{review.date}</p>

                  {/* 별점 */}
                  <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} width={24} height={24} fill={i < review.rating ? '#FBBF24' : '#E5E7EB'} stroke={i < review.rating ? '#FBBF24' : '#E5E7EB'} />
                      ))}
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 600, color: '#2B313D' }}>{review.rating.toFixed(1)}</span>
                  </div>

                  {/* 전/후 이미지 - 전:좌상좌하12 후:우상우하12 */}
                  <div className="flex" style={{ marginTop: 14, gap: 0 }}>
                    <div className="flex-1 aspect-square relative overflow-hidden" style={{ borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#F2F3F5' }}>
                        <span className="text-3xl">📷</span>
                      </div>
                      <span style={{ position: 'absolute', top: 0, left: 0, fontSize: 14, fontWeight: 600, color: '#fff', backgroundColor: '#8037FF', borderTopLeftRadius: 12, borderBottomRightRadius: 12, padding: '4px 14px', width: 36, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>전</span>
                    </div>
                    <div className="flex-1 aspect-square relative overflow-hidden" style={{ borderTopRightRadius: 12, borderBottomRightRadius: 12, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#F2F3F5' }}>
                        <span className="text-3xl">📷</span>
                      </div>
                      <span style={{ position: 'absolute', top: 0, right: 0, fontSize: 14, fontWeight: 600, color: '#fff', backgroundColor: '#2B313D', borderTopRightRadius: 12, borderBottomLeftRadius: 12, padding: '4px 14px', width: 36, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>후</span>
                    </div>
                  </div>

                  {/* 시술명 */}
                  <p style={{ fontSize: 18, fontWeight: 600, color: '#2B313D', marginTop: 14 }}>{review.treatmentName}</p>

                  {/* 시술전체비용 */}
                  <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 14, color: '#A4ABBA' }}>시술전체비용</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#2B313D', backgroundColor: 'rgba(200,206,218,0.2)', borderRadius: 8, padding: '4px 10px' }}>{review.totalCost.toLocaleString()}원</span>
                  </div>

                  {/* 시술받은시기 */}
                  <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 14, color: '#A4ABBA' }}>시술받은시기</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#2B313D', backgroundColor: 'rgba(200,206,218,0.2)', borderRadius: 8, padding: '4px 10px' }}>{review.treatmentDate}</span>
                  </div>

                  {/* 후기 내용 - 더보기 */}
                  <ReviewContent content={review.content} />

                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center" style={{ fontSize: 14, color: '#A4ABBA' }}>아직 작성된 리뷰가 없습니다.</div>
          )}
        </div>
      )}
      </div>{/* End tab content wrapper */}

      <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

      {/* FAQ Section - flat */}
      <div className="bg-white px-2.5 py-5">
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 12 }}>자주묻는질문</h2>
        {faqItems.map((faq, index) => (
          <div key={index} style={{ marginBottom: 4 }}>
            <button
              onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              className="w-full flex items-center justify-between text-left"
              style={{ padding: '12px 8px', borderRadius: 12, transition: 'background-color 0.15s ease', backgroundColor: expandedFaq === index ? '#F6F6F6' : 'transparent' }}
              onMouseDown={(e) => (e.currentTarget.style.backgroundColor = '#F0F0F0')}
              onMouseUp={(e) => (e.currentTarget.style.backgroundColor = expandedFaq === index ? '#F6F6F6' : 'transparent')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = expandedFaq === index ? '#F6F6F6' : 'transparent')}
            >
              <span style={{ fontSize: 16, fontWeight: 600, color: '#2B313D', flex: 1 }}>{faq.question}</span>
              <ChevronDown
                size={18}
                style={{
                  color: '#A4ABBA', flexShrink: 0,
                  transform: expandedFaq === index ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              />
            </button>
            <div
              style={{
                maxHeight: expandedFaq === index ? 300 : 0,
                opacity: expandedFaq === index ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.35s ease, opacity 0.3s ease',
              }}
            >
              <div style={{ padding: '4px 8px 12px 8px' }}>
                <p style={{ fontSize: 16, fontWeight: 500, color: '#51535C', lineHeight: '24px' }}>{faq.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      </div>{/* End Info Section */}
      </div>{/* End grid wrapper */}

      {/* Scroll to top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          position: 'fixed',
          bottom: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: 'rgba(17, 17, 17, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          border: 'none',
          cursor: 'pointer',
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        className="lg:hidden"
      >
        <ChevronUp size={22} style={{ color: '#fff' }} />
      </button>

      {/* Bottom Fixed Bar - portal to body */}
      <FixedBar position="bottom" className="lg:hidden">
        {/* Closed-hours banner */}
        {(() => {
          if (!hospital) return null;
          const dayMap: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
          const now = new Date();
          const todayIdx = now.getDay();
          const todayHour = hospital.operatingHours.find(oh => dayMap[oh.day] === todayIdx);
          if (!todayHour) return null;
          if (todayHour.isClosed) {
            // Find next open day
            const nextOpen = hospital.operatingHours.find((oh, i) => {
              const ohIdx = dayMap[oh.day];
              return ohIdx > todayIdx && !oh.isClosed;
            }) || hospital.operatingHours.find(oh => !oh.isClosed);
            return (
              <div style={{ backgroundColor: '#2B313D', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#fff' }}>
                오늘은 휴진입니다{nextOpen ? ` · ${nextOpen.day}요일 ${nextOpen.startTime}에 운영해요` : ''}
              </div>
            );
          }
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();
          const currentTime = currentHour * 60 + currentMin;
          const [startH, startM] = (todayHour.startTime || '09:00').split(':').map(Number);
          const [endH, endM] = (todayHour.endTime || '18:00').split(':').map(Number);
          const startTime = startH * 60 + startM;
          const endTime = endH * 60 + endM;
          if (currentTime < startTime) {
            return (
              <div style={{ backgroundColor: '#2B313D', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#fff' }}>
                아직 운영시간이 아니에요 · {todayHour.startTime}에 운영해요
              </div>
            );
          }
          if (currentTime > endTime) {
            return (
              <div style={{ backgroundColor: '#2B313D', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#fff' }}>
                오늘 운영이 종료되었습니다
              </div>
            );
          }
          return null;
        })()}
        <div className="bg-white px-2.5" style={{ borderTop: '1px solid #F2F3F5', paddingTop: 10, paddingBottom: 10 }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (hospital?.phone) {
                  window.location.href = `tel:${hospital.phone}`;
                } else {
                  showToast('전화번호 정보가 없습니다.');
                }
              }}
              style={{ width: 48, height: 48, borderRadius: 10, border: '1px solid #C8CEDA' }} className="flex items-center justify-center btn-press">
              <Phone size={18} style={{ color: '#51535C' }} />
            </button>
            <button
              onClick={() => router.push(`/consult/${product.hospitalId}`)}
              style={{ width: 48, height: 48, borderRadius: 10, border: '1px solid #C8CEDA' }} className="flex items-center justify-center btn-press">
              <MessageCircle size={18} style={{ color: '#51535C' }} />
            </button>
            <button
              onClick={() => router.push(`/booking?productId=${product.id}`)}
              style={{ height: 48, borderRadius: 10, backgroundColor: '#8037FF', fontSize: 18, fontWeight: 600 }}
              className="flex-1 text-white btn-press"
            >
              예약하기
            </button>
          </div>
        </div>
      </FixedBar>
    </div>
  );
}

function ReviewMenu({ reviewId, authorName }: { reviewId: string; authorName: string }) {
  const [open, setOpen] = useState(false);
  const { showToast, showModal } = useStore();

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1">
        <MoreHorizontal size={20} style={{ color: '#A4ABBA' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl overflow-hidden scale-in" style={{ border: '1px solid #F2F3F5', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', minWidth: 160 }}>
            <button
              onClick={() => {
                setOpen(false);
                showModal('리뷰를 신고하시겠습니까?', '부적절한 리뷰는 검토 후 조치됩니다.', () => {
                  showToast('리뷰가 신고되었습니다.');
                });
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              style={{ fontSize: 14, color: '#2B313D', borderBottom: '1px solid #F2F3F5' }}
            >
              리뷰 신고하기
            </button>
            <button
              onClick={() => {
                setOpen(false);
                showModal(`${authorName}님을 차단하시겠습니까?`, '차단된 유저의 리뷰는 더 이상 표시되지 않습니다.', () => {
                  showToast(`${authorName}님이 차단되었습니다.`);
                });
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              style={{ fontSize: 14, color: '#EF4444' }}
            >
              유저 차단하기
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ReviewContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 200;

  return (
    <div style={{ marginTop: 14, position: 'relative' }}>
      <p style={{
        fontSize: 14, fontWeight: 400, color: '#2C2C2C', lineHeight: '22px',
        ...(isLong && !expanded ? { maxHeight: 220, overflow: 'hidden' } : {}),
      }}>
        {content}
      </p>
      {isLong && !expanded && (
        <>
          <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, white)' }} />
          <button
            onClick={() => setExpanded(true)}
            style={{ fontSize: 13, fontWeight: 600, color: '#8037FF', marginTop: 4, display: 'block' }}
          >
            더보기
          </button>
        </>
      )}
      {isLong && expanded && (
        <button
          onClick={() => setExpanded(false)}
          style={{ fontSize: 13, fontWeight: 600, color: '#A4ABBA', marginTop: 4, display: 'block' }}
        >
          접기
        </button>
      )}
    </div>
  );
}
