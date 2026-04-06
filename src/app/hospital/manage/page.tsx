'use client';

import { useState } from 'react';
import {
  Camera,
  ChevronRight,
  Clock,
  Edit3,
  MapPin,
  Phone,
  Star,
  User,
} from 'lucide-react';
import Link from 'next/link';
import TabBar from '@/components/common/TabBar';
import EmptyState from '@/components/common/EmptyState';
import { useStore } from '@/store';
import { hospitals, reviews } from '@/lib/mock-data';

const hospital = hospitals[0]; // 참포도나무치과의원

export default function HospitalManagePage() {
  const { showModal, showToast } = useStore();
  const [activeTab, setActiveTab] = useState('병원');

  const tabs = ['병원', `멤버(${hospital.doctors.length})`, `리뷰(${hospital.reviewCount.toLocaleString()})`];

  const hospitalReviews = reviews.filter((r) => r.hospitalId === hospital.id || true).slice(0, 5);

  const handleAcceptDoctor = (name: string) => {
    showModal('멤버 수락', `${name}님의 가입 요청을 수락하시겠습니까?`, () => {
      showToast('수락되었습니다.');
    });
  };

  const handleRejectDoctor = (name: string) => {
    showModal('멤버 거절', `${name}님의 가입 요청을 거절하시겠습니까?`, () => {
      showToast('거절되었습니다.');
    });
  };

  const handleRemoveDoctor = (name: string) => {
    showModal('멤버 탈퇴', `${name}님을 탈퇴 처리하시겠습니까?`, () => {
      showToast('탈퇴 처리되었습니다.');
    });
  };

  return (
    <div className="pb-[86px] bg-gray-50 min-h-screen">
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 40 }} className="bg-white flex items-center justify-between h-12 px-2.5">
        <h1 className="text-lg font-bold">병원관리</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white">
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="underline"
        />
      </div>

      {/* Tab content */}
      {activeTab === '병원' && <HospitalTab />}
      {activeTab.startsWith('멤버') && (
        <MemberTab
          onAccept={handleAcceptDoctor}
          onReject={handleRejectDoctor}
          onRemove={handleRemoveDoctor}
        />
      )}
      {activeTab.startsWith('리뷰') && <ReviewTab reviews={hospitalReviews} />}

    </div>
  );
}

/* ==================== Hospital Tab ==================== */
function HospitalTab() {
  return (
    <div className="space-y-3 py-3">
      {/* Cover photo */}
      <div className="bg-white">
        <div className="flex items-center justify-between px-2.5 py-3">
          <h2 className="font-bold text-base">대문사진</h2>
          <Link href="/hospital/manage/photos" className="text-[#7C3AED] text-sm font-medium flex items-center gap-1">
            편집 <ChevronRight size={16} />
          </Link>
        </div>
        <div className="h-40 bg-gray-200 relative mx-4 rounded-xl overflow-hidden mb-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera size={32} className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* Hospital Profile */}
      <div className="bg-white px-2.5 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User size={24} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <span className="inline-block px-2 py-0.5 bg-[#EDE9FE] text-[#7C3AED] text-xs rounded-full font-medium mb-1">
              {hospital.category}
            </span>
            <h3 className="font-bold text-base">{hospital.name}</h3>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
            <span>{hospital.location}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Phone size={16} className="text-gray-400 flex-shrink-0" />
            <span>{hospital.phone}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {hospital.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Operating hours */}
      <div className="bg-white px-2.5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">운영일 및 시간</h2>
          <Link href="/hospital/manage/hours" className="text-[#7C3AED] text-sm font-medium flex items-center gap-1">
            편집 <ChevronRight size={16} />
          </Link>
        </div>
        <div className="space-y-2">
          {hospital.operatingHours.map((oh) => (
            <div key={oh.day} className="flex items-center text-sm">
              <span className="w-8 text-gray-500 font-medium">{oh.day}</span>
              <Clock size={14} className="text-gray-400 mr-2" />
              <span className="text-gray-700">
                {oh.isClosed ? '휴진' : `${oh.startTime} - ${oh.endTime}`}
              </span>
            </div>
          ))}
        </div>
        {hospital.holidayNotice && (
          <p className="text-xs text-gray-400 mt-2">{hospital.holidayNotice}</p>
        )}
      </div>

      {/* Hospital intro */}
      <div className="bg-white px-2.5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">병원소개</h2>
          <Link href="/hospital/manage/intro" className="text-[#7C3AED] text-sm font-medium flex items-center gap-1">
            편집 <ChevronRight size={16} />
          </Link>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          {hospital.introduction || '병원 소개가 아직 등록되지 않았습니다.'}
        </p>
      </div>

      {/* Hospital location */}
      <div className="bg-white px-2.5 py-4">
        <h2 className="font-bold text-base mb-3">병원위치</h2>
        <div className="h-40 bg-gray-200 rounded-xl flex items-center justify-center mb-3">
          <MapPin size={32} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-700 font-medium">{hospital.address}</p>
        {hospital.addressDetail && (
          <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">
            {hospital.addressDetail}
          </p>
        )}
      </div>
    </div>
  );
}

/* ==================== Member Tab ==================== */
function MemberTab({
  onAccept,
  onReject,
  onRemove,
}: {
  onAccept: (name: string) => void;
  onReject: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const pendingRequests = [
    { id: 'req1', name: '최윤진', title: '원장', specialty: '피부과 전문의', hospitalName: '참포도나무치과의원' },
  ];

  return (
    <div className="py-3 space-y-3">
      {/* Active members */}
      <div className="bg-white">
        <div className="px-2.5 py-3">
          <h2 className="font-bold text-sm text-gray-500">활성 멤버</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {hospital.doctors.map((doctor) => (
            <div key={doctor.id} className="px-2.5 py-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User size={20} className="text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{doctor.name}</span>
                  <span className="text-xs text-gray-500">{doctor.title}</span>
                  {doctor.isOwner && (
                    <span className="px-1.5 py-0.5 bg-[#7C3AED] text-white text-[10px] rounded font-medium">
                      My
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {doctor.specialty}
                </p>
                <p className="text-xs text-gray-400">{doctor.hospitalName}</p>
              </div>
              <div className="flex-shrink-0">
                {doctor.isOwner ? (
                  <button className="p-2">
                    <Edit3 size={16} className="text-gray-400" />
                  </button>
                ) : (
                  <button
                    onClick={() => onRemove(doctor.name)}
                    className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg font-medium"
                  >
                    탈퇴
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-white">
          <div className="px-2.5 py-3">
            <h2 className="font-bold text-sm text-gray-500">새로운 요청</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingRequests.map((request) => (
              <div key={request.id} className="px-2.5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{request.name}</span>
                      <span className="text-xs text-gray-500">{request.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {request.specialty}
                    </p>
                    <p className="text-xs text-gray-400">{request.hospitalName}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 ml-14">
                  <button
                    onClick={() => onReject(request.name)}
                    className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium"
                  >
                    거절
                  </button>
                  <button
                    onClick={() => onAccept(request.name)}
                    className="flex-1 py-2 bg-[#7C3AED] text-white rounded-xl text-sm font-medium"
                  >
                    수락
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== Review Tab ==================== */
function ReviewTab({ reviews: reviewList }: { reviews: typeof reviews }) {
  if (reviewList.length === 0) {
    return (
      <div className="py-3">
        <EmptyState icon="message" message="리뷰가 존재하지 않아요" />
      </div>
    );
  }

  const avgRating =
    reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length;

  return (
    <div className="py-3 space-y-3">
      {/* Rating summary */}
      <div className="bg-white px-2.5 py-6 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-1">
          <Star size={24} fill="#FBBF24" className="text-yellow-400" />
          <span className="text-3xl font-bold">{avgRating.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              size={16}
              fill={i <= Math.round(avgRating) ? '#FBBF24' : '#E5E7EB'}
              className={i <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200'}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {hospital.reviewCount.toLocaleString()}개의 리뷰
        </p>
      </div>

      {/* Review list */}
      <div className="space-y-3">
        {reviewList.map((review) => (
          <div key={review.id} className="bg-white px-2.5 py-4">
            {/* Author + date */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <User size={14} className="text-gray-400" />
                </div>
                <span className="text-sm font-medium">{review.authorName}</span>
              </div>
              <span className="text-xs text-gray-400">{review.date}</span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i <= review.rating ? '#FBBF24' : '#E5E7EB'}
                  className={i <= review.rating ? 'text-yellow-400' : 'text-gray-200'}
                />
              ))}
            </div>

            {/* Before/After images */}
            {(review.beforeImage || review.afterImage) && (
              <div className="flex gap-2 mb-3">
                {review.beforeImage && (
                  <div className="flex-1 h-32 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center"><span className="text-2xl font-bold text-purple-300">전</span></div>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded">Before</span>
                  </div>
                )}
                {review.afterImage && (
                  <div className="flex-1 h-32 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center"><span className="text-2xl font-bold text-blue-300">후</span></div>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded">After</span>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-3 mb-3">
              {review.content}
            </p>

            {/* Treatment details */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">시술명</span>
                <span className="text-gray-700 font-medium">{review.treatmentName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">총 비용</span>
                <span className="text-gray-700 font-medium">{review.totalCost.toLocaleString()}원</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">시술일</span>
                <span className="text-gray-700">{review.treatmentDate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
