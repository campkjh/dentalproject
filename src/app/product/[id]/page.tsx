'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import TabBar from '@/components/common/TabBar';
import FixedBar from '@/components/common/FixedBar';
import { useStore } from '@/store';
import { products, hospitals, reviews } from '@/lib/mock-data';

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
  const { wishlist, toggleWishlist, addRecentlyViewed, showToast } = useStore();
  const [activeTab, setActiveTab] = useState('상품설명');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [heartAnim, setHeartAnim] = useState(false);

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
    <div className="bg-gray-50 min-h-screen page-enter" style={{ paddingTop: 48, paddingBottom: 72 }}>

      {/* Fixed Header - portal to body */}
      <FixedBar position="top" className="lg:hidden">
        <div className="flex items-center justify-between px-4 h-12 bg-white/90 backdrop-blur-md">
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
      <div className="bg-white px-4 pt-5 pb-4">
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
          <div className="bg-white px-4 py-4">
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
      <div className="bg-white px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D' }}>고객후기모음</h2>
          <div className="flex items-center gap-1">
            <Star size={14} fill="#FBBF24" stroke="#FBBF24" />
            <span className="text-sm font-semibold">{avgRating}</span>
            <span className="text-sm text-gray-400">({productReviews.length}건)</span>
          </div>
        </div>
        {productReviews.length > 0 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {productReviews.map((review) => (
              <div
                key={review.id}
                className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl flex items-center justify-center"
              >
                <span className="text-2xl">📷</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

      {/* Tabs */}
      <div style={{ position: 'sticky', top: 48, zIndex: 30 }} className="bg-white lg:static">
        <TabBar
          tabs={['상품설명', '병원정보', '리뷰']}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="underline"
        />
      </div>

      {/* Tab Content - open layout */}
      {activeTab === '상품설명' && (
        <div className="bg-white">
          <div className="aspect-[4/3] bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <span className="text-5xl block mb-2">🦷</span>
              <p style={{ fontSize: 13, color: '#A4ABBA' }}>상품 상세 이미지</p>
            </div>
          </div>
          <div className="px-4 py-5">
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
          {/* Hospital info - flat, no card border */}
          <div className="bg-white px-4 py-5">
            <Link href={`/hospital/detail/${hospital.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F2F3F5' }}>
                <span className="text-xl">🏥</span>
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: '#2B313D' }}>{hospital.name}</h3>
                <p style={{ fontSize: 13, color: '#A4ABBA' }}>{hospital.category}</p>
              </div>
            </Link>
            <div className="flex items-center gap-1.5 mt-3">
              <MapPin size={14} style={{ color: '#A4ABBA' }} />
              <span style={{ fontSize: 13, color: '#51535C' }}>{hospital.address}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {hospital.tags.map((tag) => (
                <span key={tag} style={{ backgroundColor: '#F2F3F5', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#51535C' }} className="px-2.5 py-1">{tag}</span>
              ))}
            </div>
            <button
              onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(hospital.name + ' ' + hospital.address)}`, '_blank')}
              style={{ height: 44, borderRadius: 10, backgroundColor: '#8037FF', fontSize: 14, fontWeight: 600 }}
              className="w-full text-white mt-4"
            >
              찾아가는길
            </button>
          </div>

          <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

          {/* Address + Map */}
          <div className="bg-white px-4 py-5">
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

          {/* Operating Hours - flat */}
          <div className="bg-white px-4 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} style={{ color: '#A4ABBA' }} />
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D' }}>진료시간</h3>
            </div>
            {hospital.operatingHours.map((oh) => (
              <div key={oh.day} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid #F2F3F5' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#2B313D', width: 28 }}>{oh.day}</span>
                {oh.isClosed ? (
                  <span style={{ fontSize: 14, color: '#EF4444' }}>휴진</span>
                ) : (
                  <span style={{ fontSize: 14, color: '#51535C' }}>{oh.startTime} - {oh.endTime}</span>
                )}
              </div>
            ))}
            {hospital.holidayNotice && (
              <p style={{ fontSize: 12, color: '#EF4444', marginTop: 8 }}>{hospital.holidayNotice}</p>
            )}
          </div>

          <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

          {/* Doctors - flat list */}
          <div className="bg-white px-4 py-5">
            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D', marginBottom: 16 }}>의료진 소개</h3>
            {hospital.doctors.map((doctor, idx) => (
              <Link key={doctor.id} href={`/doctor/${doctor.id}`}
                className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity"
                style={{ borderBottom: idx < hospital.doctors.length - 1 ? '1px solid #F2F3F5' : 'none' }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F2F3F5' }}>
                  <User size={20} style={{ color: '#A4ABBA' }} />
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
            ))}
          </div>

          {/* More Products from Hospital */}
          {hospitalProducts.length > 0 && (
            <>
              <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />
              <div className="bg-white px-4 py-5">
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
                <div key={review.id} className="px-4 py-5" style={{ borderBottom: idx < productReviews.length - 1 ? '8px solid #F2F3F5' : 'none' }}>
                  {/* Reviewer info */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F2F3F5' }}>
                        <User size={16} style={{ color: '#A4ABBA' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#2B313D' }}>{review.authorName}</p>
                        <p style={{ fontSize: 12, color: '#A4ABBA' }}>{review.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < review.rating ? '#FBBF24' : '#E5E7EB'} stroke={i < review.rating ? '#FBBF24' : '#E5E7EB'} />
                      ))}
                    </div>
                  </div>
                  {/* Before/After */}
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 aspect-[4/3] rounded-lg flex flex-col items-center justify-center" style={{ backgroundColor: '#F2F3F5' }}>
                      <span className="text-xl">📷</span>
                      <span style={{ fontSize: 10, color: '#A4ABBA', marginTop: 4 }}>전</span>
                    </div>
                    <div className="flex-1 aspect-[4/3] rounded-lg flex flex-col items-center justify-center" style={{ backgroundColor: '#F2F3F5' }}>
                      <span className="text-xl">📷</span>
                      <span style={{ fontSize: 10, color: '#A4ABBA', marginTop: 4 }}>후</span>
                    </div>
                  </div>
                  {/* Treatment info - inline, no box */}
                  <div className="flex items-center gap-3 mb-3" style={{ fontSize: 13, color: '#A4ABBA' }}>
                    <span>{review.treatmentName}</span>
                    <span>·</span>
                    <span>{review.totalCost.toLocaleString()}원</span>
                    <span>·</span>
                    <span>{review.treatmentDate}</span>
                  </div>
                  {/* Review content */}
                  <p style={{ fontSize: 14, color: '#51535C', lineHeight: '22px' }}>{review.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center" style={{ fontSize: 14, color: '#A4ABBA' }}>아직 작성된 리뷰가 없습니다.</div>
          )}
        </div>
      )}

      <div style={{ height: 8, backgroundColor: '#F2F3F5' }} />

      {/* FAQ Section - flat */}
      <div className="bg-white px-4 py-5">
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D', marginBottom: 12 }}>자주묻는질문</h2>
        {faqItems.map((faq, index) => (
          <div key={index} style={{ borderBottom: '1px solid #F2F3F5' }}>
            <button
              onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              className="w-full flex items-center justify-between py-3.5 text-left"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span style={{ fontSize: 13, fontWeight: 600, color: '#8037FF' }}>Q</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#2B313D' }}>{faq.question}</span>
              </div>
              {expandedFaq === index ? (
                <ChevronUp size={16} style={{ color: '#A4ABBA', flexShrink: 0 }} />
              ) : (
                <ChevronDown size={16} style={{ color: '#A4ABBA', flexShrink: 0 }} />
              )}
            </button>
            <div
              style={{
                maxHeight: expandedFaq === index ? 300 : 0,
                opacity: expandedFaq === index ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.3s ease, opacity 0.25s ease',
              }}
            >
              <div className="pb-3.5 pl-6">
                <div className="flex items-start gap-2">
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#A4ABBA' }}>A</span>
                  <p style={{ fontSize: 14, color: '#51535C', lineHeight: '22px' }}>{faq.answer}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      </div>{/* End Info Section */}
      </div>{/* End grid wrapper */}

      {/* Bottom Fixed Bar - portal to body */}
      <FixedBar position="bottom" className="lg:hidden">
        <div className="bg-white px-4" style={{ borderTop: '1px solid #F2F3F5', paddingTop: 10, paddingBottom: 10 }}>
          <div className="flex items-center gap-2">
            <button style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid #C8CEDA' }} className="flex items-center justify-center">
              <Phone size={18} style={{ color: '#51535C' }} />
            </button>
            <button style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid #C8CEDA' }} className="flex items-center justify-center">
              <MessageCircle size={18} style={{ color: '#51535C' }} />
            </button>
            <button
              onClick={() => router.push(`/booking?productId=${product.id}`)}
              style={{ height: 44, borderRadius: 10, backgroundColor: '#8037FF', fontSize: 15, fontWeight: 600 }}
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
