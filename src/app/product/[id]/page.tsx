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
import { Reveal, StarRating, SingleStar, SectionHead, ReviewCommentRow, ExpandRow, type ReviewRowData } from '@/components/detail/DetailKit';
import { useStore } from '@/store';
import { toneAccent, useImageTone } from '@/lib/image-tone';
import { resolveHospitalImageUrl, resolveProductImageUrl } from '@/lib/images';
import MonoIcon from '@/components/common/MonoIcon';
import TossBubble, { BubbleClockIcon, BubbleMoonIcon } from '@/components/common/TossBubble';

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

/** 지금 진료 상태(휴진·진료 전·종료) — 진료 중이면 null. 말풍선 제목 + 다음 진료 한 줄 */
function closedNotice(hours: { day: string; startTime?: string; endTime?: string; isClosed?: boolean }[]): { kind: 'before' | 'off'; title: string; sub?: string } | null {
  const now = new Date();
  const today = hours.find(oh => DAY_INDEX[oh.day] === now.getDay());
  if (!today) return null;
  const nextOpen = () => {
    for (let i = 1; i <= 7; i++) {
      const day = (now.getDay() + i) % 7;
      const oh = hours.find(h => DAY_INDEX[h.day] === day && !h.isClosed);
      if (oh) return `${i === 1 ? '내일' : `${oh.day}요일`} ${oh.startTime}부터 진료해요`;
    }
    return undefined;
  };
  if (today.isClosed) return { kind: 'off', title: '오늘은 휴진이에요', sub: nextOpen() };
  const t = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = (today.startTime || '09:00').split(':').map(Number);
  const [eh, em] = (today.endTime || '18:00').split(':').map(Number);
  if (t < sh * 60 + sm) return { kind: 'before', title: '아직 진료 전이에요', sub: `오늘 ${today.startTime}부터 진료해요` };
  if (t > eh * 60 + em) return { kind: 'off', title: '오늘 진료가 끝났어요', sub: nextOpen() };
  return null;
}

/** 좋아요 기기 기억(서버 표가 없을 때·로그인 전 상태 복원용) */
const LIKED_KEY = 'md-liked-products';
function readLikedLocal(): string[] {
  try { const v = JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function writeLikedLocal(id: string, on: boolean) {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify(on ? [id, ...readLikedLocal().filter(x => x !== id)] : readLikedLocal().filter(x => x !== id))); } catch { /* 저장소 막힘 */ }
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

/** 요일 표 순서(월→일) */
const WEEK_ORDER = ['월', '화', '수', '목', '금', '토', '일'];

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
  { id: 'reviews', label: '시술 후기' },
  { id: 'info', label: '병원 정보' },
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
  // 좋아요(하트) — 포켓과 별개. 서버(product_likes)가 아직 없으면 이 기기에만 기억한다
  const [liked, setLiked] = useState<boolean | null>(null);
  const [likeAnim, setLikeAnim] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [optionId, setOptionId] = useState<string | null>(null);
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
    if (!product) return;
    let alive = true;
    const local = readLikedLocal().includes(product.id);
    fetch(`/api/products/${product.id}/like`).then(r => r.json()).then((d: { liked?: boolean; missing?: boolean }) => {
      if (alive) setLiked(d.missing || !user ? local : !!d.liked);
    }).catch(() => { if (alive) setLiked(local); });
    return () => { alive = false; };
  }, [product?.id, user]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const selected = optionRows.find(o => o.id === optionId) ?? optionRows[0];
  const cheapestId = optionRows.reduce((m, o) => (o.price < m.price ? o : m), optionRows[0]).id;
  // 진료과 순위 = 같은 진료과 안에서 찜 수 → 후기 수 순
  const categoryRanked = products.filter(p => p.category === product.category).sort((x, y) => y.likeCount - x.likeCount || y.reviewCount - x.reviewCount);
  const categoryRankIdx = categoryRanked.findIndex(p => p.id === product.id);
  const categoryRank = categoryRankIdx >= 0 && categoryRankIdx < 100 ? categoryRankIdx + 1 : null;
  const categoryTop = categoryRanked.slice(0, 3);
  const todayHours = (() => {
    const oh = hospital?.operatingHours.find(h => DAY_INDEX[h.day] === new Date().getDay());
    if (!oh) return '병원 정보에서 확인';
    return oh.isClosed ? '오늘 휴진' : `오늘 ${oh.startTime} ~ ${oh.endTime}`;
  })();
  const tagChips = product.tags.map(t => t.replace(/^#/, '').trim()).filter(Boolean);
  const categoryName = categories.find(c => c.id === product.category)?.name;

  const share = () => {
    if (navigator.share) navigator.share({ title: product.title, url: window.location.href }).catch(() => {});
    else navigator.clipboard?.writeText(window.location.href).then(() => showToast('링크가 복사되었어요.')).catch(() => showToast('링크를 복사하지 못했어요.'));
  };
  const wish = () => {
    if (!user) { window.dispatchEvent(new Event('dental:login')); return; }
    toggleWishlist(product.id);
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
  };
  const toggleLike = () => {
    if (!user) { window.dispatchEvent(new Event('dental:login')); return; }
    const next = !liked;
    setLiked(next);
    writeLikedLocal(product.id, next);
    if (next) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 450); }
    fetch(`/api/products/${product.id}/like`, { method: next ? 'POST' : 'DELETE' }).catch(() => {});
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

  // 바닥 버튼 — 사장 견본: 하트 · 가방(포켓) · 연파랑 보조 · 파랑 주 버튼
  const buttons = (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={liked ? '좋아요 취소' : '좋아요'} aria-pressed={!!liked} onClick={toggleLike} className="flex h-14 w-11 shrink-0 items-center justify-center transition-transform active:scale-90">
        <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden className={likeAnim ? 'heart-pop' : undefined}>
          <path d="M12 20.3s-7.8-4.6-7.8-10.4A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.8 2.7c0 5.8-7.8 10.4-7.8 10.4z" fill={liked ? '#F04452' : 'none'} stroke={liked ? '#F04452' : '#9E9E9E'} strokeWidth="1.9" strokeLinejoin="round" style={{ transition: 'fill .2s ease, stroke .2s ease' }} />
        </svg>
      </button>
      <button type="button" aria-label={isWished ? '포켓에서 빼기' : '포켓에 담기'} aria-pressed={isWished} onClick={wish} className="flex h-14 w-11 shrink-0 items-center justify-center transition-transform active:scale-90">
        <PocketIcon size={30} filled={isWished} strokeWidth={1.9} className={heartAnim ? 'heart-pop' : undefined} style={{ color: isWished ? pocketColor : '#9E9E9E' }} />
      </button>
      <button
        type="button"
        onClick={() => router.push(`/booking?productId=${product.id}`)}
        className="ml-1 flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#EBF2FD] text-[17px] font-bold text-[#3A6FDB] transition-all active:scale-[0.98]"
      >
        예약하기
      </button>
      <button
        type="button"
        onClick={() => router.push(`/booking?productId=${product.id}&payment=app`)}
        className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]"
      >
        앱결제하기
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

          {/* ─── 이름 · 가격 카드 · 정보 줄 · 옵션 고르기 — 사장 견본(쿠팡 상세 위 칸, 261031) 그대로 ─── */}
          <div className="bg-white pt-6">
            <Reveal>
              <div className="px-5">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/search?category=${product.category}`}
                    className="flex min-w-0 items-center gap-0.5 rounded-[8px] bg-[#F2F4F6] py-1.5 pl-2.5 pr-1.5 text-[14px] font-semibold text-[#333D4B] transition-colors active:bg-[#E5E8EB]"
                  >
                    <span className="truncate">{categoryRank ? `${categoryName} ${categoryRank}위` : product.hospitalName}</span>
                    <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 text-[#6B7684]" />
                  </Link>
                  <button type="button" aria-label="자주 묻는 질문" onClick={() => document.getElementById('product-faq')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="-mr-1 -mt-0.5 shrink-0 p-1 transition-transform active:scale-90">
                    <MonoIcon name="chat-bubble-question" size={30} color="#B0B8C1" />
                  </button>
                </div>
                <h1 className="mt-3 break-keep text-[20px] font-medium leading-[1.4] tracking-[-0.4px] text-[#191F28]">{product.title}</h1>

                {/* 가격 카드 — 연한 파랑 바탕 · 파란 띠 · 남색 큰 값 */}
                <div className="mt-4 rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">
                      {selected.discount > 0 ? `${selected.discount}% 할인 적용중` : '앱결제 가능'}
                    </span>
                    <button type="button" onClick={() => scrollToSection('desc')} className="text-[15px] text-[#8B95A1] underline underline-offset-[3px]">
                      옵션 비교하기
                    </button>
                  </div>
                  {selected.original > selected.price && (
                    <p className="mt-3 flex items-baseline gap-1.5 text-[17px] font-bold">
                      <span className="text-[#1E3A78]">{selected.discount}%</span>
                      <span className="font-medium text-[#B0B8C1] line-through">{selected.original.toLocaleString()}원</span>
                    </p>
                  )}
                  <button type="button" onClick={() => setPriceOpen(v => !v)} aria-expanded={priceOpen} className={`flex items-baseline gap-2 text-left ${selected.original > selected.price ? 'mt-0.5' : 'mt-3'}`}>
                    <span className="text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]">{selected.price.toLocaleString()}원</span>
                    <span className="flex items-center gap-0.5 text-[17px] font-bold text-[#1E3A78]">
                      {selected.original > selected.price ? '할인 적용가' : 'VAT 포함'}
                      <ChevronDown size={18} strokeWidth={2.4} className="transition-transform duration-300" style={{ transform: priceOpen ? 'rotate(180deg)' : undefined }} />
                    </span>
                  </button>
                  <div className="grid transition-all duration-500" style={{ gridTemplateRows: priceOpen ? '1fr' : '0fr', opacity: priceOpen ? 1 : 0, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
                    <div className="overflow-hidden">
                      <div className="mt-3 space-y-1.5 border-t border-[#DCE7FA] pt-3 text-[14px]">
                        <p className="flex justify-between text-[#4E5968]"><span>정가</span><span>{selected.original.toLocaleString()}원</span></p>
                        {selected.original > selected.price && <p className="flex justify-between text-[#4E5968]"><span>할인</span><span className="text-[#2F6FE4]">-{(selected.original - selected.price).toLocaleString()}원</span></p>}
                        <p className="flex justify-between font-bold text-[#191F28]"><span>결제 금액(VAT 포함)</span><span>{selected.price.toLocaleString()}원</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 적립 · 안내 */}
                <p className="mt-2.5 flex items-center gap-1.5 text-[15px] text-[#333D4B]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/pocket/glass-coin.webp" alt="" width={20} height={20} className="shrink-0" />
                  후기 작성 시 {REVIEW_POINT.toLocaleString()}P 적립 · VAT 포함
                </p>
                <p className="mt-1 text-[15px] text-[#333D4B]">이 상품은 앱결제로 바로 예약할 수 있어요.</p>

                {/* 정보 줄 */}
                <div className="mt-5 pb-3">
                  <button type="button" onClick={() => scrollToSection('reviews')} className="flex h-12 w-full items-center text-left">
                    <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">평점·리뷰</span>
                    <span className="flex min-w-0 flex-1 items-center gap-1 text-[17px] text-[#333D4B]"><SingleStar size={20} />{rating.toFixed(1)} ({reviewCount})</span>
                    <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
                  </button>
                  <button type="button" onClick={() => scrollToSection('info')} className="flex h-12 w-full items-center text-left">
                    <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">진료시간</span>
                    <span className="min-w-0 flex-1 truncate text-[17px] text-[#333D4B]">{todayHours}</span>
                    <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
                  </button>
                  <Link href={`/hospital/detail/${product.hospitalId}`} className="flex h-12 w-full items-center">
                    <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">병원</span>
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[17px] text-[#333D4B]">
                      <span className="truncate">{product.hospitalName}</span>
                      {verified && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src="/icons/brand-logo.png" alt="인증 병원" width={16} height={16} className="shrink-0" />
                      )}
                    </span>
                    <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* 인기 순위 줄 */}
            {categoryTop.length > 0 && (
              <>
                <div className="h-2.5 bg-[#F2F4F6]" />
                <Link href={`/search?category=${product.category}`} className="flex h-[72px] items-center gap-3 px-5 transition-colors active:bg-[#F9FAFB]">
                  <span className="min-w-0 flex-1 truncate text-[18px] font-medium text-[#333D4B]">{categoryName ?? '마이닥'} 인기 순위</span>
                  <span className="flex shrink-0 gap-1">
                    {categoryTop.map(p => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.id} src={resolveProductImageUrl(p.imageUrl, p.id)} alt="" className="h-[30px] w-[30px] rounded-[6px] object-cover" />
                    ))}
                  </span>
                  <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
                </Link>
              </>
            )}
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
            {/* ─── 옵션 정보 — 위 칸(쿠팡 견본) 결: 회색 이름 정보 줄 · 연파랑 안내 · 옵션 비교 목록(고른 줄 연파랑 + 파란 체크) ─── */}
            <Reveal>
              <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">옵션 정보</h2>
              <div className="mt-3">
                {[
                  ...(categoryName ? [{ label: '진료과', value: categoryName }] : []),
                  ...OPTION_CHECKS.map(c => ({ label: c.label === '후기 작성 시' ? '후기 적립' : c.label, value: c.label === '후기 작성 시' ? `작성 시 ${REVIEW_POINT.toLocaleString()}P` : c.value })),
                  ...(tagChips.length > 0 ? [{ label: '키워드', value: tagChips.join(', ') }] : []),
                ].map(r => (
                  <p key={r.label} className="flex min-h-11 items-center py-1.5">
                    <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">{r.label}</span>
                    <span className="min-w-0 flex-1 break-keep text-[17px] text-[#333D4B]">{r.value}</span>
                  </p>
                ))}
              </div>
              <p className="mt-3 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
                <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
                시술에 대한 정보는 참고 사항이며, 병원 방문 시 개인의 상태에 따라 달라질 수 있어요.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <p className="mt-7 flex items-center gap-2 text-[16px]">
                <span className="text-[#8B95A1]">옵션 비교</span>
                <span className="h-3.5 w-px bg-[#E5E8EB]" />
                <span className="font-bold text-[#3180F7]">{optionRows.length}개</span>
              </p>
              <div className="-mx-1 mt-2 space-y-1">
                {optionRows.map(o => {
                  const on = o.id === selected.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOptionId(o.id)}
                      className={`flex w-full items-center gap-3.5 rounded-[16px] px-4 py-4 text-left transition-colors ${on ? 'bg-[#EFF5FE]' : 'bg-white active:bg-[#F9FAFB]'}`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${on ? 'bg-[#2F6FE4]' : 'border-2 border-[#E5E8EB]'}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={on ? '#fff' : '#D1D6DB'} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block break-keep text-[16px] leading-[1.4] ${on ? 'font-bold text-[#3180F7]' : 'text-[#333D4B]'}`}>{o.name}</span>
                        <span className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                          {o.discount > 0 && <span className="text-[15px] font-bold text-[#1E3A78]">{o.discount}%</span>}
                          <span className="text-[18px] font-bold tracking-[-0.4px] text-[#191F28]">{o.price.toLocaleString()}원</span>
                          {o.original > o.price && <span className="text-[13px] text-[#B0B8C1] line-through">{o.original.toLocaleString()}원</span>}
                        </span>
                      </span>
                      {o.id === cheapestId && optionRows.length > 1 && (
                        <span className="shrink-0 self-start rounded-[6px] bg-[#DCE9FD] px-2 py-1 text-[12px] font-semibold text-[#2F6FE4]">최저가</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Reveal>

            <div className="mt-10" />
            <Reveal>
              <h2 className="mb-4 text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">상품 설명</h2>
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
              <div className="-mx-1.5 flex snap-x gap-2.5 overflow-x-auto scroll-px-2.5 px-2.5 hide-scrollbar">
                {/* 카드 폭 = 상품 목록 두 칸 그리드 한 칸과 같다(양옆 10 · 사이 10) */}
                {alsoViewed.map((p, i) => (
                  <div key={p.id} className="w-[calc((min(100vw,640px)-30px)/2)] shrink-0 snap-start">
                    <ProductCard product={p} index={i} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-2.5 bg-[#F2F4F6]" />
          {/* ─── 시술 후기 — 로그인해야 자세한 후기를 보여 준다(사장 견본). 로그인 전·후기 없음 = 프리티풀 비즈 '카드 3장' 예시 장면 ─── */}
          <div ref={sectionRefs.reviews} className="bg-white px-5 py-6">
            <h2 className="mb-5 text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">시술 후기</h2>
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

          {/* ─── 병원 정보 — 옵션 정보와 같은 결(261031): 20 굵은 제목 · 테두리 없는 병원 줄 · 회색 이름 정보 줄 · 회색 바로 하기 버튼 ─── */}
          <div className="h-2.5 bg-[#F2F4F6]" />
          <div ref={sectionRefs.info} className="bg-white px-5 py-7">
            <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">병원 정보</h2>
            {hospital ? (
              <>
                <Reveal>
                  <Link href={`/hospital/detail/${hospital.id}`} className="-mx-2 mt-3 flex items-center gap-3.5 rounded-[16px] px-2 py-2 transition-colors active:bg-[#F9FAFB]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hospitalImageUrl} alt="" className="h-[52px] w-[52px] shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="flex min-w-0 items-center gap-1.5 text-[17px] font-bold text-[#191F28]">
                        <span className="truncate">{hospital.name}</span>
                        {verified && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src="/icons/brand-logo.png" alt="인증 병원" width={16} height={16} className="shrink-0" />
                        )}
                      </p>
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
                      { label: '진료시간', value: todayHours },
                      ...(hospital.tags?.length > 0 ? [{ label: '키워드', value: hospital.tags.slice(0, 6).map(t => t.replace(/^#/, '')).join(', ') }] : []),
                    ].map(r => (
                      <p key={r.label} className="flex min-h-11 items-center py-1.5">
                        <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">{r.label}</span>
                        <span className="min-w-0 flex-1 break-keep text-[17px] text-[#333D4B]">{r.value}</span>
                      </p>
                    ))}
                  </div>
                  {/* 바로 하기 — 전화 · 길찾기 · 병원 홈(회색 바탕, 테두리 없음) */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      ...(hospital.phone ? [{ label: '전화하기', icon: 'call', onClick: () => { window.location.href = `tel:${hospital.phone.replace(/[^0-9+]/g, '')}`; } }] : []),
                      { label: '길찾기', icon: 'pin-location', onClick: () => window.open(`https://map.naver.com/p?q=${encodeURIComponent(hospital.address || hospital.name)}`, '_blank') },
                      { label: '병원 홈', icon: 'hospital', onClick: () => router.push(`/hospital/detail/${hospital.id}`) },
                    ].map(btn => (
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

                {hospital.introduction && (
                  <Reveal>
                    <h3 className="mt-8 text-[17px] font-bold text-[#191F28]">병원 소개</h3>
                    <IntroText text={hospital.introduction} />
                  </Reveal>
                )}

                <Reveal>
                  <h3 className="mt-8 text-[17px] font-bold text-[#191F28]">오시는 길</h3>
                  <div className="relative mt-3 aspect-[16/10] overflow-hidden rounded-[16px] bg-[#F2F4F6]">
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
                  {hospital.addressDetail && <p className="mt-1.5 whitespace-pre-line rounded-[14px] bg-[#F2F4F6] px-4 py-3 text-[14px] leading-[1.6] text-[#4E5968]">{hospital.addressDetail}</p>}
                </Reveal>

                {hospital.doctors.length > 0 && (
                  <Reveal>
                    <h3 className="mt-8 text-[17px] font-bold text-[#191F28]">의료진 <span className="text-[#3180F7]">{hospital.doctors.length}</span></h3>
                    <div className="mt-1">
                      {hospital.doctors.map(d => (
                        <Link key={d.id} href={`/doctor/${d.id}`} className="-mx-2 flex items-center gap-3 rounded-[16px] px-2 py-3 transition-colors active:bg-[#F9FAFB]">
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
                <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">진료 시간</h2>
                <Reveal>
                  {(() => {
                    const todayDay = WEEK_ORDER.find(d => DAY_INDEX[d] === new Date().getDay())!;
                    const t = hospital.operatingHours.find(o => o.day === todayDay);
                    const closed = !t || t.isClosed;
                    return (
                      <div className="mt-4 rounded-[16px] bg-[#F2F4F6] px-5 py-4">
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
                    <p className="mt-3 flex items-start gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3 text-[14px] leading-[1.5] text-[#4E5968]">
                      <MonoIcon name="exclamation-circle" size={17} color="#B0B8C1" className="mt-0.5" />
                      {hospital.holidayNotice.replace(/^\*/, '')}
                    </p>
                  )}
                  <p className="mt-3 text-[13px] leading-[1.5] text-[#B0B8C1]">진료 시간은 병원 사정에 따라 바뀔 수 있어요.</p>
                </Reveal>
              </div>
            </>
          )}
          <div className="h-2.5 bg-[#F2F4F6]" />
          {/* ─── 자주 묻는 질문 ─── */}
          <div id="product-faq" className="bg-white px-5 py-6">
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
            <TossBubble key={notice.title} className="mx-auto mb-1.5" icon={notice.kind === 'before' ? <BubbleClockIcon /> : <BubbleMoonIcon />} sub={notice.sub}>{notice.title}</TossBubble>
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
