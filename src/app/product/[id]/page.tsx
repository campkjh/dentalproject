'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PocketIcon } from '@/components/icons/PocketIcon';
import { Share2, ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal, X } from 'lucide-react';
import NaverMap from '@/components/common/NaverMap';
import Avatar from '@/components/common/Avatar';
import ProductCard from '@/components/common/ProductCard';
import ReviewShowcase from '@/components/product/ReviewShowcase';
import ReviewSummaryCard, { useReviewSummary } from '@/components/product/ReviewSummaryCard';
import { BRAND, Reveal, StarRating, SingleStar, SectionHead, ReviewCommentRow, ExpandRow, type ReviewRowData } from '@/components/detail/DetailKit';
import { useStore } from '@/store';
import { toneAccent, useImageTone } from '@/lib/image-tone';
import { resolveHospitalImageUrl, resolveProductImageUrl } from '@/lib/images';
import TossBubble from '@/components/common/TossBubble';

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

/** 후기 작성 적립(api/reviews 가 주는 500P) — 상품 상세 '최대 N P 적립' 줄 */
const REVIEW_POINT = 500;

/** 옵션 정보 체크 줄 — 데이터로 확인되는 것만(가격은 VAT 포함가, 앱결제·후기 적립은 모든 상품 공통) */
const OPTION_CHECKS = [
  { label: 'VAT', value: '포함' },
  { label: '앱결제', value: '가능' },
  { label: '후기 작성 시', value: `${REVIEW_POINT}P 적립` },
];

/** 적립 줄 앞 동전 두 개(노랑 뒤 · 주황 P 앞) — 견본 아이콘 */
function PointCoin() {
  return (
    <svg width="34" height="24" viewBox="0 0 34 24" aria-hidden className="shrink-0">
      <circle cx="11" cy="12" r="10" fill="#FFD66B" />
      <circle cx="21" cy="12" r="10" fill="#F2652E" stroke="#fff" strokeWidth="1.5" />
      <path d="M18 7.5h3.6a2.9 2.9 0 0 1 0 5.8H19.6V16.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 요일 표 순서(월→일) */
const WEEK_ORDER = ['월', '화', '수', '목', '금', '토', '일'];

/** 바로 하기 버튼 아이콘(선 1.8 · 22) */
function QuickIcon({ name }: { name: 'phone' | 'map' | 'home' }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: '#4E5968', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'phone') return <svg {...p}><path d="M5 4h3.2l1.6 4-2 1.3a11 11 0 0 0 6.9 6.9l1.3-2 4 1.6V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>;
  if (name === 'map') return <svg {...p}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></svg>;
  return <svg {...p}><path d="M4 10.3L12 4l8 6.3V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19z" /><path d="M9.5 20.5v-5h5v5" /></svg>;
}

/** 병원 소개 — 4줄까지, 넘치면 '더보기' */
function IntroText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 140 || text.split('\n').length > 4;
  return (
    <div className="mt-2.5">
      <p className={`whitespace-pre-line text-[15px] leading-[1.7] text-[#4E5968] ${open || !long ? '' : 'line-clamp-4'}`}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen(v => !v)} className="mt-1.5 text-[14px] font-semibold text-[#6B7684]">
          {open ? '접기' : '더보기'}
        </button>
      )}
    </div>
  );
}

type SectionId = 'desc' | 'info' | 'reviews';
const SECTION_TABS: { id: SectionId; label: string }[] = [
  { id: 'desc', label: '상품 정보' },
  { id: 'info', label: '병원 정보' },
  { id: 'reviews', label: '시술 후기' },
];
/** 고정 머리(60) + 섹션 탭(52) */
const STICKY_OFFSET = 116;

// 상품 상세 — 프리티풀 사회자 상세(pros/[id]) 결 그대로:
//  둥근 떠 있는 머리 → 스크롤하면 썸네일+제목 흰 머리 · 왼쪽 정렬 사진 넘기기(44 라운드, 옆 사진 작게) · 반짝 별점 + 둥실 리뷰 카드 ·
//  회색 트랙 흰 알약 섹션 탭(스크롤 따라 이동) · 아이콘 섹션 머리 · 댓글형 리뷰 · 0fr→1fr FAQ · 흐림 바닥 버튼.
export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { products, hospitals, reviews, categories, wishlist, toggleWishlist, addRecentlyViewed, showToast, user } = useStore();
  const [activeImage, setActiveImage] = useState(0);
  const [headerSolid, setHeaderSolid] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('desc');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [heartAnim, setHeartAnim] = useState(false);
  const [pointOpen, setPointOpen] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const sectionRefs = { desc: useRef<HTMLDivElement>(null), info: useRef<HTMLDivElement>(null), reviews: useRef<HTMLDivElement>(null) };

  const product = products.find(p => p.id === params.id);
  // 후기 요약(실제 후기 2건 이상일 때만) — 프리티풀 스타일 소개 카드
  const reviewSummary = useReviewSummary(product?.id, reviews.filter(r => r.productId === product?.id).length);
  // 담은 가방 색 = 대표 사진 색(카드와 같은 계산)
  const productTone = useImageTone(product ? resolveProductImageUrl(product.imageUrl, product.id) : null, 'square');
  const pocketColor = toneAccent(productTone) || '#6B7684';
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
  // 옵션 줄 — 옵션이 없으면 상품 자체가 옵션 1. 옵션 정가는 상품 할인율로 되짚는다(정가가 따로 없어서)
  const baseDiscount = product.discount ?? (product.originalPrice && product.originalPrice > product.price ? Math.round((1 - product.price / product.originalPrice) * 100) : 0);
  const optionRows = (product.options && product.options.length > 0 ? product.options : [{ id: 'base', name: product.title, price: product.price }]).map(o => {
    const original = o.id === 'base' && product.originalPrice ? product.originalPrice : baseDiscount > 0 ? Math.round(o.price / (1 - baseDiscount / 100) / 100) * 100 : o.price;
    return { ...o, original, discount: original > o.price ? baseDiscount : 0 };
  });
  const tagChips = product.tags.map(t => t.replace(/^#/, '').trim()).filter(Boolean);
  const categoryName = categories.find(c => c.id === product.category)?.name;
  // 옵션 속성 줄 — 첫 칸(진료과)만 파랑, 나머지는 태그
  const optionAttrs = [categoryName, ...tagChips].filter(Boolean).slice(0, 5) as string[];

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
  // 머리 버튼 — 그림자 없이(사장 지시), 아이콘은 크게
  const roundBtn = (solid: boolean) => `flex h-11 w-11 shrink-0 items-center justify-center transition-all active:scale-90 ${solid ? 'text-[#191F28]' : 'rounded-full bg-white/90 backdrop-blur-md'}`;

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
        className="flex h-14 flex-1 items-center justify-center rounded-2xl text-[16.5px] font-bold text-white transition-all active:scale-[0.99]"
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
          <ChevronLeft size={28} strokeWidth={2.2} className="text-[#191F28]" />
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
          <button type="button" aria-label={isWished ? '포켓에서 빼기' : '포켓에 담기'} onClick={wish} className={roundBtn(headerSolid)}>
            <PocketIcon size={26} filled={isWished} strokeWidth={1.9} className={heartAnim ? 'heart-pop' : undefined} style={{ color: isWished ? pocketColor : '#191F28' }} />
          </button>
          <button type="button" aria-label="공유" onClick={share} className={roundBtn(headerSolid)}>
            <Share2 size={23} strokeWidth={2} className="text-[#191F28]" />
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

          {/* ─── 이름 · 별점 · 옵션 1 · 가격 · 적립 — 사장 견본(강남언니 상세 위 칸) 그대로, 선은 가는 회색 줄 ─── */}
          <div className="bg-white px-5 pb-2 pt-6">
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
              <h1 className="break-keep text-[20px] font-medium leading-[1.45] tracking-[-0.3px] text-[#191F28]">{product.title}</h1>
              <button type="button" onClick={() => scrollToSection('reviews')} className="mt-2.5 flex items-center gap-1 text-[15px] text-[#191F28]">
                <SingleStar size={19} />
                <span className="ml-0.5">{rating.toFixed(1)}</span>
                <span className="text-[#6B7684]">(<span className="underline underline-offset-2">{reviewCount}</span>)</span>
              </button>
              {tagChips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tagChips.map(t => (
                    <span key={t} className="rounded-full bg-[#F2F4F6] px-2.5 py-1 text-[13px] font-semibold text-[#4E5968]">#{t}</span>
                  ))}
                </div>
              )}
            </Reveal>

            <Reveal delay={80}>
              {/* 옵션 1 + 전체보기 */}
              <div className="mt-6 flex items-center gap-3 border-t border-[#F2F4F6] py-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] text-[#6B7684]">옵션 1</p>
                  <p className="mt-1 truncate text-[17px] font-medium text-[#191F28]">{optionRows[0].name}</p>
                  {optionAttrs.length > 0 && <p className="mt-1 truncate text-[14px] text-[#6B7684]">{optionAttrs.join(', ')}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection('desc')}
                  className="shrink-0 rounded-[12px] border border-[#D1D6DB] px-3.5 py-2.5 text-[14px] font-semibold text-[#191F28] transition-colors active:bg-[#F7F8FA]"
                >
                  전체보기
                </button>
              </div>

              {/* 가격 */}
              <div className="border-t border-[#F2F4F6] py-5">
                {optionRows[0].original > optionRows[0].price && (
                  <p className="text-[14px] text-[#8B95A1]"><span className="line-through">{optionRows[0].original.toLocaleString()}원</span> (VAT 포함)</p>
                )}
                <p className="mt-0.5 flex items-baseline gap-2 font-bold tracking-[-0.5px]">
                  {optionRows[0].discount > 0 && <span className="text-[26px] text-[#F04452]">{optionRows[0].discount}%</span>}
                  <span className="text-[26px] text-[#191F28]">{optionRows[0].price.toLocaleString()}원</span>
                  {!(optionRows[0].original > optionRows[0].price) && <span className="text-[13px] font-medium text-[#8B95A1]">VAT 포함</span>}
                </p>
              </div>

              {/* 적립 — 펼치면 적립 방법 */}
              <div className="border-t border-[#F2F4F6]">
                <button type="button" onClick={() => setPointOpen(v => !v)} aria-expanded={pointOpen} className="flex w-full items-center gap-2 py-5 text-left">
                  <PointCoin />
                  <span className="flex-1 text-[16px] font-semibold text-[#191F28]">최대 <span className="text-[#F04452]">{REVIEW_POINT.toLocaleString()}P</span> 적립</span>
                  <ChevronDown size={22} className="shrink-0 text-[#4E5968] transition-transform duration-300" style={{ transform: pointOpen ? 'rotate(180deg)' : undefined }} />
                </button>
                <div className="grid transition-all duration-500" style={{ gridTemplateRows: pointOpen ? '1fr' : '0fr', opacity: pointOpen ? 1 : 0, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
                  <div className="overflow-hidden">
                    <div className="mb-5 flex items-center justify-between rounded-[14px] bg-[#F7F8FA] px-4 py-3.5 text-[14px]">
                      <span className="text-[#4E5968]">시술 후 후기 작성</span>
                      <span className="font-bold text-[#191F28]">{REVIEW_POINT.toLocaleString()}P</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* 칸 나눔 — 회색 띠 */}
          <div className="h-2.5 bg-[#F2F4F6]" />

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
            {/* ─── 옵션 정보 — 사장 견본 그대로: 체크 줄 · 파란 안내 띠 · 번호 붙은 옵션 칸 ─── */}
            <Reveal>
              <h2 className="text-[22px] font-bold leading-tight text-[#191F28]">옵션 정보</h2>
              <ul className="mt-5 space-y-3">
                {OPTION_CHECKS.map(c => (
                  <li key={c.label} className="flex items-center gap-3 text-[17px] text-[#191F28]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0"><path d="M4.5 12.5l5 5 10-11" stroke="#4E5968" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span>{c.label}</span><b className="font-bold">{c.value}</b>
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-[12px] bg-[#EEF4FF] px-4 py-3.5 text-[14px] leading-[1.5] text-[#1B4FA8]">시술에 대한 정보는 참고 사항이며, 병원 방문 시 개인의 상태에 따라 달라질 수 있어요.</p>
            </Reveal>
            <div className="mt-5 space-y-4">
              {optionRows.map((o, i) => (
                <Reveal key={o.id} delay={i * 60}>
                  <div className="rounded-[16px] border border-[#E5E8EB] px-5 py-5">
                    <p className="flex gap-4 text-[17px] text-[#191F28]">
                      <span className="w-4 shrink-0 font-semibold text-[#8B95A1]">{i + 1}</span>
                      <span className="min-w-0 break-keep">{o.name}</span>
                    </p>
                    {optionAttrs.length > 0 && (
                      <p className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-8 text-[15px]">
                        {optionAttrs.map((attr, ai) => (
                          <span key={attr} className="flex items-center gap-1.5">
                            {ai > 0 && <span className="text-[#C9CED6]">/</span>}
                            <span className={ai === 0 ? 'text-[#1B4FA8]' : 'text-[#4E5968]'}>{attr}</span>
                          </span>
                        ))}
                      </p>
                    )}
                    <div className="mt-5 text-right">
                      {o.original > o.price && (
                        <p className="text-[14px] text-[#8B95A1]"><span className="line-through">{o.original.toLocaleString()}원</span> (VAT 포함)</p>
                      )}
                      <p className="mt-0.5 text-[20px] font-bold tracking-[-0.4px]">
                        {o.discount > 0 && <span className="mr-1.5 text-[#F04452]">{o.discount}%</span>}
                        <span className="text-[#333D4B]">{o.price.toLocaleString()}원</span>
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-10" />
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
                  <div key={p.id} className="w-[44vw] max-w-[220px] shrink-0 snap-start">
                    <ProductCard product={p} index={i} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── 병원 정보 — 옵션 정보와 같은 결: 22 굵은 제목 · 가는 테두리 둥근 칸(16) · 파란 안내 띠 · 사이는 회색 띠 ─── */}
          <div className="h-2.5 bg-[#F2F4F6]" />
          <div ref={sectionRefs.info} className="bg-white px-5 py-7">
            <h2 className="text-[22px] font-bold leading-tight text-[#191F28]">병원 정보</h2>
            {hospital ? (
              <>
                <Reveal>
                  <Link href={`/hospital/detail/${hospital.id}`} className="mt-5 flex items-center gap-3.5 rounded-[16px] border border-[#E5E8EB] p-4 transition-colors active:bg-[#F9FAFB]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hospitalImageUrl} alt="" className="h-[56px] w-[56px] shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-medium text-[#191F28]">{hospital.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-[14px] text-[#191F28]">
                        <SingleStar size={15} />
                        {hospital.rating.toFixed(1)}
                        <span className="text-[#6B7684]">(<span className="underline underline-offset-2">{hospital.reviewCount}</span>)</span>
                        {hospital.location && <span className="ml-1 min-w-0 truncate text-[#8B95A1]">· {hospital.location.split(' ').slice(0, 2).join(' ')}</span>}
                      </p>
                    </div>
                    <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
                  </Link>
                  {hospital.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {hospital.tags.slice(0, 6).map(t => (
                        <span key={t} className="rounded-full bg-[#F2F4F6] px-2.5 py-1 text-[13px] font-semibold text-[#4E5968]">#{t.replace(/^#/, '')}</span>
                      ))}
                    </div>
                  )}
                  {/* 바로 하기 — 전화 · 길찾기 · 병원 홈 */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      ...(hospital.phone ? [{ label: '전화하기', icon: 'phone', onClick: () => { window.location.href = `tel:${hospital.phone.replace(/[^0-9+]/g, '')}`; } }] : []),
                      { label: '길찾기', icon: 'map', onClick: () => window.open(`https://map.naver.com/p?q=${encodeURIComponent(hospital.address || hospital.name)}`, '_blank') },
                      { label: '병원 홈', icon: 'home', onClick: () => router.push(`/hospital/detail/${hospital.id}`) },
                    ].map(btn => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={btn.onClick}
                        className="flex h-12 items-center justify-center gap-1.5 rounded-[12px] border border-[#E5E8EB] text-[14px] font-semibold text-[#333D4B] transition-colors active:bg-[#F7F8FA]"
                      >
                        <QuickIcon name={btn.icon as 'phone' | 'map' | 'home'} />
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </Reveal>

                {hospital.introduction && (
                  <Reveal>
                    <h3 className="mt-8 text-[17px] font-bold text-[#191F28]">병원 소개</h3>
                    <IntroText text={hospital.introduction} />
                  </Reveal>
                )}

                <Reveal>
                  <h3 className="mt-8 text-[17px] font-bold text-[#191F28]">오시는 길</h3>
                  <div className="relative mt-3 aspect-[16/10] overflow-hidden rounded-[16px] border border-[#E5E8EB]">
                    <NaverMap address={hospital.address} lat={hospital.lat} lng={hospital.lng} name={hospital.name} />
                  </div>
                  <div className="mt-3 flex items-start gap-3">
                    <p className="min-w-0 flex-1 text-[15px] leading-[1.5] text-[#191F28]">{hospital.address}</p>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(hospital.address).then(() => showToast('주소를 복사했어요.')).catch(() => {}); }}
                      className="shrink-0 text-[14px] font-semibold text-[#3180F7]"
                    >
                      주소 복사
                    </button>
                  </div>
                  {hospital.addressDetail && <p className="mt-1.5 whitespace-pre-line rounded-[12px] bg-[#F7F8FA] px-4 py-3 text-[14px] leading-[1.6] text-[#4E5968]">{hospital.addressDetail}</p>}
                </Reveal>

                {hospital.doctors.length > 0 && (
                  <Reveal>
                    <h3 className="mt-8 text-[17px] font-bold text-[#191F28]">의료진 <span className="text-[#3180F7]">{hospital.doctors.length}</span></h3>
                    <div className="mt-3 divide-y divide-[#F2F4F6] rounded-[16px] border border-[#E5E8EB] px-4">
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
                  </Reveal>
                )}
              </>
            ) : (
              <p className="py-6 text-center text-[14px] text-[#8B95A1]">병원 정보가 없어요.</p>
            )}
          </div>

          {/* ─── 진료 시간 — 오늘 줄을 위에 크게, 아래는 요일별 두 칸 줄(가는 선). 상태 알약은 두지 않는다 ─── */}
          {hospital && (
            <>
              <div className="h-2.5 bg-[#F2F4F6]" />
              <div className="bg-white px-5 py-7">
                <h2 className="text-[22px] font-bold leading-tight text-[#191F28]">진료 시간</h2>
                <Reveal>
                  {(() => {
                    const todayDay = WEEK_ORDER.find(d => DAY_INDEX[d] === new Date().getDay())!;
                    const t = hospital.operatingHours.find(o => o.day === todayDay);
                    const closed = !t || t.isClosed;
                    return (
                      <div className="mt-5 rounded-[16px] bg-[#F7F8FA] px-5 py-4">
                        <div>
                          <p className="text-[13px] font-semibold text-[#8B95A1]">오늘 · {todayDay}요일</p>
                          <p className="mt-1 text-[22px] font-bold tracking-[-0.4px] text-[#191F28]">{closed ? '휴진' : `${t!.startTime} – ${t!.endTime}`}</p>
                        </div>
                      </div>
                    );
                  })()}
                  <dl className="mt-4">
                    {WEEK_ORDER.map((day, i) => {
                      const oh = hospital.operatingHours.find(o => o.day === day);
                      const today = DAY_INDEX[day] === new Date().getDay();
                      const closed = !oh || oh.isClosed;
                      return (
                        <div key={day} className={`flex items-center justify-between py-3 text-[15px] ${i > 0 ? 'border-t border-[#F2F4F6]' : ''}`}>
                          <dt className={today ? 'font-semibold text-[#191F28]' : day === '일' || day === '토' ? 'text-[#8B95A1]' : 'text-[#6B7684]'}>
                            {day}요일
                          </dt>
                          <dd className={`tabular-nums ${closed ? 'text-[#B0B8C1]' : today ? 'font-semibold text-[#191F28]' : 'text-[#333D4B]'}`}>
                            {closed ? '휴진' : `${oh!.startTime} – ${oh!.endTime}`}
                          </dd>
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
            </>
          )}
          <div className="h-2.5 bg-[#F2F4F6]" />
          {/* ─── 시술 후기 — 로그인해야 자세한 후기를 보여 준다(사장 견본). 로그인 전·후기 없음 = 프리티풀 비즈 '카드 3장' 예시 장면 ─── */}
          <div ref={sectionRefs.reviews} className="bg-white px-5 py-6">
            <h2 className="mb-5 text-[22px] font-bold leading-tight text-[#191F28]">시술 후기</h2>
            <ReviewSummaryCard summary={reviewSummary.value} loading={reviewSummary.loading} className="mb-5" />
            {!user ? (
              <ReviewShowcase mode="login" onLogin={() => window.dispatchEvent(new Event('dental:login'))} />
            ) : reviewRows.length === 0 ? (
              <ReviewShowcase mode="empty" writeHref={`/mypage/reviews/write?productId=${product.id}`} />
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <StarRating value={Number(rating.toFixed(1))} size={20} />
                  <span className="text-[24px] font-bold text-[#191F28]">{rating.toFixed(1)}</span>
                  <span className="text-[14px] text-[#8B95A1]">({reviewCount})</span>
                </div>
                <h3 className="mb-1 mt-5 text-[16px] font-bold text-[#191F28]">전체 후기 {reviewCount}건</h3>
                {reviewRows.map((r, i) => (
                  <ReviewCommentRow key={r.id} review={r} first={i === 0} menu={<ReviewMenu reviewId={r.id} authorName={r.name} />} />
                ))}
              </>
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
            <TossBubble key={notice} className="mx-auto mb-1.5">{notice}</TossBubble>
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
