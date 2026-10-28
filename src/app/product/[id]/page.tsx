'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Share2, ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react';
import NaverMap from '@/components/common/NaverMap';
import Avatar from '@/components/common/Avatar';
import ProductCard from '@/components/common/ProductCard';
import { BRAND, Reveal, StarRating, SectionHead, IconTile, FloatingReviewCards, ReviewCommentRow, ExpandRow, type ReviewRowData } from '@/components/detail/DetailKit';
import { useStore } from '@/store';
import { resolveHospitalImageUrl, resolveProductImageUrl } from '@/lib/images';

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

const DAY_INDEX: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };

/** 지금 진료 상태 한 줄(휴진·진료 전·종료) — 진료 중이면 null */
function closedNotice(hours: { day: string; startTime?: string; endTime?: string; isClosed?: boolean }[]) {
  const now = new Date();
  const today = hours.find(oh => DAY_INDEX[oh.day] === now.getDay());
  if (!today) return null;
  if (today.isClosed) {
    const next = hours.find(oh => DAY_INDEX[oh.day] > now.getDay() && !oh.isClosed) || hours.find(oh => !oh.isClosed);
    return `오늘은 휴진이에요${next ? ` · ${next.day}요일 ${next.startTime}부터 진료해요` : ''}`;
  }
  const t = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = (today.startTime || '09:00').split(':').map(Number);
  const [eh, em] = (today.endTime || '18:00').split(':').map(Number);
  if (t < sh * 60 + sm) return `아직 진료 전이에요 · ${today.startTime}부터 진료해요`;
  if (t > eh * 60 + em) return '오늘 진료가 끝났어요';
  return null;
}

type SectionId = 'desc' | 'info' | 'reviews';
const SECTION_TABS: { id: SectionId; label: string }[] = [
  { id: 'desc', label: '상품 설명' },
  { id: 'info', label: '병원 정보' },
  { id: 'reviews', label: '리뷰' },
];
/** 고정 머리(60) + 섹션 탭(52) */
const STICKY_OFFSET = 116;

// 상품 상세 — 프리티풀 사회자 상세(pros/[id]) 결 그대로:
//  둥근 떠 있는 머리 → 스크롤하면 썸네일+제목 흰 머리 · 왼쪽 정렬 사진 넘기기(44 라운드, 옆 사진 작게) · 반짝 별점 + 둥실 리뷰 카드 ·
//  회색 트랙 흰 알약 섹션 탭(스크롤 따라 이동) · 아이콘 섹션 머리 · 댓글형 리뷰 · 0fr→1fr FAQ · 흐림 바닥 버튼.
export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { products, hospitals, reviews, wishlist, toggleWishlist, addRecentlyViewed, showToast, user } = useStore();
  const [activeImage, setActiveImage] = useState(0);
  const [headerSolid, setHeaderSolid] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('desc');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [heartAnim, setHeartAnim] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const sectionRefs = { desc: useRef<HTMLDivElement>(null), info: useRef<HTMLDivElement>(null), reviews: useRef<HTMLDivElement>(null) };

  const product = products.find(p => p.id === params.id);
  const hospital = hospitals.find(h => h.id === product?.hospitalId);
  const productReviews = reviews.filter(r => r.productId === product?.id);

  useEffect(() => {
    if (product) addRecentlyViewed(product.id);
  }, [product, addRecentlyViewed]);

  useEffect(() => {
    const onScroll = () => {
      setHeaderSolid(window.scrollY > 280);
      let current: SectionId = 'desc';
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

  if (!product) {
    // 첫 진입(목록이 아직 안 왔을 때)엔 '없음' 대신 뼈대
    if (products.length === 0) {
      return (
        <div className="min-h-screen bg-white px-[18px] pt-[74px]">
          <div className="aspect-square w-[min(78vw,420px)] animate-pulse rounded-[44px] bg-[#F2F4F6]" />
          <div className="mt-8 h-4 w-28 animate-pulse rounded-full bg-[#F2F4F6]" />
          <div className="mt-3 h-6 w-56 animate-pulse rounded-full bg-[#F2F4F6]" />
          <div className="mt-4 h-7 w-40 animate-pulse rounded-full bg-[#F2F4F6]" />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[15px] text-[#8B95A1]">상품을 찾을 수 없어요.</p>
      </div>
    );
  }

  const reviewCount = productReviews.length;
  const rating = reviewCount > 0 ? productReviews.reduce((s, r) => s + r.rating, 0) / reviewCount : product.rating;
  const productImageUrl = resolveProductImageUrl(product.imageUrl, product.id);
  const detailImageUrl = product.detailImageUrl ? resolveProductImageUrl(product.detailImageUrl, product.id) : null;
  const hospitalImageUrl = hospital ? resolveHospitalImageUrl(hospital) : undefined;
  const images = Array.from(new Set([productImageUrl, ...(detailImageUrl ? [detailImageUrl] : []), ...(hospital?.coverImages || [])])).slice(0, 8);
  const isWished = wishlist.includes(product.id);
  const verified = product.rating >= 4.8;
  const notice = hospital ? closedNotice(hospital.operatingHours) : null;
  const sameHospital = products.filter(p => p.hospitalId === product.hospitalId && p.id !== product.id);
  const alsoViewed = (sameHospital.length > 0 ? sameHospital : products.filter(p => p.category === product.category && p.id !== product.id)).slice(0, 10);
  const reviewRows: ReviewRowData[] = productReviews.map(r => ({
    id: r.id,
    name: r.authorName,
    avatarSeed: r.authorId || r.authorName,
    rating: r.rating,
    date: r.date,
    content: r.content,
    meta: [r.treatmentName, r.totalCost ? `${r.totalCost.toLocaleString()}원` : '', r.treatmentDate].filter(Boolean).join(' · '),
    photos: [r.beforeImage ? { src: r.beforeImage, label: '전' } : null, r.afterImage ? { src: r.afterImage, label: '후' } : null].filter(Boolean) as { src: string; label: string }[],
  }));
  const todayHours = hospital?.operatingHours.find(oh => DAY_INDEX[oh.day] === new Date().getDay());
  const infoRows = hospital ? [
    { icon: '/icons/pro-detail/notice.svg', label: '위치', value: hospital.location || hospital.address.split(' ').slice(0, 2).join(' ') },
    { icon: '/icons/pro-detail/clock.svg', label: '오늘 진료', value: !todayHours ? '-' : todayHours.isClosed ? '휴진' : `${todayHours.startTime}~${todayHours.endTime}` },
    { icon: '/icons/pro-detail/person.svg', label: '의료진', value: `${hospital.doctors.length}명` },
    ...(hospital.phone ? [{ icon: '/icons/pro-detail/chat.svg', label: '전화', value: hospital.phone }] : []),
  ] : [];

  const share = () => {
    if (navigator.share) navigator.share({ title: product.title, url: window.location.href }).catch(() => {});
    else { navigator.clipboard.writeText(window.location.href); showToast('링크가 복사되었어요.'); }
  };
  const wish = () => {
    if (!user) { window.dispatchEvent(new Event('dental:login')); return; }
    toggleWishlist(product.id);
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
  };
  const scrollToSection = (id: SectionId) => {
    const el = sectionRefs[id].current;
    const offset = STICKY_OFFSET + (window.innerWidth >= 1024 ? 12 : 0);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset + 2, behavior: 'smooth' });
  };
  const cardStep = () => {
    const el = galleryRef.current;
    return el ? Math.min(el.clientWidth * 0.78, 420) + 12 : 1;
  };
  const activeIdx = SECTION_TABS.findIndex(t => t.id === activeSection);
  const roundBtn = (solid: boolean) => `flex h-9 w-9 shrink-0 items-center justify-center transition-all active:scale-90 ${solid ? 'text-[#191F28]' : 'rounded-full bg-white/90 shadow-sm backdrop-blur-md'}`;

  const buttons = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(`/booking?productId=${product.id}`)}
        className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-[#F2F4F6] text-[16.5px] font-bold text-[#333D4B] transition-all active:scale-[0.99]"
      >
        예약하기
      </button>
      <button
        type="button"
        onClick={() => router.push(`/booking?productId=${product.id}&payment=app`)}
        className="flex h-14 flex-[1.6] items-center justify-center rounded-2xl text-[16.5px] font-bold text-white transition-all active:scale-[0.99]"
        style={{ backgroundColor: BRAND }}
      >
        앱결제로 예약하기
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 112px), 128px)' }}>
      {/* ─── 머리 — 떠 있는 둥근 버튼 → 스크롤하면 썸네일 + 제목 흰 머리 ─── */}
      <div
        className={`fixed left-0 right-0 top-0 z-40 flex items-center gap-2 transition-all duration-300 min-[1024px]:hidden ${headerSolid ? 'h-[60px] bg-white px-3' : 'justify-between px-4 pb-3 pt-3'}`}
      >
        <button type="button" aria-label="뒤로" onClick={() => router.back()} className={roundBtn(headerSolid)}>
          <ChevronLeft size={22} className="text-[#191F28]" />
        </button>
        <div
          className={`flex min-w-0 flex-1 items-center gap-2.5 transition-all duration-300 ${headerSolid ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          style={{ transform: headerSolid ? 'translateY(0)' : 'translateY(6px)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImageUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
          <p className="min-w-0 flex-1 truncate text-[13px] font-bold leading-tight text-[#191F28]">{product.title}</p>
        </div>
        <div className={`flex shrink-0 items-center gap-2 ${headerSolid ? '' : 'ml-auto'}`}>
          <button type="button" aria-label={isWished ? '찜 해제' : '찜하기'} onClick={wish} className={roundBtn(headerSolid)}>
            <Heart size={19} className={heartAnim ? 'heart-pop' : undefined} style={{ color: isWished ? '#F04452' : '#191F28' }} fill={isWished ? '#F04452' : 'none'} />
          </button>
          <button type="button" aria-label="공유" onClick={share} className={roundBtn(headerSolid)}>
            <Share2 size={18} className="text-[#191F28]" />
          </button>
        </div>
      </div>

      <div>
        <div className="min-w-0">
          {/* ─── 사진 넘기기 — 왼쪽 정렬 + 옆 사진 살짝 보임 + 넘기면 작아짐 ─── */}
          <div className="overflow-hidden pt-[74px] min-[1024px]:pt-6">
            <div
              ref={galleryRef}
              onScroll={e => {
                const idx = Math.round(e.currentTarget.scrollLeft / cardStep());
                const clamped = Math.max(0, Math.min(images.length - 1, idx));
                if (clamped !== activeImage) setActiveImage(clamped);
              }}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[18px] hide-scrollbar"
              style={{ scrollPaddingLeft: 18 }}
            >
              {images.map((src, i) => (
                <button
                  type="button"
                  key={src}
                  onClick={() => setImageModal(src)}
                  className="relative shrink-0 snap-start overflow-hidden rounded-[44px] bg-[#F2F4F6] transition-transform duration-300 ease-out"
                  style={{ width: 'min(78vw, 420px)', aspectRatio: '1 / 1', transform: `scale(${i === activeImage ? 1 : 0.9})` }}
                >
                  {Math.abs(i - activeImage) <= 1 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={product.title} className="h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
                  ) : null}
                </button>
              ))}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex justify-center gap-1.5">
                {images.map((src, i) => (
                  <button
                    type="button"
                    key={src}
                    aria-label={`${i + 1}번째 사진`}
                    onClick={() => galleryRef.current?.scrollTo({ left: i * cardStep(), behavior: 'smooth' })}
                    className="rounded-full transition-colors duration-300"
                    style={{ width: 6, height: 6, backgroundColor: i === activeImage ? '#191F28' : '#D5DAE0' }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ─── 이름 · 가격 · 별점 ─── */}
          <div className="bg-white px-5 py-6">
            <Reveal>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <Link href={`/hospital/detail/${product.hospitalId}`} className="min-w-0 truncate text-[14px] font-semibold text-[#6B7684]">
                  {product.hospitalName}
                </Link>
                {verified && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#F2F4F6] px-2.5 py-1 text-[11px] font-bold text-[#4E5968]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/brand-logo.png" alt="" width={14} height={14} className="shrink-0" />
                    인증 병원
                  </span>
                )}
              </div>
              <h1 className="break-keep text-[20px] font-bold leading-[1.4] text-[#191F28]">{product.title}</h1>
              <div className="mt-3">
                {product.originalPrice && product.originalPrice > product.price && (
                  <p className="text-[14px] text-[#B0B8C1] line-through">{product.originalPrice.toLocaleString()}원</p>
                )}
                <p className="flex items-baseline gap-1.5 font-bold tracking-[-0.5px]">
                  {(product.discount ?? 0) > 0 && <span className="text-[24px] text-[#F04452]">{product.discount}%</span>}
                  <span className="text-[24px] text-[#191F28]">{product.price.toLocaleString()}원</span>
                  <span className="ml-0.5 text-[13px] font-medium text-[#8B95A1]">VAT 포함</span>
                </p>
              </div>
              {product.tags.length > 0 && (
                <div className="mb-1 mt-3 flex flex-wrap gap-1.5">
                  {product.tags.map(t => (
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

            {product.options && product.options.length > 0 && (
              <Reveal delay={150}>
                <div className="mt-4 pt-4">
                  <SectionHead title="옵션" icon="/icons/pro-detail/check.svg" size="sm" className="mb-1.5" />
                  <ul className="divide-y divide-[#F2F4F6]">
                    {product.options.map(o => (
                      <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-[14px] font-semibold text-[#333D4B]">{o.name}</span>
                        <span className="shrink-0 text-[14px] font-bold text-[#191F28]">{o.price.toLocaleString()}원</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}
          </div>

          {/* ─── 섹션 탭 — 회색 트랙 + 흰 알약이 미끄러진다 ─── */}
          <div className="sticky top-[60px] z-30 min-[1024px]:top-[72px] mt-4 bg-white px-4 pb-2 pt-1">
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

          {/* ─── 상품 설명 ─── */}
          <div ref={sectionRefs.desc} className="bg-white px-5 py-6">
            <Reveal>
              <SectionHead title="상품 설명" icon="/icons/pro-detail/document.svg" className="mb-4" />
            </Reveal>
            {detailImageUrl && (
              <Reveal delay={60}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={detailImageUrl} alt={`${product.title} 상세 이미지`} className="mb-5 w-full rounded-[20px] object-cover" />
              </Reveal>
            )}
            {product.description?.trim() ? (
              <p className="whitespace-pre-wrap break-words text-[16px] leading-[1.7] text-[#333D4B]">{product.description}</p>
            ) : !detailImageUrl && (
              <p className="text-[14px] text-[#8B95A1]">등록된 상품 설명이 없어요.</p>
            )}
          </div>

          {/* ─── 다른 상품 ─── */}
          {alsoViewed.length > 0 && (
            <div className="px-4 pb-4 pt-8">
              <Reveal>
                <h3 className="mb-4 text-[20px] font-bold leading-tight text-[#191F28]">
                  {sameHospital.length > 0 ? <>이 병원의 다른<br />상품을 살펴보세요</> : <>마이닥의 다른<br />인기 상품을 살펴보세요</>}
                </h3>
              </Reveal>
              <div className="flex snap-x gap-3 overflow-x-auto pr-4 hide-scrollbar">
                {alsoViewed.map((p, i) => (
                  <div key={p.id} className="w-[150px] shrink-0 snap-start">
                    <ProductCard product={p} index={i} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── 병원 정보 ─── */}
          <div ref={sectionRefs.info} className="bg-white px-5 py-6">
            <SectionHead title="병원 정보" icon="/icons/pro-detail/certification.svg" className="mb-5" />
            {hospital ? (
              <>
                <Link href={`/hospital/detail/${hospital.id}`} className="mb-2 flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hospitalImageUrl} alt="" className="h-[60px] w-[60px] rounded-[14px] bg-[#F2F4F6] object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-[#191F28]">{hospital.name}</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <StarRating value={Number(hospital.rating.toFixed(1))} size={12} />
                      <span className="text-[12px] font-bold text-[#191F28]">{hospital.rating.toFixed(1)}</span>
                      <span className="text-[12px] text-[#8B95A1]">({hospital.reviewCount})</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
                </Link>
                <div className="divide-y divide-[#F2F4F6]">
                  {infoRows.map(row => (
                    <div key={row.label} className="flex items-center gap-3 py-3">
                      <IconTile src={row.icon} />
                      <span className="text-[13px] text-[#8B95A1]">{row.label}</span>
                      <span className="ml-auto min-w-0 truncate text-[14px] font-bold text-[#191F28]">{row.value}</span>
                    </div>
                  ))}
                </div>

                {hospital.introduction && (
                  <div className="mt-6">
                    <SectionHead title="병원 소개" icon="/icons/pro-detail/sparkle.svg" size="sm" className="mb-2" />
                    <p className="whitespace-pre-line text-[15px] leading-[1.7] text-[#4E5968]">{hospital.introduction}</p>
                  </div>
                )}

                <div className="mt-6">
                  <SectionHead title="진료 시간" icon="/icons/pro-detail/clock.svg" size="sm" className="mb-2" />
                  {hospital.holidayNotice && <p className="mb-2 text-[13px] font-semibold text-[#F04452]">{hospital.holidayNotice}</p>}
                  <ul className="divide-y divide-[#F2F4F6]">
                    {hospital.operatingHours.map(oh => {
                      const today = DAY_INDEX[oh.day] === new Date().getDay();
                      return (
                        <li key={oh.day} className="flex items-center justify-between py-2.5 text-[14px]">
                          <span className={today ? 'font-bold text-[#191F28]' : 'font-semibold text-[#6B7684]'}>{oh.day}요일{today && <span className="ml-1.5 rounded-[5px] bg-[#E8F3FF] px-1.5 py-0.5 text-[11px] font-bold" style={{ color: BRAND }}>오늘</span>}</span>
                          <span className={oh.isClosed ? 'text-[#B0B8C1]' : today ? 'font-bold text-[#191F28]' : 'text-[#4E5968]'}>{oh.isClosed ? '휴진' : `${oh.startTime} ~ ${oh.endTime}`}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

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

                {hospital.doctors.length > 0 && (
                  <div className="mt-6">
                    <SectionHead title="의료진" icon="/icons/pro-detail/person.svg" size="sm" className="mb-1" />
                    <div className="divide-y divide-[#F2F4F6]">
                      {hospital.doctors.map(d => (
                        <Link key={d.id} href={`/doctor/${d.id}`} className="flex items-center gap-3 py-3 transition-opacity active:opacity-70">
                          <Avatar src={d.profileImage} role="doctor" seed={d.name} size={48} alt={d.name} className="shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-bold text-[#191F28]">{d.name} {d.isOwner ? '대표원장' : d.title || '원장'}</p>
                            {d.specialty && <p className="mt-0.5 truncate text-[13px] text-[#8B95A1]">{d.specialty}</p>}
                          </div>
                          <ChevronRight size={18} className="shrink-0 text-[#B0B8C1]" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="py-6 text-center text-[14px] text-[#8B95A1]">병원 정보가 없어요.</p>
            )}
          </div>

          {/* ─── 리뷰 ─── */}
          <div ref={sectionRefs.reviews} className="bg-white px-5 py-6">
            <SectionHead title="리뷰" icon="/icons/pro-detail/eyes.svg" className="mb-4" />
            <div className="mb-3 flex items-center gap-2">
              <StarRating value={Number(rating.toFixed(1))} size={20} />
              <span className="text-[24px] font-bold text-[#191F28]">{rating.toFixed(1)}</span>
              <span className="text-[14px] text-[#8B95A1]">({reviewCount})</span>
            </div>
            <h3 className="mb-1 mt-5 text-[16px] font-bold text-[#191F28]">전체 리뷰 {reviewCount}건</h3>
            {reviewRows.length > 0 ? (
              reviewRows.map((r, i) => (
                <ReviewCommentRow key={r.id} review={r} first={i === 0} menu={<ReviewMenu reviewId={r.id} authorName={r.name} />} />
              ))
            ) : (
              <p className="py-8 text-center text-[14px] text-[#8B95A1]">아직 작성된 리뷰가 없어요.</p>
            )}
          </div>

          {/* ─── 자주 묻는 질문 ─── */}
          <div className="bg-white px-5 py-6">
            <SectionHead title="자주 묻는 질문" icon="/icons/pro-detail/bulb.svg" className="mb-1" />
            {faqItems.map((faq, i) => (
              <ExpandRow key={faq.question} label={faq.question} open={expandedFaq === i} onToggle={() => setExpandedFaq(expandedFaq === i ? null : i)}>
                {faq.answer}
              </ExpandRow>
            ))}
          </div>
        </div>

      </div>

      {/* ─── 바닥 버튼 — 흐림 띠 위에 떠 있다 ─── */}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-40"
        style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, white 30%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0) 100%)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            maskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
          }}
        />
        <div className="pointer-events-auto relative mx-auto max-w-[680px] pt-10">
          {notice && (
            <p className="mx-auto mb-2.5 w-fit rounded-full bg-[#333D4B]/90 px-3.5 py-1.5 text-[12.5px] font-semibold text-white backdrop-blur-md">{notice}</p>
          )}
          {buttons}
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

function ReviewMenu({ reviewId, authorName }: { reviewId: string; authorName: string }) {
  const [open, setOpen] = useState(false);
  const { showToast, showModal } = useStore();
  const items = [
    { icon: '/icons/toss/siren.svg', label: '신고하기', run: () => showModal('리뷰를 신고할까요?', '부적절한 리뷰는 검토 후 조치돼요.', () => showToast('리뷰를 신고했어요.')) },
    { icon: '/icons/toss/user-blocked.svg', label: '차단하기', run: () => showModal(`${authorName}님을 차단할까요?`, '차단한 사람의 리뷰는 더 이상 보이지 않아요.', () => showToast(`${authorName}님을 차단했어요.`)) },
  ];

  // 리뷰 ⋯ — 프리티풀 툴팁 메뉴(작게→정비율로 커지고 항목은 오른쪽→왼쪽 촤라락)
  return (
    <div className="relative" data-review={reviewId}>
      <button type="button" onClick={() => setOpen(!open)} aria-label="리뷰 메뉴" className="-mr-1 -mt-0.5 flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-[#F2F4F6]">
        <MoreHorizontal size={18} className="text-[#8B95A1]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="pop-menu absolute right-0 top-8 z-50" style={{ transformOrigin: 'top right' }}>
            {items.map((item, i) => (
              <button
                type="button"
                key={item.label}
                className="pop-menu-item"
                style={{ animationDelay: `${0.07 + i * 0.035}s` }}
                onClick={() => { setOpen(false); item.run(); }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.icon} alt="" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
