'use client';

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, ChevronLeft, Maximize2 } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import ProductCard from '@/components/common/ProductCard';
import { useStore } from '@/store';
import { resolveHospitalImageUrl } from '@/lib/images';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

const TABS = ['병원소개', '의료진', '진료시간', '리뷰'];

const WEEK_DAYS = [
  { name: '일요일', short: '일' },
  { name: '월요일', short: '월' },
  { name: '화요일', short: '화' },
  { name: '수요일', short: '수' },
  { name: '목요일', short: '목' },
  { name: '금요일', short: '금' },
  { name: '토요일', short: '토' },
];

export default function HospitalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hospitals, products, reviews } = useStore();
  const [activeTab, setActiveTab] = useState('병원소개');
  const [tabDir, setTabDir] = useState<'left' | 'right'>('right');
  const [liveCoverImages, setLiveCoverImages] = useState<string[] | null>(null);
  const prevIdxRef = useRef(0);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  const activeIdx = TABS.indexOf(activeTab);

  const changeTab = (t: string) => {
    const next = TABS.indexOf(t);
    setTabDir(next >= prevIdxRef.current ? 'right' : 'left');
    prevIdxRef.current = next;
    setActiveTab(t);
  };

  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[activeIdx];
    if (!btn) return;
    setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeIdx]);

  useEffect(() => {
    const onResize = () => {
      const btn = tabBtnRefs.current[activeIdx];
      if (!btn) return;
      setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeIdx]);

  const hospital = useMemo(
    () => hospitals.find((h) => h.id === params.id),
    [params.id, hospitals]
  );

  const hospitalReviews = useMemo(
    () => reviews.filter((r) => r.hospitalId === hospital?.id),
    [hospital, reviews]
  );

  const hospitalProducts = useMemo(
    () => products.filter((p) => p.hospitalId === hospital?.id),
    [hospital, products]
  );

  const avgRating = useMemo(() => {
    if (hospitalReviews.length === 0) return hospital?.rating?.toFixed(1) ?? '0.0';
    return (hospitalReviews.reduce((sum, r) => sum + r.rating, 0) / hospitalReviews.length).toFixed(1);
  }, [hospitalReviews, hospital]);

  // Live cover_images load from supabase (kept from previous implementation)
  useEffect(() => {
    if (!hospital?.id || !hasSupabaseEnv()) return;
    Promise.resolve(
      createClient()
        .from('hospitals')
        .select('cover_images, image_url')
        .eq('slug', hospital.id)
        .maybeSingle()
    ).then(({ data }) => {
      if (!data) return;
      const imgs = (data.cover_images ?? []).filter(
        (u: string) => u && !u.startsWith('data:')
      );
      setLiveCoverImages(imgs.length > 0 ? imgs : null);
    }).catch(() => {});
  }, [hospital?.id]);

  if (!hospital) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">정보를 찾을 수 없습니다</p>
      </div>
    );
  }

  const coverImages = liveCoverImages ?? hospital.coverImages?.filter(
    (u) => u && !u.startsWith('data:')
  ) ?? [];

  const hospitalLogo = resolveHospitalImageUrl(hospital);
  const todayIdx = new Date().getDay(); // 0=Sun, 1=Mon, ...

  const openNaverMap = () => {
    const q = encodeURIComponent(hospital.address || hospital.name);
    window.open(`https://map.naver.com/p?q=${q}`, '_blank');
  };

  return (
    <div className="pb-[86px] lg:pb-0 bg-white min-h-screen">
      <div className="lg:max-w-5xl lg:mx-auto">
        {/* Minimal header — just back arrow, no title (hospital name lives on the hero) */}
        <header className="sticky top-0 z-40 bg-white h-14 flex items-center px-4">
          <button onClick={() => router.back()} className="p-1 -ml-1" aria-label="뒤로가기">
            <ChevronLeft size={26} strokeWidth={2.4} className="text-[#2B313D]" />
          </button>
        </header>

        {/* Hero — cover carousel + hospital name overlay + position pill */}
        <CoverHero images={coverImages} name={hospital.name} />

        {/* Info card — logo + address/phone + tag chips */}
        <section className="px-4 pt-4">
          <div className="flex items-start gap-3">
            <div
              className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: '#F4F5F7' }}
            >
              <img src={hospitalLogo} alt={hospital.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-[15px] text-[#51535C] leading-[22px] line-clamp-1">
                {hospital.address}
              </p>
              <p className="text-[15px] text-[#51535C] leading-[22px] mt-0.5">
                {hospital.phone}
              </p>
            </div>
          </div>

          {/* Tag chips */}
          {hospital.tags && hospital.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {hospital.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center"
                  style={{ backgroundColor: '#F2F3F5', borderRadius: 8, fontSize: 14, color: '#51535C', padding: '4px 12px' }}
                >
                  {tag}
                </span>
              ))}
              {hospital.tags.length > 3 && (
                <span
                  className="inline-flex items-center"
                  style={{ backgroundColor: '#F2F3F5', borderRadius: 8, fontSize: 14, color: '#A4ABBA', padding: '4px 12px' }}
                >
                  +{hospital.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Stats card — 3 equal columns, each value + label centered */}
          <div
            className="flex items-stretch mt-4 rounded-xl py-3"
            style={{ backgroundColor: '#F7F8FA' }}
          >
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1">
                <Star size={16} fill="#FBBF24" stroke="#FBBF24" />
                <span style={{ fontSize: 16, fontWeight: 700, color: '#2B313D' }}>{avgRating}</span>
              </div>
              <p style={{ fontSize: 12, color: '#A4ABBA', marginTop: 4 }}>평점</p>
            </div>
            <div className="w-px self-center" style={{ backgroundColor: '#E5E7EB', height: 28 }} />
            <div className="flex-1 flex flex-col items-center justify-center">
              <span style={{ fontSize: 16, fontWeight: 700, color: '#2B313D' }}>
                {hospitalReviews.length || hospital.reviewCount}건
              </span>
              <p style={{ fontSize: 12, color: '#A4ABBA', marginTop: 4 }}>진료건수</p>
            </div>
            <div className="w-px self-center" style={{ backgroundColor: '#E5E7EB', height: 28 }} />
            <div className="flex-1 flex flex-col items-center justify-center">
              <span style={{ fontSize: 16, fontWeight: 700, color: '#2B313D' }}>
                {hospital.doctors.length}명
              </span>
              <p style={{ fontSize: 12, color: '#A4ABBA', marginTop: 4 }}>의료진수</p>
            </div>
          </div>
        </section>

        {/* Sticky tabs */}
        <div style={{ position: 'sticky', top: 56, zIndex: 30 }} className="bg-white mt-4">
          <div className="relative flex border-b border-gray-100">
            {TABS.map((t, i) => {
              const isActive = activeTab === t;
              return (
                <button
                  key={t}
                  ref={(el) => {
                    tabBtnRefs.current[i] = el;
                  }}
                  onClick={() => changeTab(t)}
                  className="flex-1 py-3 text-[16px] font-bold"
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

        {/* Tab content */}
        <div
          key={activeTab}
          className={`px-4 py-5 ${tabDir === 'right' ? 'tab-slide-right' : 'tab-slide-left'}`}
        >
          {/* ===================== 병원소개 ===================== */}
          {activeTab === '병원소개' && (
            <div className="space-y-7">
              {/* 병원소개 */}
              <section>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 12 }}>
                  병원소개
                </h2>
                {hospital.introduction ? (
                  <p style={{ fontSize: 15, color: '#51535C', lineHeight: '24px', whiteSpace: 'pre-line' }}>
                    {hospital.introduction}
                  </p>
                ) : (
                  <p style={{ fontSize: 15, color: '#A4ABBA' }}>등록된 소개 정보가 없습니다.</p>
                )}
              </section>

              {/* 병원위치 */}
              <section>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 12 }}>
                  병원위치
                </h2>
                <div
                  className="relative aspect-[16/10] rounded-xl overflow-hidden"
                  style={{ border: '1px solid #E5E7EB' }}
                >
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
                  <button
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(hospital.address)}`, '_blank')}
                    className="absolute top-2 right-2 w-8 h-8 bg-white rounded-md flex items-center justify-center"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
                    aria-label="지도 확대"
                  >
                    <Maximize2 size={14} className="text-gray-700" />
                  </button>
                </div>

                {/* 찾아가는길 button */}
                <button
                  onClick={openNaverMap}
                  className="btn-press w-full flex items-center justify-center gap-2 mt-3"
                  style={{ height: 48, borderRadius: 12, backgroundColor: '#F4F5F7', fontSize: 16, fontWeight: 700, color: '#2B313D' }}
                >
                  <img src="/icons/naver-map.png" alt="" width={22} height={22} className="flex-shrink-0" />
                  찾아가는길
                </button>

                {/* Address text */}
                <p style={{ fontSize: 15, color: '#2B313D', marginTop: 16, lineHeight: '22px' }}>
                  {hospital.address}
                </p>
                {hospital.addressDetail && (
                  <p style={{ fontSize: 15, color: '#51535C', marginTop: 8, lineHeight: '22px', whiteSpace: 'pre-line' }}>
                    {hospital.addressDetail}
                  </p>
                )}
              </section>
            </div>
          )}

          {/* ===================== 의료진 ===================== */}
          {activeTab === '의료진' && (
            <section>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 16 }}>
                의사정보
              </h2>
              {hospital.doctors.length > 0 ? (
                <div className="space-y-5">
                  {hospital.doctors.map((doctor) => (
                    <Link
                      key={doctor.id}
                      href={`/doctor/${doctor.id}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <Avatar
                        src={doctor.profileImage}
                        role="doctor"
                        seed={doctor.name}
                        size={60}
                        alt={doctor.name}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#2B313D' }}>
                          {doctor.name} {doctor.isOwner ? '대표원장' : doctor.title || '원장'}
                        </p>
                        {doctor.specialty && (
                          <p style={{ fontSize: 14, color: '#51535C', marginTop: 3 }}>
                            {doctor.specialty}
                          </p>
                        )}
                        <p style={{ fontSize: 13, color: '#A4ABBA', marginTop: 2 }}>{hospital.name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 15, color: '#A4ABBA' }}>등록된 의료진 정보가 없습니다.</p>
              )}
            </section>
          )}

          {/* ===================== 진료시간 ===================== */}
          {activeTab === '진료시간' && (
            <section>
              <div className="space-y-1">
                {WEEK_DAYS.map((d, idx) => {
                  const oh = hospital.operatingHours.find((o) => o.day === d.short || o.day === d.name);
                  const isToday = idx === todayIdx;
                  const isClosed = !oh || oh.isClosed;
                  return (
                    <div
                      key={d.short}
                      className="flex items-center gap-3"
                      style={{
                        padding: '12px 12px',
                        borderRadius: 12,
                        backgroundColor: isToday ? '#F4F5F7' : 'transparent',
                      }}
                    >
                      <div
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: isToday ? '#2B313D' : '#F2F3F5',
                          color: isToday ? '#fff' : '#A4ABBA',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 600, color: '#2B313D' }}>{d.name}</p>
                        <p style={{ fontSize: 14, color: isClosed ? '#A4ABBA' : '#51535C', marginTop: 2 }}>
                          {isClosed ? '휴무' : `${oh!.startTime}~${oh!.endTime}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {hospital.holidayNotice && (
                <p style={{ fontSize: 14, color: '#EF4444', marginTop: 12 }}>{hospital.holidayNotice}</p>
              )}
            </section>
          )}

          {/* ===================== 리뷰 ===================== */}
          {activeTab === '리뷰' && (
            <section>
              {hospitalReviews.length > 0 ? (
                <div className="space-y-3">
                  {hospitalReviews.map((review) => {
                    const hasReviewImages = Boolean(review.beforeImage || review.afterImage);
                    // Match the review to a doctor on this hospital so we can
                    // surface "어떤 원장에게 시술받았는지" — profile pic, name,
                    // specialty. Fall back to author info when there's no match.
                    const doctor = hospital.doctors.find(
                      (d) => d.id === review.doctorId || d.name === review.doctorName
                    );
                    const doctorName = doctor?.name || review.doctorName;
                    const doctorTitle = doctor?.isOwner ? '대표원장' : (doctor?.title || '원장');
                    return (
                      <div key={review.id} className="rounded-[20px]" style={{ backgroundColor: '#F9F9F9', padding: 16 }}>
                        {/* Top row: doctor avatar + name/specialty/treatment date  ·  stars */}
                        <div className="flex items-start gap-3 mb-3">
                          {doctorName ? (
                            <Avatar
                              src={doctor?.profileImage}
                              role="doctor"
                              seed={doctorName}
                              size={44}
                              alt={doctorName}
                              className="flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-11 h-11 rounded-full flex-shrink-0"
                              style={{ backgroundColor: '#E5E7EB' }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            {doctorName ? (
                              <p style={{ fontSize: 15, fontWeight: 700, color: '#2B313D' }}>
                                {doctorName} {doctorTitle}
                              </p>
                            ) : (
                              <p style={{ fontSize: 15, fontWeight: 700, color: '#2B313D' }}>
                                {review.authorName}
                              </p>
                            )}
                            {doctor?.specialty && (
                              <p style={{ fontSize: 13, color: '#51535C', marginTop: 2 }}>
                                {doctor.specialty}
                              </p>
                            )}
                            {review.treatmentDate && (
                              <p style={{ fontSize: 13, color: '#A4ABBA', marginTop: 2 }}>
                                시술일 {review.treatmentDate}
                              </p>
                            )}
                            {!review.treatmentDate && !doctor?.specialty && (
                              <p style={{ fontSize: 13, color: '#A4ABBA', marginTop: 2 }}>
                                {review.date}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={13}
                                fill={i < review.rating ? '#FBBF24' : '#E5E7EB'}
                                stroke={i < review.rating ? '#FBBF24' : '#E5E7EB'}
                              />
                            ))}
                          </div>
                        </div>

                        {hasReviewImages && (
                          <div className="flex gap-2 mb-3">
                            {review.beforeImage && (
                              <div className="flex-1 aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                                <img src={review.beforeImage} alt="Before" className="h-full w-full object-cover" />
                              </div>
                            )}
                            {review.afterImage && (
                              <div className="flex-1 aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                                <img src={review.afterImage} alt="After" className="h-full w-full object-cover" />
                              </div>
                            )}
                          </div>
                        )}
                        <p style={{ fontSize: 14, color: '#51535C', lineHeight: '22px' }}>{review.content}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 15, color: '#A4ABBA', textAlign: 'center', paddingTop: 32, paddingBottom: 32 }}>
                  아직 리뷰가 없습니다
                </p>
              )}
            </section>
          )}
        </div>

        {/* ===================== 더많은 상품 ===================== */}
        {hospitalProducts.length > 0 && (
          <section className="pt-2 pb-6">
            <h2 className="px-4" style={{ fontSize: 20, fontWeight: 700, color: '#2B313D', marginBottom: 14 }}>
              더많은 상품
            </h2>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-4">
              {hospitalProducts.map((hp) => (
                <div key={hp.id} className="w-[140px] flex-shrink-0">
                  <ProductCard product={hp} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* Hero — horizontal scroll-snap carousel + hospital name overlay + N/total pill. */
function CoverHero({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  };

  const hasImages = images && images.length > 0;

  return (
    <div className="relative">
      {hasImages ? (
        <div
          ref={ref}
          onScroll={handleScroll}
          className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory"
          style={{ scrollBehavior: 'smooth' }}
        >
          {images.map((src, i) => (
            <div key={i} className="aspect-[16/10] w-full flex-shrink-0 snap-start bg-gray-200">
              <img src={src} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="aspect-[16/10] w-full"
          style={{ background: 'linear-gradient(135deg, #8037FF, #A78BFA)' }}
        />
      )}

      {/* Bottom-gradient + hospital name overlay */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '50%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))',
        }}
      />
      <h1
        className="absolute left-4 bottom-4"
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: '#fff',
          textShadow: '0 2px 12px rgba(0,0,0,0.4)',
          letterSpacing: '-0.01em',
        }}
      >
        {name}
      </h1>

      {/* Position pill — only if multiple images */}
      {hasImages && images.length > 1 && (
        <div
          className="absolute bottom-4 right-4 text-white text-[12px] font-medium px-2.5 py-1 rounded-full backdrop-blur"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          {idx + 1}/{images.length}
        </div>
      )}
    </div>
  );
}
