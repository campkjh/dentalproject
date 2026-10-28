'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Share2, X } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import ProductCard from '@/components/common/ProductCard';
import NaverMap from '@/components/common/NaverMap';
import { BRAND, Reveal, StarRating, SectionHead, IconTile, FloatingReviewCards, ReviewCommentRow, type ReviewRowData } from '@/components/detail/DetailKit';
import { useStore } from '@/store';
import { resolveHospitalImageUrl } from '@/lib/images';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

const WEEK_DAYS = [
  { name: '일요일', short: '일' },
  { name: '월요일', short: '월' },
  { name: '화요일', short: '화' },
  { name: '수요일', short: '수' },
  { name: '목요일', short: '목' },
  { name: '금요일', short: '금' },
  { name: '토요일', short: '토' },
];

type SectionId = 'intro' | 'doctors' | 'hours' | 'reviews';
const SECTION_TABS: { id: SectionId; label: string }[] = [
  { id: 'intro', label: '병원 소개' },
  { id: 'doctors', label: '의료진' },
  { id: 'hours', label: '진료 시간' },
  { id: 'reviews', label: '리뷰' },
];
/** 고정 머리(60) + 섹션 탭(52) */
const STICKY_OFFSET = 116;

// 병원 상세 — 상품 상세와 같은 프리티풀 상세 결(떠 있는 머리·44 라운드 사진 넘기기·알약 섹션 탭·아이콘 섹션 머리·댓글형 리뷰)
export default function HospitalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hospitals, products, reviews, showToast } = useStore();
  const [liveCoverImages, setLiveCoverImages] = useState<string[] | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [headerSolid, setHeaderSolid] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('intro');
  const [imageModal, setImageModal] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const sectionRefs = {
    intro: useRef<HTMLDivElement>(null),
    doctors: useRef<HTMLDivElement>(null),
    hours: useRef<HTMLDivElement>(null),
    reviews: useRef<HTMLDivElement>(null),
  };

  const hospital = useMemo(() => hospitals.find(h => h.id === params.id), [params.id, hospitals]);
  const hospitalReviews = useMemo(() => reviews.filter(r => r.hospitalId === hospital?.id), [hospital, reviews]);
  const hospitalProducts = useMemo(() => products.filter(p => p.hospitalId === hospital?.id), [hospital, products]);

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
      const imgs = (data.cover_images ?? []).filter((u: string) => u && !u.startsWith('data:'));
      setLiveCoverImages(imgs.length > 0 ? imgs : null);
    }).catch(() => {});
  }, [hospital?.id]);

  useEffect(() => {
    const onScroll = () => {
      setHeaderSolid(window.scrollY > 240);
      let current: SectionId = 'intro';
      for (const tab of SECTION_TABS) {
        const el = sectionRefs[tab.id].current;
        if (el && el.getBoundingClientRect().top - STICKY_OFFSET - 8 <= 0) current = tab.id;
      }
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hospital) {
    if (hospitals.length === 0) {
      return (
        <div className="min-h-screen bg-white px-[18px] pt-[74px]">
          <div className="aspect-[4/3] w-[min(84vw,520px)] animate-pulse rounded-[44px] bg-[#F2F4F6]" />
          <div className="mt-8 h-6 w-48 animate-pulse rounded-full bg-[#F2F4F6]" />
          <div className="mt-3 h-4 w-32 animate-pulse rounded-full bg-[#F2F4F6]" />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[15px] text-[#8B95A1]">병원 정보를 찾을 수 없어요.</p>
      </div>
    );
  }

  const coverImages = liveCoverImages ?? hospital.coverImages?.filter(u => u && !u.startsWith('data:')) ?? [];
  const hospitalLogo = resolveHospitalImageUrl(hospital);
  const todayIdx = new Date().getDay();
  const reviewCount = hospitalReviews.length || hospital.reviewCount;
  const rating = hospitalReviews.length > 0 ? hospitalReviews.reduce((s, r) => s + r.rating, 0) / hospitalReviews.length : hospital.rating;
  const todayHours = hospital.operatingHours.find(o => o.day === WEEK_DAYS[todayIdx].short || o.day === WEEK_DAYS[todayIdx].name);
  const reviewRows: ReviewRowData[] = hospitalReviews.map(r => {
    const doctor = hospital.doctors.find(d => d.id === r.doctorId || d.name === r.doctorName);
    const doctorName = doctor?.name || r.doctorName;
    return {
      id: r.id,
      name: r.authorName,
      avatarSeed: r.authorId || r.authorName,
      rating: r.rating,
      date: r.date,
      content: r.content,
      meta: [r.treatmentName, doctorName ? `${doctorName} ${doctor?.isOwner ? '대표원장' : doctor?.title || '원장'}` : '', r.treatmentDate ? `시술일 ${r.treatmentDate}` : ''].filter(Boolean).join(' · '),
      photos: [r.beforeImage ? { src: r.beforeImage, label: '전' } : null, r.afterImage ? { src: r.afterImage, label: '후' } : null].filter(Boolean) as { src: string; label: string }[],
    };
  });
  const infoRows = [
    { icon: '/icons/pro-detail/notice.svg', label: '주소', value: hospital.address },
    { icon: '/icons/pro-detail/clock.svg', label: '오늘 진료', value: !todayHours || todayHours.isClosed ? '휴진' : `${todayHours.startTime}~${todayHours.endTime}` },
    { icon: '/icons/pro-detail/person.svg', label: '의료진', value: `${hospital.doctors.length}명` },
    ...(hospital.phone ? [{ icon: '/icons/pro-detail/chat.svg', label: '전화', value: hospital.phone }] : []),
  ];

  const share = () => {
    if (navigator.share) navigator.share({ title: hospital.name, url: window.location.href }).catch(() => {});
    else { navigator.clipboard.writeText(window.location.href); showToast('링크가 복사되었어요.'); }
  };
  const scrollToSection = (id: SectionId) => {
    const el = sectionRefs[id].current;
    const offset = STICKY_OFFSET + (window.innerWidth >= 1024 ? 12 : 0);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset + 2, behavior: 'smooth' });
  };
  const cardStep = () => {
    const el = galleryRef.current;
    return el ? Math.min(el.clientWidth * 0.84, 520) + 12 : 1;
  };
  const activeIdx = SECTION_TABS.findIndex(t => t.id === activeSection);
  // 머리 버튼 — 그림자 없이(사장 지시), 아이콘은 크게
  const roundBtn = (solid: boolean) => `flex h-11 w-11 shrink-0 items-center justify-center transition-all active:scale-90 ${solid ? 'text-[#191F28]' : 'rounded-full bg-white/90 backdrop-blur-md'}`;

  return (
    <div className="min-h-screen bg-white pb-[110px]">
      {/* ─── 머리 — 떠 있는 둥근 버튼 → 스크롤하면 로고 + 이름 흰 머리 ─── */}
      <div className={`fixed left-0 right-0 top-0 z-40 flex items-center gap-2 transition-all duration-300 min-[1024px]:hidden ${headerSolid ? 'h-[60px] bg-white px-3' : 'justify-between px-4 pb-3 pt-3'}`}>
        <button type="button" aria-label="뒤로" onClick={() => router.back()} className={roundBtn(headerSolid)}>
          <ChevronLeft size={28} strokeWidth={2.2} className="text-[#191F28]" />
        </button>
        <div
          className={`flex min-w-0 flex-1 items-center gap-2.5 transition-all duration-300 ${headerSolid ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          style={{ transform: headerSolid ? 'translateY(0)' : 'translateY(6px)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hospitalLogo} alt="" className="h-10 w-10 shrink-0 rounded-xl bg-[#F2F4F6] object-cover" />
          <p className="min-w-0 flex-1 truncate text-[13px] font-bold leading-tight text-[#191F28]">{hospital.name}</p>
        </div>
        <button type="button" aria-label="공유" onClick={share} className={`${roundBtn(headerSolid)} ${headerSolid ? '' : 'ml-auto'}`}>
          <Share2 size={23} strokeWidth={2} className="text-[#191F28]" />
        </button>
      </div>

      <div>
        {/* ─── 사진 넘기기 ─── */}
        <div className="overflow-hidden pt-[74px] min-[1024px]:pt-6">
          {coverImages.length > 0 ? (
            <>
              <div
                ref={galleryRef}
                onScroll={e => {
                  const idx = Math.round(e.currentTarget.scrollLeft / cardStep());
                  const clamped = Math.max(0, Math.min(coverImages.length - 1, idx));
                  if (clamped !== activeImage) setActiveImage(clamped);
                }}
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[18px] hide-scrollbar"
                style={{ scrollPaddingLeft: 18 }}
              >
                {coverImages.map((src, i) => (
                  <button
                    type="button"
                    key={src + i}
                    onClick={() => setImageModal(src)}
                    className="relative shrink-0 snap-start overflow-hidden rounded-[44px] bg-[#F2F4F6] transition-transform duration-300 ease-out"
                    style={{ width: 'min(84vw, 520px)', aspectRatio: '4 / 3', transform: `scale(${i === activeImage ? 1 : 0.9})` }}
                  >
                    {Math.abs(i - activeImage) <= 1 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={hospital.name} className="h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
                    ) : null}
                  </button>
                ))}
              </div>
              {coverImages.length > 1 && (
                <div className="mt-3 flex justify-center gap-1.5">
                  {coverImages.map((src, i) => (
                    <button
                      type="button"
                      key={src + i}
                      aria-label={`${i + 1}번째 사진`}
                      onClick={() => galleryRef.current?.scrollTo({ left: i * cardStep(), behavior: 'smooth' })}
                      className="rounded-full transition-colors duration-300"
                      style={{ width: 6, height: 6, backgroundColor: i === activeImage ? '#191F28' : '#D5DAE0' }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="mx-[18px] aspect-[4/3] w-[min(84vw,520px)] rounded-[44px] bg-[#F2F4F6]" />
          )}
        </div>

        {/* ─── 이름 · 별점 · 정보 줄 ─── */}
        <div className="bg-white px-5 py-6">
          <Reveal>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hospitalLogo} alt="" className="h-[52px] w-[52px] shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[20px] font-bold leading-[1.35] text-[#191F28]">{hospital.name}</h1>
                {hospital.location && <p className="mt-0.5 truncate text-[13.5px] text-[#8B95A1]">{hospital.location}</p>}
              </div>
            </div>
            {hospital.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {hospital.tags.map(t => (
                  <span key={t} className="rounded-full bg-[#F2F4F6] px-2.5 py-1 text-[13px] font-semibold text-[#4E5968]">{t}</span>
                ))}
              </div>
            )}
          </Reveal>
          <Reveal delay={100}>
            <div className="mb-1 mt-3 flex items-center gap-2">
              <StarRating value={Number(rating.toFixed(1))} size={16} twinkle />
              <span className="text-[18px] font-bold text-[#191F28]">{rating.toFixed(1)}</span>
              <span className="text-[13px] text-[#8B95A1]">({reviewCount})</span>
            </div>
            <FloatingReviewCards reviews={reviewRows} />
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-3 divide-y divide-[#F2F4F6]">
              {infoRows.map(row => (
                <div key={row.label} className="flex items-center gap-3 py-3">
                  <IconTile src={row.icon} />
                  <span className="shrink-0 text-[13px] text-[#8B95A1]">{row.label}</span>
                  <span className="ml-auto min-w-0 truncate text-right text-[14px] font-bold text-[#191F28]">{row.value}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* ─── 섹션 탭 ─── */}
        <div className="sticky top-[60px] z-30 min-[1024px]:top-[72px] bg-white px-4 pb-2 pt-1">
          <div className="relative flex gap-1 rounded-2xl bg-[#F2F3F5] p-1">
            <span
              className="absolute bottom-1 top-1 rounded-[13px] bg-white shadow-sm transition-all duration-500"
              style={{
                left: `calc(4px + ${(activeIdx * 100) / SECTION_TABS.length}% - ${(activeIdx * 8) / SECTION_TABS.length}px)`,
                width: `calc(${100 / SECTION_TABS.length}% - ${8 / SECTION_TABS.length}px)`,
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
            {SECTION_TABS.map(tab => (
              <button
                type="button"
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`relative flex-1 rounded-[13px] py-2 text-[13px] transition-colors duration-300 ${activeSection === tab.id ? 'font-bold text-[#2B313D]' : 'font-semibold text-[#A4ABBA] hover:text-[#51535C]'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── 병원 소개 ─── */}
        <div ref={sectionRefs.intro} className="bg-white px-5 py-6">
          <SectionHead title="병원 소개" icon="/icons/pro-detail/sparkle.svg" className="mb-4" />
          {hospital.introduction ? (
            <p className="whitespace-pre-line text-[16px] leading-[1.7] text-[#333D4B]">{hospital.introduction}</p>
          ) : (
            <p className="text-[14px] text-[#8B95A1]">등록된 소개가 없어요.</p>
          )}
          <div className="mt-6">
            <SectionHead title="오시는 길" icon="/icons/pro-detail/notice.svg" size="sm" className="mb-3" />
            <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] border border-[#EEF0F3]">
              <NaverMap address={hospital.address} lat={hospital.lat} lng={hospital.lng} name={hospital.name} />
            </div>
            <p className="mt-3 text-[15px] leading-[1.5] text-[#333D4B]">{hospital.address}</p>
            {hospital.addressDetail && <p className="mt-1 whitespace-pre-line text-[14px] leading-[1.6] text-[#6B7684]">{hospital.addressDetail}</p>}
            <button
              type="button"
              onClick={() => window.open(`https://map.naver.com/p?q=${encodeURIComponent(hospital.address || hospital.name)}`, '_blank')}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E8EB] py-3.5 text-[14px] font-semibold text-[#4E5968] transition-all hover:bg-[#F7F8FA] active:scale-[0.98]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/naver-map.png" alt="" width={18} height={18} />
              네이버 지도로 길찾기
            </button>
          </div>
        </div>

        {/* ─── 상품 ─── */}
        {hospitalProducts.length > 0 && (
          <div className="px-4 pb-4 pt-6">
            <Reveal>
              <h3 className="mb-4 text-[20px] font-bold leading-tight text-[#191F28]">{hospital.name}의<br />상품을 살펴보세요</h3>
            </Reveal>
            <div className="flex snap-x gap-3 overflow-x-auto pr-4 hide-scrollbar">
              {hospitalProducts.map((p, i) => (
                <div key={p.id} className="w-[150px] shrink-0 snap-start">
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── 의료진 ─── */}
        <div ref={sectionRefs.doctors} className="bg-white px-5 py-6">
          <SectionHead title="의료진" icon="/icons/pro-detail/person.svg" className="mb-2" />
          {hospital.doctors.length > 0 ? (
            <div className="divide-y divide-[#F2F4F6]">
              {hospital.doctors.map(d => (
                <Link key={d.id} href={`/doctor/${d.id}`} className="flex items-center gap-3 py-3 transition-opacity active:opacity-70">
                  <Avatar src={d.profileImage} role="doctor" seed={d.name} size={56} alt={d.name} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-[#191F28]">{d.name} {d.isOwner ? '대표원장' : d.title || '원장'}</p>
                    {d.specialty && <p className="mt-0.5 truncate text-[13px] text-[#8B95A1]">{d.specialty}</p>}
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-[#B0B8C1]" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-4 text-[14px] text-[#8B95A1]">등록된 의료진이 없어요.</p>
          )}
        </div>

        {/* ─── 진료 시간 ─── */}
        <div ref={sectionRefs.hours} className="bg-white px-5 py-6">
          <SectionHead title="진료 시간" icon="/icons/pro-detail/clock.svg" className="mb-2" />
          {hospital.holidayNotice && <p className="mb-2 text-[13px] font-semibold text-[#F04452]">{hospital.holidayNotice}</p>}
          <ul className="divide-y divide-[#F2F4F6]">
            {WEEK_DAYS.map((d, idx) => {
              const oh = hospital.operatingHours.find(o => o.day === d.short || o.day === d.name);
              const today = idx === todayIdx;
              const closed = !oh || oh.isClosed;
              return (
                <li key={d.short} className="flex items-center justify-between py-3 text-[15px]">
                  <span className={today ? 'font-bold text-[#191F28]' : 'font-semibold text-[#6B7684]'}>
                    {d.name}
                    {today && <span className="ml-1.5 rounded-[5px] bg-[#E8F3FF] px-1.5 py-0.5 text-[11px] font-bold" style={{ color: BRAND }}>오늘</span>}
                  </span>
                  <span className={closed ? 'text-[#B0B8C1]' : today ? 'font-bold text-[#191F28]' : 'text-[#4E5968]'}>{closed ? '휴진' : `${oh!.startTime} ~ ${oh!.endTime}`}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ─── 리뷰 ─── */}
        <div ref={sectionRefs.reviews} className="bg-white px-5 py-6">
          <SectionHead title="리뷰" icon="/icons/pro-detail/eyes.svg" className="mb-4" />
          <div className="mb-3 flex items-center gap-2">
            <StarRating value={Number(rating.toFixed(1))} size={20} />
            <span className="text-[24px] font-bold text-[#191F28]">{rating.toFixed(1)}</span>
            <span className="text-[14px] text-[#8B95A1]">({reviewCount})</span>
          </div>
          <h3 className="mb-1 mt-5 text-[16px] font-bold text-[#191F28]">전체 리뷰 {hospitalReviews.length}건</h3>
          {reviewRows.length > 0 ? (
            reviewRows.map((r, i) => <ReviewCommentRow key={r.id} review={r} first={i === 0} />)
          ) : (
            <p className="py-8 text-center text-[14px] text-[#8B95A1]">아직 리뷰가 없어요.</p>
          )}
        </div>
      </div>

      {/* ─── 사진 크게 ─── */}
      {imageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 modal-overlay-enter" onClick={() => setImageModal(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageModal} alt="" className="max-h-full max-w-full object-contain" />
          <button type="button" aria-label="닫기" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white" onClick={() => setImageModal(null)}>
            <X size={22} />
          </button>
        </div>
      )}
    </div>
  );
}
