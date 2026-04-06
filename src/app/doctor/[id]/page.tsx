'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Star,
  User,
  Briefcase,
  Award,
  Building2,
} from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import ProductCard from '@/components/common/ProductCard';
import { hospitals, products, reviews } from '@/lib/mock-data';

export default function DoctorDetailPage() {
  const params = useParams();

  // Find the doctor across all hospitals
  const { doctor, hospital } = useMemo(() => {
    for (const h of hospitals) {
      const d = h.doctors.find((doc) => doc.id === params.id);
      if (d) return { doctor: d, hospital: h };
    }
    return { doctor: null, hospital: null };
  }, [params.id]);

  const doctorReviews = useMemo(
    () => reviews.filter((r) => r.doctorId === doctor?.id),
    [doctor]
  );

  const doctorAvgRating = useMemo(() => {
    if (doctorReviews.length === 0) return '0.0';
    return (doctorReviews.reduce((sum, r) => sum + r.rating, 0) / doctorReviews.length).toFixed(1);
  }, [doctorReviews]);

  const hospitalProducts = useMemo(
    () => products.filter((p) => p.hospitalId === hospital?.id),
    [hospital]
  );

  if (!doctor || !hospital) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">정보를 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="pb-[86px] lg:pb-0 bg-white min-h-screen">
      <div className="lg:max-w-4xl lg:mx-auto">
        {/* TopBar */}
        <TopBar title={doctor.name} showBack />

        {/* Doctor Profile Header */}
        <div className="px-4 py-6">
          <div className="flex flex-col items-center text-center mb-6">
            {/* Large Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-[#7C3AED] to-purple-400 rounded-full flex items-center justify-center mb-4">
              <span className="text-white font-bold text-2xl">
                {doctor.name.slice(-2)}
              </span>
            </div>

            {/* Name and Title */}
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold">{doctor.name}</h1>
              {doctor.isOwner && (
                <span className="text-xs bg-[#7C3AED] text-white rounded-full px-2.5 py-0.5 font-medium">
                  대표원장
                </span>
              )}
            </div>
            <p className="text-sm text-[#7C3AED] font-medium mb-1">{doctor.title}</p>

            {/* Specialty Badge */}
            {doctor.specialty && (
              <span className="inline-block text-xs bg-purple-50 text-[#7C3AED] rounded-full px-3 py-1 mb-3">
                {doctor.specialty}
              </span>
            )}

            {/* Hospital Name - clickable */}
            <Link
              href={`/hospital/detail/${hospital.id}`}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#7C3AED] transition-colors"
            >
              <Building2 size={14} />
              <span>{hospital.name}</span>
            </Link>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-around bg-gray-50 rounded-xl py-3 mb-6">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center mb-0.5">
                <Star size={14} fill="#FBBF24" stroke="#FBBF24" />
                <span className="text-sm font-bold">{doctorAvgRating}</span>
              </div>
              <span className="text-[11px] text-gray-400">평점</span>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-sm font-bold mb-0.5">{doctorReviews.length}건</p>
              <span className="text-[11px] text-gray-400">리뷰</span>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        {doctor.bio && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <User size={16} className="text-[#7C3AED]" />
              <h2 className="font-bold text-sm">의사 소개</h2>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 leading-relaxed">{doctor.bio}</p>
            </div>
          </div>
        )}

        {/* Careers Section */}
        {doctor.careers && doctor.careers.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase size={16} className="text-[#7C3AED]" />
              <h2 className="font-bold text-sm">경력</h2>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <ul className="space-y-2">
                {doctor.careers.map((career, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full mt-1.5 flex-shrink-0" />
                    <span>{career}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Certifications Section */}
        {doctor.certifications && doctor.certifications.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Award size={16} className="text-[#7C3AED]" />
              <h2 className="font-bold text-sm">자격증</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {doctor.certifications.map((cert, i) => (
                <span
                  key={i}
                  className="text-xs bg-purple-50 text-[#7C3AED] font-medium rounded-full px-3 py-1.5 border border-purple-100"
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 담당 리뷰 Section */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">담당 리뷰</h2>
            <div className="flex items-center gap-1">
              <Star size={14} fill="#FBBF24" stroke="#FBBF24" />
              <span className="text-sm font-bold">{doctorAvgRating}</span>
              <span className="text-sm text-gray-400">({doctorReviews.length}건)</span>
            </div>
          </div>

          {doctorReviews.length > 0 ? (
            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {doctorReviews.map((review) => (
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

        {/* 이 의사의 시술 상품 Section */}
        {hospitalProducts.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-100">
            <h2 className="font-bold mb-3">이 의사의 시술 상품</h2>
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
