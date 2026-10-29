'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Share2, X } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import ProductCard from '@/components/common/ProductCard';
import NaverMap from '@/components/common/NaverMap';
import { Reveal, StarRating, ReviewCommentRow, type ReviewRowData } from '@/components/detail/DetailKit';
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

// 병원 상세 — 상품 상세와 같은 결(261029 사장): 떠 있는 머리·44 라운드 사진 넘기기·가는 줄로 나눈 위 칸·알약 섹션 탭·회색 띠 + 22 굵은 섹션 제목·테두리 둥근 칸·댓글형 리뷰
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

        {/* ─── 이름 · 별점 · 오늘 진료 · 주소 · 바로 하기 — 상품 상세 위 칸과 같은 결(가는 회색 줄로 나눔) ─── */}
        <div className="bg-white px-5 pb-2 pt-6">
          <Reveal>
            {hospital.location && <p className="mb-1.5 truncate text-[14px] font-semibold text-[#6B7684]">{hospital.location}</p>}
            <h1 className="break-keep text-[22px] font-bold leading-[1.4] tracking-[-0.4px] text-[#191F28]">{hospital.name}</h1>
            <button type="button" onClick={() => scrollToSection('reviews')} className="mt-2.5 flex items-center gap-1 text-[15px] text-[#191F28]">
              <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="#FFC933" /></svg>
              <span className="ml-0.5">{rating.toFixed(1)}</span>
              <span className="text-[#6B7684]">(<span className="underline underline-offset-2">{reviewCount}</span>)</span>
            </button>
            {hospital.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {hospital.tags.map(t => (
                  <span key={t} className="rounded-full bg-[#F2F4F6] px-2.5 py-1 text-[13px] font-semibold text-[#4E5968]">#{t.replace(/^#/, '')}</span>
                ))}
              </div>
            )}
          </Reveal>

          <Reveal delay={80}>
            {/* 오늘 진료 + 전체보기 */}
            <div className="mt-6 flex items-center gap-3 border-t border-[#F2F4F6] py-5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-[#6B7684]">오늘 진료 · {WEEK_DAYS[todayIdx].name}</p>
                <p className="mt-1 truncate text-[17px] font-medium text-[#191F28]">{!todayHours || todayHours.isClosed ? '휴진' : `${todayHours.startTime} – ${todayHours.endTime}`}</p>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection('hours')}
                className="shrink-0 rounded-[12px] border border-[#D1D6DB] px-3.5 py-2.5 text-[14px] font-semibold text-[#191F28] transition-colors active:bg-[#F7F8FA]"
              >
                전체보기
              </button>
            </div>

            {/* 주소 */}
            <div className="flex items-center gap-3 border-t border-[#F2F4F6] py-5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-[#6B7684]">주소</p>
                <p className="mt-1 break-keep text-[16px] leading-[1.45] text-[#191F28]">{hospital.address}</p>
              </div>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(hospital.address).then(() => showToast('주소를 복사했어요.')).catch(() => {}); }}
                className="shrink-0 text-[14px] font-semibold text-[#3180F7]"
              >
                복사
              </button>
            </div>

            {/* 바로 하기 — 전화 · 길찾기 · 공유 */}
            <div className="grid grid-cols-3 gap-2 border-t border-[#F2F4F6] py-5">
              {[
                ...(hospital.phone ? [{ label: '전화하기', onClick: () => { window.location.href = `tel:${hospital.phone.replace(/[^0-9+]/g, '')}`; } }] : []),
                { label: '길찾기', onClick: () => window.open(`https://map.naver.com/p?q=${encodeURIComponent(hospital.address || hospital.name)}`, '_blank') },
                { label: '공유하기', onClick: share },
              ].map(btn => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={btn.onClick}
                  className="flex h-12 items-center justify-center rounded-[12px] border border-[#E5E8EB] text-[14px] font-semibold text-[#333D4B] transition-colors active:bg-[#F7F8FA]"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        {/* 칸 나눔 — 회색 띠 */}
        <div className="h-2.5 bg-[#F2F4F6]" />

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

        {/* ─── 병원 소개 · 오시는 길 — 상품 상세 '병원 정보'와 같은 결: 22 굵은 제목 · 가는 테두리 둥근 칸(16) ─── */}
        <div ref={sectionRefs.intro} className="bg-white px-5 py-7">
          <h2 className="text-[22px] font-bold leading-tight text-[#191F28]">병원 소개</h2>
          <Reveal>
            {hospital.introduction ? (
              <p className="mt-4 whitespace-pre-line text-[16px] leading-[1.7] text-[#333D4B]">{hospital.introduction}</p>
            ) : (
              <p className="mt-4 text-[15px] text-[#8B95A1]">등록된 소개가 없어요.</p>
            )}
          </Reveal>
          <Reveal>
            <h3 className="mt-8 text-[17px] font-bold text-[#191F28]">오시는 길</h3>
            <div className="relative mt-3 aspect-[16/10] overflow-hidden rounded-[16px] border border-[#E5E8EB]">
              <NaverMap address={hospital.address} lat={hospital.lat} lng={hospital.lng} name={hospital.name} />
            </div>
            <p className="mt-3 text-[15px] leading-[1.5] text-[#191F28]">{hospital.address}</p>
            {hospital.addressDetail && <p className="mt-1.5 whitespace-pre-line rounded-[12px] bg-[#F7F8FA] px-4 py-3 text-[14px] leading-[1.6] text-[#4E5968]">{hospital.addressDetail}</p>}
          </Reveal>
        </div>

        {/* ─── 상품 — 카드 폭 = 상품 목록 두 칸 그리드 한 칸(양옆 10 · 사이 10) ─── */}
        {hospitalProducts.length > 0 && (
          <>
            <div className="h-2.5 bg-[#F2F4F6]" />
            <div className="bg-white px-4 py-7">
              <h2 className="mb-5 px-1 text-[22px] font-bold leading-tight text-[#191F28]">상품 <span className="text-[#3180F7]">{hospitalProducts.length}</span></h2>
              <div className="-mx-1.5 flex snap-x gap-2.5 overflow-x-auto scroll-px-2.5 px-2.5 hide-scrollbar">
                {hospitalProducts.map((p, i) => (
                  <div key={p.id} className="w-[calc((min(100vw,640px)-30px)/2)] shrink-0 snap-start">
                    <ProductCard product={p} index={i} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ─── 의료진 — 테두리 둥근 칸 안 줄 ─── */}
        <div className="h-2.5 bg-[#F2F4F6]" />
        <div ref={sectionRefs.doctors} className="bg-white px-5 py-7">
          <h2 className="text-[22px] font-bold leading-tight text-[#191F28]">의료진 {hospital.doctors.length > 0 && <span className="text-[#3180F7]">{hospital.doctors.length}</span>}</h2>
          <Reveal>
            {hospital.doctors.length > 0 ? (
              <div className="mt-5 divide-y divide-[#F2F4F6] rounded-[16px] border border-[#E5E8EB] px-4">
                {hospital.doctors.map(d => (
                  <Link key={d.id} href={`/doctor/${d.id}`} className="flex items-center gap-3 py-3.5 transition-opacity active:opacity-70">
                    <Avatar src={d.profileImage} role="doctor" seed={d.name} size={48} alt={d.name} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-medium text-[#191F28]">{d.name} <span className="text-[14px] text-[#6B7684]">{d.isOwner ? '대표원장' : d.title || '원장'}</span></p>
                      {d.specialty && <p className="mt-0.5 truncate text-[14px] text-[#8B95A1]">{d.specialty}</p>}
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-[#B0B8C1]" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-[15px] text-[#8B95A1]">등록된 의료진이 없어요.</p>
            )}
          </Reveal>
        </div>

        {/* ─── 진료 시간 — 오늘 줄을 위에 크게, 아래는 요일별 두 칸 줄(가는 선) ─── */}
        <div className="h-2.5 bg-[#F2F4F6]" />
        <div ref={sectionRefs.hours} className="bg-white px-5 py-7">
          <h2 className="text-[22px] font-bold leading-tight text-[#191F28]">진료 시간</h2>
          <Reveal>
            <div className="mt-5 rounded-[16px] bg-[#F7F8FA] px-5 py-4">
              <p className="text-[13px] font-semibold text-[#8B95A1]">오늘 · {WEEK_DAYS[todayIdx].name}</p>
              <p className="mt-1 text-[22px] font-bold tracking-[-0.4px] text-[#191F28]">{!todayHours || todayHours.isClosed ? '휴진' : `${todayHours.startTime} – ${todayHours.endTime}`}</p>
            </div>
            <dl className="mt-4">
              {[1, 2, 3, 4, 5, 6, 0].map((idx, i) => {
                const d = WEEK_DAYS[idx];
                const oh = hospital.operatingHours.find(o => o.day === d.short || o.day === d.name);
                const today = idx === todayIdx;
                const closed = !oh || oh.isClosed;
                return (
                  <div key={d.short} className={`flex items-center justify-between py-3 text-[15px] ${i > 0 ? 'border-t border-[#F2F4F6]' : ''}`}>
                    <dt className={today ? 'font-semibold text-[#191F28]' : idx === 0 || idx === 6 ? 'text-[#8B95A1]' : 'text-[#6B7684]'}>{d.name}</dt>
                    <dd className={`tabular-nums ${closed ? 'text-[#B0B8C1]' : today ? 'font-semibold text-[#191F28]' : 'text-[#333D4B]'}`}>{closed ? '휴진' : `${oh!.startTime} – ${oh!.endTime}`}</dd>
                  </div>
                );
              })}
            </dl>
            {hospital.holidayNotice && (
              <p className="mt-3 flex items-start gap-2 rounded-[12px] bg-[#F7F8FA] px-4 py-3 text-[14px] leading-[1.5] text-[#4E5968]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="9" stroke="#8B95A1" strokeWidth="1.8" /><path d="M12 8v5M12 16.5v.01" stroke="#8B95A1" strokeWidth="1.8" strokeLinecap="round" /></svg>
                {hospital.holidayNotice.replace(/^\*/, '')}
              </p>
            )}
            <p className="mt-3 text-[13px] leading-[1.5] text-[#B0B8C1]">진료 시간은 병원 사정에 따라 바뀔 수 있어요.</p>
          </Reveal>
        </div>

        {/* ─── 리뷰 ─── */}
        <div className="h-2.5 bg-[#F2F4F6]" />
        <div ref={sectionRefs.reviews} className="bg-white px-5 py-7">
          <h2 className="mb-5 text-[22px] font-bold leading-tight text-[#191F28]">리뷰</h2>
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
