'use client';

// 의사 프로필 — 상품 상세 '병원 정보'(261031 쿠팡 견본) 결: 사람 줄 · 회색 이름 정보 줄 · 20 굵은 제목 · 회색 띠로 칸 나눔.

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import TopBar from '@/components/common/TopBar';
import ProductCard from '@/components/common/ProductCard';
import MonoIcon from '@/components/common/MonoIcon';
import { Reveal, StarRating, SingleStar, ReviewCommentRow } from '@/components/detail/DetailKit';
import { useStore } from '@/store';
import { resolveHospitalImageUrl } from '@/lib/images';

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hospitals, products, reviews } = useStore();

  // Find the doctor across all hospitals
  const { doctor, hospital } = (() => {
    for (const h of hospitals) {
      const d = h.doctors.find((doc) => doc.id === params.id);
      if (d) return { doctor: d, hospital: h };
    }
    return { doctor: null, hospital: null };
  })();

  const doctorReviews = reviews.filter((r) => r.doctorId === doctor?.id);

  const doctorAvgRating = (() => {
    if (doctorReviews.length === 0) return '0.0';
    return (doctorReviews.reduce((sum, r) => sum + r.rating, 0) / doctorReviews.length).toFixed(1);
  })();

  const hospitalProducts = products.filter((p) => p.hospitalId === hospital?.id);

  if (!doctor || !hospital) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar title="의료진" />
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
            <MonoIcon name="exclamation-circle" size={34} color="#B0B8C1" />
          </span>
          <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">정보를 찾을 수 없어요</p>
        </div>
      </div>
    );
  }

  const hospitalImageUrl = resolveHospitalImageUrl(hospital);
  const roleLabel = doctor.isOwner ? '대표원장' : doctor.title || '원장';

  return (
    <div className="min-h-screen bg-white pb-[86px] page-enter lg:pb-0">
      <div className="lg:mx-auto lg:max-w-4xl">
        <TopBar title="의료진 정보" showBack />

        {/* ─── 의사 줄 · 이름 정보 줄 ─── */}
        <div className="px-5 pb-7 pt-2">
          <Reveal>
            <div className="flex items-center gap-4">
              <Avatar src={doctor.profileImage} role="doctor" seed={doctor.name} size={72} alt={doctor.name} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <span className={`inline-flex h-6 items-center rounded-[6px] px-2 text-[13.5px] font-semibold ${doctor.isOwner ? 'bg-[#2F6FE4] text-white' : 'bg-[#EFF5FE] text-[#2F6FE4]'}`}>{roleLabel}</span>
                <h1 className="mt-1 truncate text-[22px] font-bold tracking-[-0.5px] text-[#191F28]">{doctor.name}</h1>
                <p className="mt-0.5 flex items-center gap-1 text-[14px] text-[#4E5968]">
                  <SingleStar size={15} />
                  {doctorAvgRating} ({doctorReviews.length})
                </p>
              </div>
            </div>
            <div className="mt-4">
              {[
                ...(doctor.title && doctor.title !== roleLabel ? [{ label: '직함', value: doctor.title }] : []),
                ...(doctor.specialty ? [{ label: '진료분야', value: doctor.specialty }] : []),
                { label: '소속', value: hospital.name },
                { label: '평점', value: `${doctorAvgRating}점 · 리뷰 ${doctorReviews.length}건` },
              ].map((r) => (
                <p key={r.label} className="flex min-h-11 items-center py-1.5">
                  <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">{r.label}</span>
                  <span className="min-w-0 flex-1 break-keep text-[17px] text-[#333D4B]">{r.value}</span>
                </p>
              ))}
            </div>
          </Reveal>
        </div>

        {/* ─── 의사 소개 · 경력 · 자격증 ─── */}
        {(doctor.bio || (doctor.careers && doctor.careers.length > 0) || (doctor.certifications && doctor.certifications.length > 0)) && (
          <>
            <div className="h-2.5 bg-[#F2F4F6]" />
            <div className="px-5 py-7">
              <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">의사 소개</h2>
              {doctor.bio && (
                <Reveal>
                  <p className="mt-3 whitespace-pre-wrap break-words text-[16px] leading-[1.7] text-[#333D4B]">{doctor.bio}</p>
                </Reveal>
              )}

              {doctor.careers && doctor.careers.length > 0 && (
                <Reveal>
                  <h3 className="mt-8 flex items-center gap-1.5 text-[17px] font-bold text-[#191F28]">
                    <MonoIcon name="briefcase" size={18} color="#8B95A1" />
                    경력
                  </h3>
                  <ul className="mt-2.5 space-y-1.5">
                    {doctor.careers.map((career, i) => (
                      <li key={i} className="flex gap-2.5 text-[16px] leading-[1.6] text-[#333D4B]">
                        <span className="mt-[11px] h-1 w-1 shrink-0 rounded-full bg-[#B0B8C1]" />
                        <span className="min-w-0 flex-1">{career}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}

              {doctor.certifications && doctor.certifications.length > 0 && (
                <Reveal>
                  <h3 className="mt-8 flex items-center gap-1.5 text-[17px] font-bold text-[#191F28]">
                    <MonoIcon name="medal" size={18} color="#8B95A1" />
                    자격증
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {doctor.certifications.map((cert, i) => (
                      <span key={i} className="inline-flex h-8 items-center rounded-[8px] bg-[#F2F4F6] px-3 text-[14.5px] font-semibold text-[#333D4B]">
                        {cert}
                      </span>
                    ))}
                  </div>
                </Reveal>
              )}
            </div>
          </>
        )}

        {/* ─── 병원 정보 — 테두리 없는 병원 줄 + 회색 바로 하기 버튼 ─── */}
        <div className="h-2.5 bg-[#F2F4F6]" />
        <div className="px-5 py-7">
          <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">병원 정보</h2>
          <Reveal>
            <Link href={`/hospital/detail/${hospital.id}`} className="-mx-2 mt-3 flex items-center gap-3.5 rounded-[16px] px-2 py-2 transition-colors active:bg-[#F9FAFB]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hospitalImageUrl} alt="" className="h-[52px] w-[52px] shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-bold text-[#191F28]">{hospital.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[14px] text-[#4E5968]">
                  <SingleStar size={15} />
                  {hospital.rating.toFixed(1)} ({hospital.reviewCount})
                </p>
              </div>
              <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
            </Link>
            <div className="mt-3">
              {[
                ...(hospital.location ? [{ label: '지역', value: hospital.location }] : []),
                ...(hospital.phone ? [{ label: '전화', value: hospital.phone }] : []),
              ].map((r) => (
                <p key={r.label} className="flex min-h-11 items-center py-1.5">
                  <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">{r.label}</span>
                  <span className="min-w-0 flex-1 break-keep text-[17px] text-[#333D4B]">{r.value}</span>
                </p>
              ))}
            </div>
            <div className={`mt-4 grid gap-2 ${hospital.phone ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {[
                ...(hospital.phone ? [{ label: '전화하기', icon: 'call', onClick: () => { window.location.href = `tel:${hospital.phone.replace(/[^0-9+]/g, '')}`; } }] : []),
                { label: '길찾기', icon: 'pin-location', onClick: () => window.open(`https://map.naver.com/p?q=${encodeURIComponent(hospital.address || hospital.name)}`, '_blank') },
                { label: '병원 홈', icon: 'hospital', onClick: () => router.push(`/hospital/detail/${hospital.id}`) },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={btn.onClick}
                  className="flex h-12 items-center justify-center gap-1.5 rounded-[14px] bg-[#F2F4F6] text-[15px] font-semibold text-[#333D4B] transition-all active:scale-[0.98] active:bg-[#E5E8EB]"
                >
                  <MonoIcon name={btn.icon} size={18} color="#6B7684" />
                  {btn.label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        {/* ─── 담당 리뷰 ─── */}
        <div className="h-2.5 bg-[#F2F4F6]" />
        <div className="px-5 py-7">
          <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">담당 리뷰</h2>
          {doctorReviews.length > 0 ? (
            <>
              <div className="mb-1 mt-3 flex items-center gap-2">
                <StarRating value={Number(doctorAvgRating)} size={20} />
                <span className="text-[24px] font-bold text-[#191F28]">{doctorAvgRating}</span>
                <span className="text-[14px] text-[#8B95A1]">({doctorReviews.length})</span>
              </div>
              <div className="lg:grid lg:grid-cols-2 lg:gap-x-6">
                {doctorReviews.map((review, i) => (
                  <ReviewCommentRow
                    key={review.id}
                    first={i === 0}
                    review={{
                      id: review.id,
                      name: review.authorName,
                      rating: review.rating,
                      date: review.date,
                      content: review.content,
                      meta: `${review.treatmentName} · ${review.totalCost.toLocaleString()}원`,
                      photos: [
                        ...(review.beforeImage ? [{ src: review.beforeImage, label: '전' }] : []),
                        ...(review.afterImage ? [{ src: review.afterImage, label: '후' }] : []),
                      ],
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
                <MonoIcon name="chat-bubble-question" size={34} color="#B0B8C1" />
              </span>
              <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">아직 리뷰가 없어요</p>
              <p className="mt-1.5 text-[15px] text-[#8B95A1]">이 원장님께 시술받고 첫 후기를 남겨 보세요.</p>
            </div>
          )}
        </div>

        {/* ─── 이 의사의 시술 상품 ─── */}
        {hospitalProducts.length > 0 && (
          <>
            <div className="h-2.5 bg-[#F2F4F6]" />
            <div className="px-4 py-7">
              <h2 className="mb-4 px-1 text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">이 의사의 시술 상품</h2>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                {hospitalProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
