'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Star,
  MapPin,
  Phone,
  Clock,
  User,
  ChevronRight,
} from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import TabBar from '@/components/common/TabBar';
import ProductCard from '@/components/common/ProductCard';
import { hospitals, products, reviews } from '@/lib/mock-data';

export default function HospitalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('병원소개');

  const hospital = useMemo(
    () => hospitals.find((h) => h.id === params.id),
    [params.id]
  );

  const hospitalReviews = useMemo(
    () => reviews.filter((r) => r.hospitalId === hospital?.id),
    [hospital]
  );

  const hospitalProducts = useMemo(
    () => products.filter((p) => p.hospitalId === hospital?.id),
    [hospital]
  );

  const avgRating = useMemo(() => {
    if (hospitalReviews.length === 0) return hospital?.rating?.toFixed(1) ?? '0.0';
    return (hospitalReviews.reduce((sum, r) => sum + r.rating, 0) / hospitalReviews.length).toFixed(1);
  }, [hospitalReviews, hospital]);

  if (!hospital) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">정보를 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="pb-[86px] lg:pb-0 bg-white min-h-screen">
      <div className="lg:max-w-5xl lg:mx-auto">
        {/* TopBar */}
        <TopBar title={hospital.name} showBack />

        {/* Cover Image Area */}
        <div className="relative aspect-[16/9] lg:aspect-[3/1] bg-gradient-to-br from-[#7C3AED] to-purple-400 flex items-end lg:rounded-2xl lg:mt-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="relative z-10 p-4 lg:p-6">
            <span className="inline-block text-xs bg-white/20 backdrop-blur-sm text-white rounded-full px-3 py-1 mb-2">
              {hospital.category}
            </span>
            <h1 className="text-xl lg:text-2xl font-bold text-white">{hospital.name}</h1>
          </div>
        </div>

        {/* Hospital Info */}
        <div className="px-2.5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-purple-50 text-[#7C3AED] font-medium rounded-full px-3 py-1">
              {hospital.category}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1.5">
            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
            <span>{hospital.location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <Phone size={14} className="text-gray-400 flex-shrink-0" />
            <span>{hospital.phone}</span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {hospital.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
                {tag}
              </span>
            ))}
          </div>

          {/* Naver Map Button */}
          <button
            onClick={() => {
              const query = encodeURIComponent(hospital.address + ' ' + hospital.name);
              window.open(`https://map.naver.com/v5/search/${query}`, '_blank');
            }}
            className="w-full py-2.5 bg-[#7C3AED] text-white rounded-xl text-sm font-medium mb-4"
          >
            찾아가는길
          </button>

          {/* Stats Row */}
          <div className="flex items-center justify-around bg-gray-50 rounded-xl py-3">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center mb-0.5">
                <Star size={14} fill="#FBBF24" stroke="#FBBF24" />
                <span className="text-sm font-bold">{avgRating}</span>
              </div>
              <span className="text-[11px] text-gray-400">평점</span>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-sm font-bold mb-0.5">{hospital.reviewCount}건</p>
              <span className="text-[11px] text-gray-400">리뷰</span>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-sm font-bold mb-0.5">{hospital.doctors.length}명</p>
              <span className="text-[11px] text-gray-400">의사</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30 }} className="bg-white">
          <TabBar
            tabs={['병원소개', '의료진', '진료시간', '리뷰']}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            variant="underline"
          />
        </div>

        {/* Tab Content */}
        <div className="px-2.5 py-4">
          {/* 병원소개 Tab */}
          {activeTab === '병원소개' && (
            <div>
              {hospital.introduction ? (
                <div className="mb-6">
                  <h3 className="font-bold text-sm mb-2">소개</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{hospital.introduction}</p>
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-sm text-gray-400">등록된 소개 정보가 없습니다.</p>
                </div>
              )}

              {/* Address with map placeholder */}
              <div className="mb-4">
                <h3 className="font-bold text-sm mb-2">주소</h3>
                <div className="flex items-start gap-2 mb-3">
                  <MapPin size={16} className="text-[#7C3AED] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-700">{hospital.address}</p>
                    {hospital.addressDetail && (
                      <p className="text-xs text-gray-400 mt-1 whitespace-pre-line">{hospital.addressDetail}</p>
                    )}
                  </div>
                </div>
                {/* Google Maps Embed */}
                <div className="aspect-[16/9] rounded-xl overflow-hidden border border-gray-200">
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(hospital.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="병원 위치"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 의료진 Tab */}
          {activeTab === '의료진' && (
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {hospital.doctors.map((doctor) => (
                <Link
                  key={doctor.id}
                  href={`/doctor/${doctor.id}`}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {/* Avatar with initials */}
                  <div className="w-14 h-14 bg-gradient-to-br from-[#7C3AED] to-purple-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {doctor.name.slice(-2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-bold">{doctor.name}</span>
                      <span className="text-xs text-[#7C3AED] font-medium">{doctor.title}</span>
                      {doctor.isOwner && (
                        <span className="text-[10px] bg-[#7C3AED] text-white rounded px-1.5 py-0.5">
                          대표원장
                        </span>
                      )}
                    </div>
                    {doctor.specialty && (
                      <p className="text-xs text-gray-500 mb-1">{doctor.specialty}</p>
                    )}
                    {doctor.bio && (
                      <p className="text-xs text-gray-400 line-clamp-2">{doctor.bio}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          )}

          {/* 진료시간 Tab */}
          {activeTab === '진료시간' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-[#7C3AED]" />
                <h3 className="font-bold text-sm">진료시간</h3>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                {hospital.operatingHours.map((oh) => (
                  <div key={oh.day} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-medium text-gray-700 w-8">{oh.day}</span>
                    {oh.isClosed ? (
                      <span className="text-sm text-red-400 font-medium">휴진</span>
                    ) : (
                      <span className="text-sm text-gray-600">
                        {oh.startTime} - {oh.endTime}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {hospital.holidayNotice && (
                <div className="mt-3 p-3 bg-red-50 rounded-xl">
                  <p className="text-xs text-red-500">{hospital.holidayNotice}</p>
                </div>
              )}
            </div>
          )}

          {/* 리뷰 Tab */}
          {activeTab === '리뷰' && (
            <div>
              {/* Average Rating Display */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#7C3AED]">{avgRating}</p>
                  <div className="flex items-center gap-0.5 mt-1 justify-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        fill={i < Math.round(Number(avgRating)) ? '#FBBF24' : '#E5E7EB'}
                        stroke={i < Math.round(Number(avgRating)) ? '#FBBF24' : '#E5E7EB'}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{hospitalReviews.length}건의 리뷰</p>
                </div>
              </div>

              {/* Review List */}
              {hospitalReviews.length > 0 ? (
                <div className="space-y-4">
                  {hospitalReviews.map((review) => (
                    <div key={review.id} className="border border-gray-100 rounded-xl p-4">
                      {/* Reviewer info */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User size={14} className="text-[#7C3AED]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{review.authorName}</p>
                            <p className="text-[11px] text-gray-400">{review.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              fill={i < review.rating ? '#FBBF24' : '#E5E7EB'}
                              stroke={i < review.rating ? '#FBBF24' : '#E5E7EB'}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Treatment info */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-xs text-gray-500">시술명: {review.treatmentName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          비용: {review.totalCost.toLocaleString()}원
                        </p>
                        {review.doctorName && (
                          <p className="text-xs text-[#7C3AED] mt-1">담당의: {review.doctorName}</p>
                        )}
                      </div>

                      {/* Before/After placeholder */}
                      <div className="flex gap-2 mb-3">
                        <div className="flex-1 aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-xl">📷</span>
                          <span className="text-[10px] text-gray-400 mt-1">Before</span>
                        </div>
                        <div className="flex-1 aspect-[4/3] bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-xl">📷</span>
                          <span className="text-[10px] text-gray-400 mt-1">After</span>
                        </div>
                      </div>

                      {/* Review content */}
                      <p className="text-sm text-gray-700 leading-relaxed">{review.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-gray-400 text-sm">
                  아직 리뷰가 없습니다
                </div>
              )}
            </div>
          )}
        </div>

        {/* 이 병원의 상품 Section */}
        {hospitalProducts.length > 0 && (
          <div className="px-2.5 py-4 border-t border-gray-100">
            <h2 className="font-bold mb-3">이 병원의 상품</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {hospitalProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BottomNav on mobile */}
    </div>
  );
}
