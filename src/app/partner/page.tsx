'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus, Star } from 'lucide-react';
import { normalizeProductImageUrl } from '@/lib/images';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useReservationRealtimeRefresh } from '@/lib/realtime/reservations';
import { useStore } from '@/store';
import { HeaderBellIcon } from '@/components/icons/HeaderIcons';
import MonoIcon from '@/components/common/MonoIcon';
import LongPressSortList from '@/components/common/LongPressSortList';
import CurrencyInput from '@/components/common/CurrencyInput';
import ProductImagePicker from '@/components/common/ProductImagePicker';
import { prepareProductImage } from '@/lib/product-image-input';
import { compressImage } from '@/lib/compressImage';
import { uploadDirect } from '@/lib/upload';
import { categoryLabel, toCategoryCode } from '@/lib/category-code';
import { treatmentsBySpecialty } from '@/components/hospital-register/register-data';

type ScheduleHistoryItem = {
  id: string;
  title: string;
  content: string;
  created_at?: string | null;
  createdAt?: string | null;
};

type ProductSummary = {
  id?: string | null;
  title?: string | null;
  image_url?: string | null;
  price?: number | null;
};

type ReservationRow = {
  id: string;
  product_id?: string | null;
  visit_at: string | null;
  reservation_at?: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  amount?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  payment_type?: string | null;
  payment_method?: string | null;
  schedule_history?: ScheduleHistoryItem[];
  user?: { name?: string | null; phone?: string | null } | null;
  product?: ProductSummary | ProductSummary[] | null;
};

type HospitalRow = {
  id: string;
  name?: string | null;
  category?: string | null;
  address?: string | null;
  location?: string | null;
  products?: ProductRow[];
};

type ProductApprovalStatus = 'approved' | 'pending_create' | 'pending_update' | 'pending_delete' | 'rejected';

type ProductRow = {
  options?: { id: string; name: string; price: number }[];
  id: string;
  title: string;
  location?: string | null;
  price: number;
  original_price?: number | null;
  discount?: number | null;
  rating?: number | null;
  review_count?: number | null;
  reservation_count?: number | null;
  image_url?: string | null;
  detail_image_url?: string | null;
  image_urls?: string[] | null;
  detail_image_urls?: string[] | null;
  description?: string | null;
  tags?: string[] | null;
  category?: string | null;
  sub_category?: string | null;
  status?: string | null;
  approval_status?: ProductApprovalStatus | null;
  created_at?: string | null;
  pending_changes?: Partial<{
    options: { id: string; name: string; price: number }[];
    title: string;
    location: string | null;
    price: number;
    original_price: number | null;
    discount: number | null;
    image_url: string | null;
    detail_image_url: string | null;
    image_urls: string[];
    detail_image_urls: string[];
    description: string | null;
    tags: string[];
    category: string | null;
    sub_category: string | null;
  }> | null;
};

type ProductApprovalMeta = {
  label: string;
  phase: string;
  description: string;
  tone: 'approved' | 'pending' | 'danger' | 'muted';
  activeStep: number;
};

type ProductForm = {
  options: { id: string; name: string; price: string }[];
  title: string;
  category: string;
  subCategory: string;
  price: string;
  originalPrice: string;
  discount: string;
  /** 할인 적용 — 끄면 판매가만 받는다(정가·할인율 칸이 사라진다) */
  discountEnabled: boolean;
  /** 썸네일 여러 장(첫 장이 대표) */
  imageUrls: string[];
  /** 상세페이지 이미지 여러 장(위에서 아래로 이어 붙여 보여 준다) */
  detailImageUrls: string[];
  description: string;
  tags: string[];
};

const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];
const HOME_TABS = ['reservations', 'products'] as const;
type HomeTab = (typeof HOME_TABS)[number];
const PRODUCT_APPROVAL_TABS = ['approved', 'pending', 'rejected'] as const;
type ProductApprovalTab = (typeof PRODUCT_APPROVAL_TABS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: '전체',
  pending: '새 예약',
  confirmed: '확정',
  completed: '완료',
  cancelled: '취소',
};

/** 예약 상태 툴팁 메뉴 아이콘(토스 컬러) */
const FILTER_ICON: Record<Filter, string> = {
  all: '/icons/color/grid.svg',
  pending: '/icons/toss/calendar-new.svg',
  confirmed: '/icons/toss/calendar-check.svg',
  completed: '/icons/toss/check-done.svg',
  cancelled: '/icons/toss/x-circle-red.svg',
};

const PRODUCT_TAB_ICON: Record<ProductApprovalTab, string> = {
  approved: '/icons/toss/check-done.svg',
  pending: '/icons/toss/clock.svg',
  rejected: '/icons/toss/x-circle-red.svg',
};

const HOME_TAB_LABEL: Record<HomeTab, string> = {
  reservations: '예약목록',
  products: '등록상품',
};

const PRODUCT_APPROVAL_TAB_LABEL: Record<ProductApprovalTab, string> = {
  approved: '승인완료',
  pending: '승인대기',
  rejected: '반려',
};

// 상품 진료과는 병원 진료과로 고정한다(서버 /api/my-hospital/products 도 같은 규칙). 세부 카테고리는 그 과의 진료 목록.
const PRODUCT_SUB_CATEGORIES: Record<string, string[]> = {
  ...treatmentsBySpecialty,
  dental: ['임플란트', '치아교정', '라미네이트', '치아미백', '스케일링', '충치치료', '사랑니발치', '턱관절치료', '보철치료'],
  plastic: ['쌍꺼풀', '코성형', '안면윤곽', '리프팅', '보톡스', '필러', '지방흡입', '입술필러', '턱보톡스'],
  dermatology: ['리프팅', '보톡스', '필러', '레이저', '여드름', '색소치료', '모공관리', '스킨부스터', '제모', '흉터치료'],
};
const PRODUCT_THUMB_MAX = 10;
const PRODUCT_DETAIL_MAX = 20;

const EMPTY_PRODUCT_FORM: ProductForm = {
  options: [],
  title: '',
  category: 'dental',
  subCategory: '',
  price: '',
  originalPrice: '',
  discount: '',
  discountEnabled: false,
  imageUrls: [],
  detailImageUrls: [],
  description: '',
  tags: [],
};

function onlyDigits(value: string) {
  return value.replace(/[^\d]/g, '');
}

function normalizeDiscountInput(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return '';
  return String(Math.min(100, Number(digits)));
}

function calculateSalePrice(originalPrice: string, discount: string) {
  const original = Number(onlyDigits(originalPrice));
  const rate = Number(normalizeDiscountInput(discount) || 0);
  if (!Number.isFinite(original) || original <= 0) return '';
  return String(Math.max(0, Math.round(original * (100 - rate) / 100)));
}

function productSubCategoryOptions(category: string) {
  return PRODUCT_SUB_CATEGORIES[toCategoryCode(category) ?? category] ?? [];
}

function urlList(list: unknown, single: unknown): string[] {
  const fromList = Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string' && Boolean(v)) : [];
  if (fromList.length) return fromList;
  return typeof single === 'string' && single ? [single] : [];
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}년${d.getMonth() + 1}월${d.getDate()}일`;
}

function formatVisit(value?: string | null) {
  if (!value) return '일정 미정';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '일정 미정';
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours < 12 ? '오전' : '오후';
  const hour12 = hours % 12 || 12;
  return `${d.getFullYear()}년${d.getMonth() + 1}월${d.getDate()}일 ${period} ${hour12}:${minutes}`;
}

function money(value?: number | null) {
  if (typeof value !== 'number') return '결제정보 없음';
  return `${value.toLocaleString('ko-KR')}원`;
}

function productPrice(value?: number | null) {
  if (typeof value !== 'number') return '가격 미등록';
  return `${value.toLocaleString('ko-KR')}원`;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getReservationProduct(row: ReservationRow, hospital: HospitalRow | null) {
  const relation = firstRelation(row.product);
  if (relation?.title || relation?.image_url) return relation;
  return hospital?.products?.find((product) => product.id === row.product_id)
    ?? hospital?.products?.find((product) => product.image_url)
    ?? hospital?.products?.[0]
    ?? null;
}

function isAppPayment(row: Pick<ReservationRow, 'payment_type' | 'payment_method'>) {
  const value = `${row.payment_type ?? ''} ${row.payment_method ?? ''}`.toLowerCase();
  if (value.includes('현장') || value.includes('후불') || value.includes('onsite')) return false;
  return value.includes('앱') || value.includes('app') || Boolean(row.payment_method);
}

function paymentLabels(row: ReservationRow) {
  const appPayment = isAppPayment(row);
  const method = appPayment ? '앱결제' : '현장결제';
  const status = row.status === 'cancelled'
    ? appPayment ? '결제취소' : '결제전'
    : appPayment ? '결제완료' : '결제전';
  return { method, status };
}

function latestScheduleHistory(row: ReservationRow) {
  return row.schedule_history?.[0] ?? null;
}

function approvalLabel(product: ProductRow) {
  switch (product.approval_status) {
    case 'pending_create':
      return '추가 승인대기';
    case 'pending_update':
      return '수정 승인대기';
    case 'pending_delete':
      return '삭제 승인대기';
    case 'rejected':
      return '반려';
    default:
      return product.status === 'active' ? '노출중' : '비노출';
  }
}

function isActiveProduct(product: ProductRow) {
  return String(product.status ?? '').trim().toLowerCase() === 'active';
}

function normalizeApprovalStatus(product: ProductRow) {
  return String(product.approval_status ?? '').trim().toLowerCase();
}

function legacyApprovalStatus(product: ProductRow) {
  const status = String(product.status ?? '').trim().toLowerCase();
  if (status === 'paused') return 'pending_create';
  if (status === 'removed') return 'rejected';
  return 'approved';
}

function effectiveApprovalStatus(product: ProductRow) {
  return normalizeApprovalStatus(product) || legacyApprovalStatus(product);
}

function productCardStatus(product: ProductRow) {
  const approvalStatus = effectiveApprovalStatus(product);
  if (isActiveProduct(product)) return { label: '노출중', tone: 'live' as const };
  if (approvalStatus === 'rejected') return { label: '반려', tone: 'danger' as const };
  if (approvalStatus.startsWith('pending')) return { label: '심사중', tone: 'muted' as const };
  return { label: '비노출', tone: 'muted' as const };
}

function productApprovalTabOf(product: ProductRow): ProductApprovalTab {
  if (isActiveProduct(product)) return 'approved';
  const approvalStatus = effectiveApprovalStatus(product);
  if (approvalStatus === 'rejected') return 'rejected';
  if (approvalStatus.startsWith('pending')) return 'pending';
  return 'approved';
}

function approvalMeta(product: ProductRow): ProductApprovalMeta {
  switch (product.approval_status) {
    case 'pending_create':
      return {
        label: '추가 승인대기',
        phase: '관리자 검토중',
        description: '승인 완료 후 고객 화면에 노출됩니다.',
        tone: 'pending',
        activeStep: 1,
      };
    case 'pending_update':
      return {
        label: '수정 승인대기',
        phase: '변경사항 검토중',
        description: '승인 전까지 기존 상품 정보가 유지됩니다.',
        tone: 'pending',
        activeStep: 1,
      };
    case 'pending_delete':
      return {
        label: '삭제 승인대기',
        phase: '삭제 요청 검토중',
        description: '승인 완료 후 고객 화면에서 내려갑니다.',
        tone: 'danger',
        activeStep: 1,
      };
    case 'rejected':
      return {
        label: '반려',
        phase: '재요청 필요',
        description: '내용을 수정해 다시 승인 요청할 수 있습니다.',
        tone: 'danger',
        activeStep: 0,
      };
    default:
      return {
        label: product.status === 'active' ? '승인완료' : '승인완료',
        phase: product.status === 'active' ? '노출중' : '비노출',
        description: product.status === 'active' ? '고객 화면에 정상 노출 중입니다.' : '승인된 상품이지만 현재 비노출 상태입니다.',
        tone: product.status === 'active' ? 'approved' : 'muted',
        activeStep: 2,
      };
  }
}

function formatPendingValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '비움';
  if (typeof value === 'number') return productPrice(value);
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function pendingChangeEntries(product: ProductRow) {
  const changes = product.pending_changes;
  if (!changes) return [];
  const labels: Array<[keyof NonNullable<ProductRow['pending_changes']>, string]> = [
    ['title', '상품명'],
    ['price', '판매가'],
    ['original_price', '정가'],
    ['discount', '할인율'],
    ['category', '카테고리'],
    ['sub_category', '세부 카테고리'],
    ['image_url', '이미지'],
    ['detail_image_url', '상세 이미지'],
    ['description', '상품 설명'],
    ['tags', '태그'],
    ['location', '지역'],
  ];

  return labels
    .filter(([key]) => Object.prototype.hasOwnProperty.call(changes, key))
    .map(([key, label]) => ({ key, label, value: key === 'category' ? categoryLabel(changes[key] as string) || '비움' : formatPendingValue(changes[key]) }));
}

function toProductForm(product?: ProductRow): ProductForm {
  if (!product) return { ...EMPTY_PRODUCT_FORM };
  const pc = product.pending_changes ?? {};
  const pick = <K extends keyof NonNullable<ProductRow['pending_changes']>>(key: K, fallback: ProductRow[K]) =>
    Object.prototype.hasOwnProperty.call(pc, key) ? pc[key] : fallback;

  const mergedTitle = pick('title', product.title);
  const mergedCategory = pick('category', product.category);
  const mergedSubCategory = pick('sub_category', product.sub_category);
  const mergedPrice = pick('price', product.price);
  const mergedOriginalPrice = pick('original_price', product.original_price);
  const mergedDiscount = pick('discount', product.discount);
  const mergedImageUrls = urlList(pick('image_urls', product.image_urls), pick('image_url', product.image_url));
  const mergedDetailImageUrls = urlList(pick('detail_image_urls', product.detail_image_urls), pick('detail_image_url', product.detail_image_url));
  const mergedDescription = pick('description', product.description);
  const mergedTags = pick('tags', product.tags);

  return {
    title: mergedTitle ?? '',
    category: mergedCategory ?? 'dental',
    subCategory: mergedSubCategory ?? '',
    price: typeof mergedPrice === 'number' ? String(mergedPrice) : '',
    originalPrice: typeof mergedOriginalPrice === 'number'
      ? String(mergedOriginalPrice)
      : typeof mergedPrice === 'number'
        ? String(mergedPrice)
        : '',
    discount: typeof mergedDiscount === 'number' ? String(mergedDiscount) : '',
    discountEnabled: typeof mergedDiscount === 'number' && mergedDiscount > 0,
    options: (product.pending_changes?.options ?? product.options ?? []).map(o => ({ ...o, price: String(o.price) })),
    imageUrls: mergedImageUrls,
    detailImageUrls: mergedDetailImageUrls,
    description: mergedDescription ?? '',
    tags: Array.isArray(mergedTags) ? mergedTags : [],
  };
}

function productPayload(form: ProductForm) {
  // 할인 끔 = 판매가만(정가·할인율 비움) · 켬 = 정가 × (100 - 할인율)%
  const originalPrice = form.discountEnabled ? onlyDigits(form.originalPrice) : '';
  const discount = form.discountEnabled ? normalizeDiscountInput(form.discount) : '';
  const price = form.discountEnabled ? calculateSalePrice(originalPrice, discount) : onlyDigits(form.price);
  return {
    title: form.title,
    category: form.category,
    subCategory: form.subCategory,
    price,
    originalPrice: originalPrice || null,
    discount: discount || null,
    options: form.options.map(o => ({ ...o, name: o.name.trim(), price: Number(o.price.replace(/\D/g, '')) })),
    imageUrls: form.imageUrls,
    detailImageUrls: form.detailImageUrls,
    imageUrl: form.imageUrls[0] ?? '',
    detailImageUrl: form.detailImageUrls[0] ?? '',
    description: form.description,
    tags: form.tags,
  };
}

function getStatus(row: ReservationRow) {
  if (row.status === 'completed') {
    return { label: '진료완료', tone: 'completed' as const };
  }
  if (row.status === 'confirmed') {
    return { label: '예약확정', tone: 'confirmed' as const };
  }
  if (row.status === 'cancelled') {
    return { label: '예약취소', tone: 'cancelled' as const };
  }
  return { label: '예약확인중...', tone: 'pending' as const };
}

// ─── 261031 상품 상세 톤 조각 — 테두리 카드 없이 흰 칸 + 회색 띠, 배지 r6, 회색 이름 정보 줄 ───
const Band = () => <div className="h-2.5 bg-[#F2F4F6]" />;

const BADGE = 'inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-[13.5px] font-semibold';

/** 예약 상태 배지 — 대기 회색 · 확정 파랑 · 완료 초록 · 취소 빨강(고객 예약내역과 같은 색) */
function reservationTone(tone: ReturnType<typeof getStatus>['tone']) {
  if (tone === 'completed') return 'bg-[#E6F7EE] text-[#03A94D]';
  if (tone === 'confirmed') return 'bg-[#E8F3FF] text-[#3180F7]';
  if (tone === 'cancelled') return 'bg-[#FFEEEF] text-[#F04452]';
  return 'bg-[#F2F4F6] text-[#6B7684]';
}

/** 상품 노출 배지 — 노출중 파랑 · 반려 빨강 · 심사중/비노출 회색 */
function productTone(tone: ReturnType<typeof productCardStatus>['tone']) {
  if (tone === 'live') return 'bg-[#E8F3FF] text-[#3180F7]';
  if (tone === 'danger') return 'bg-[#FFEEEF] text-[#F04452]';
  return 'bg-[#F2F4F6] text-[#6B7684]';
}

/** 회색 이름 정보 줄 — 좁은 관리 화면이라 15px */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-10 items-center py-1">
      <span className="w-[72px] shrink-0 text-[15px] text-[#8B95A1]">{label}</span>
      <span className="min-w-0 flex-1 break-keep text-[15px] text-[#333D4B]">{children}</span>
    </div>
  );
}

/** 빈 화면 — LoginRequired 결 */
function EmptyBlock({ icon, title, sub, children }: { icon: string; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
        <MonoIcon name={icon} size={34} color="#B0B8C1" />
      </span>
      <p className="qd-a-item mt-5 break-keep text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>{title}</p>
      {sub && <p className="qd-a-item mt-1.5 break-keep text-[15px] leading-[1.6] tracking-[-0.2px] text-[#8B95A1]" style={{ animationDelay: '.12s' }}>{sub}</p>}
      {children}
    </div>
  );
}

function ReservationCard({
  row,
  hospital,
  onConfirmRequest,
  onDetailRequest,
  index = 0,
}: {
  row: ReservationRow;
  hospital: HospitalRow | null;
  onConfirmRequest: (action: { id: string; status: ReservationRow['status'] }) => void;
  onDetailRequest: (id: string) => void;
  index?: number;
}) {
  const status = getStatus(row);
  const customerName = row.user?.name ?? row.customer_name ?? '예약자 정보 없음';
  const product = getReservationProduct(row, hospital);
  const title = product?.title ?? '상품 정보 없음';
  const productImage = normalizeProductImageUrl(product?.image_url);
  const hospitalName = hospital?.name ?? '병원명 미등록';
  const address = hospital?.address ?? hospital?.location ?? '';
  const payment = paymentLabels(row);
  const scheduleHistory = latestScheduleHistory(row);
  const paymentTone = payment.status === '결제완료'
    ? 'bg-[#E8F3FF] text-[#3180F7]'
    : payment.status === '결제취소'
      ? 'bg-[#FFEEEF] text-[#F04452]'
      : 'bg-[#F2F4F6] text-[#6B7684]';

  return (
    <article className="qd-a-item px-5 py-6" style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}>
      {/* 상태 · 예약일 — 누르면 상세 */}
      <button
        type="button"
        onClick={() => onDetailRequest(row.id)}
        className="-mx-2 flex w-[calc(100%+16px)] items-center gap-2 rounded-[12px] px-2 py-1 text-left transition-colors active:bg-[#F9FAFB]"
      >
        <span className={`${BADGE} ${reservationTone(status.tone)}`}>{status.label}</span>
        <span className="min-w-0 flex-1" />
        <span className="text-[14px] text-[#8B95A1]">{formatDate(row.reservation_at ?? row.visit_at)}</span>
        <ChevronRight size={18} strokeWidth={2.2} className="shrink-0 text-[#B0B8C1]" />
      </button>

      {/* 상품 줄 */}
      <button
        type="button"
        onClick={() => onDetailRequest(row.id)}
        className="-mx-2 mt-3 flex w-[calc(100%+16px)] items-center gap-3.5 rounded-[16px] px-2 py-2 text-left transition-colors active:bg-[#F9FAFB]"
      >
        {productImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={productImage} alt="" className="h-14 w-14 shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
        ) : (
          <span className="h-14 w-14 shrink-0 rounded-[14px] bg-[#F2F4F6]" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-bold tracking-[-0.3px] text-[#191F28]">{title}</span>
          <span className="mt-0.5 block truncate text-[14px] text-[#8B95A1]">{hospitalName}</span>
          <span className={`block truncate text-[14px] ${address ? 'text-[#B0B8C1]' : 'text-[#D1D6DB]'}`}>{address || '주소 미등록'}</span>
        </span>
      </button>

      {/* 정보 줄 */}
      <div className="mt-2">
        <InfoRow label="예약자">{customerName}</InfoRow>
        <InfoRow label="예약일시">{formatVisit(row.reservation_at ?? row.visit_at)}</InfoRow>
        <InfoRow label="금액">
          <span className="flex flex-wrap items-center gap-1.5">
            <strong className="mr-0.5 text-[16px] font-bold text-[#191F28]">{money(row.amount)}</strong>
            <span className={`${BADGE} ${paymentTone}`}>{payment.status}</span>
            <span className={`${BADGE} bg-[#F2F4F6] text-[#6B7684]`}>{payment.method}</span>
          </span>
        </InfoRow>
      </div>

      {/* 일정 변경 — 회색 안내 칸 */}
      {scheduleHistory && (
        <p className="mt-3 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
          <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
          <span className="min-w-0 flex-1 break-keep">
            <span className="font-semibold text-[#333D4B]">변경내역</span> · {scheduleHistory.content}
          </span>
        </p>
      )}

      {/* 확인 기다리는 예약 — 같은 폭 두 버튼 */}
      {row.status === 'pending' && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onConfirmRequest({ id: row.id, status: 'confirmed' })}
            className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-[#4A82EE] text-[15px] font-bold text-white transition-all active:scale-[0.98] active:bg-[#3D74DE]"
          >
            예약확정
          </button>
          <button
            type="button"
            onClick={() => onConfirmRequest({ id: row.id, status: 'cancelled' })}
            className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-[#F2F4F6] text-[15px] font-semibold text-[#F04452] transition-all active:scale-[0.98] active:bg-[#E5E8EB]"
          >
            예약취소
          </button>
        </div>
      )}
    </article>
  );
}

function ProductRequestCard({
  product,
  hospital,
  onEdit,
  onDelete,
  onToggleHidden,
  index = 0,
}: {
  product: ProductRow;
  hospital: HospitalRow | null;
  onEdit: (product: ProductRow) => void;
  onDelete: (product: ProductRow) => void;
  /** 승인된 상품 가리기(true)·다시 보이기(false) — 지우지 않는다 */
  onToggleHidden: (product: ProductRow, hide: boolean) => void;
  index?: number;
}) {
  const meta = approvalMeta(product);
  const approvalStatus = effectiveApprovalStatus(product);
  const pending = approvalStatus.startsWith('pending_');
  const deleteDisabled = approvalStatus === 'pending_delete';
  // 이미 승인된(고객에게 보였던) 상품 = 삭제 대신 가리기 · 상품마다 인사이트
  const registered = approvalStatus === 'approved' || approvalStatus === 'pending_update';
  const live = isActiveProduct(product);
  const productImage = normalizeProductImageUrl(product.image_url);
  const status = productCardStatus(product);
  const rating = Number(product.rating ?? 0);
  const reviewCount = Number(product.review_count ?? 0);
  const reservationCount = Number(product.reservation_count ?? 0);
  const publishedAt = formatDate(product.created_at) || '게시일 미정';
  const address = product.location || hospital?.address || hospital?.location || '주소 미등록';

  return (
    <article data-tone={meta.tone} className="qd-a-item px-5 py-6" style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}>
      <div className="flex items-center gap-2">
        <span className={`${BADGE} ${productTone(status.tone)}`}>{status.label}</span>
        <span className="min-w-0 flex-1" />
        <span className="text-[14px] text-[#8B95A1]">게시일 {publishedAt}</span>
      </div>

      <div className="mt-3 flex items-center gap-3.5 py-2">
        {productImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={productImage} alt="" className="h-14 w-14 shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
        ) : (
          <span className="h-14 w-14 shrink-0 rounded-[14px] bg-[#F2F4F6]" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[17px] font-bold tracking-[-0.3px] text-[#191F28]">{product.title}</h2>
          <p className="mt-0.5 truncate text-[14px] text-[#8B95A1]">{hospital?.name || '병원명 미등록'}</p>
          <p className="truncate text-[14px] text-[#B0B8C1]">{address}</p>
        </div>
      </div>

      {/* 리뷰 · 예약 · 금액 — 회색 면 한 칸 */}
      <dl className="mt-3 grid grid-cols-3 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5">
        <div className="min-w-0">
          <dt className="text-[13.5px] text-[#8B95A1]">리뷰</dt>
          <dd className="mt-1 flex items-center gap-1">
            <Star size={14} strokeWidth={0} fill={rating > 0 ? '#2F6FE4' : '#D1D6DB'} aria-hidden="true" />
            <strong className="truncate text-[15px] font-semibold text-[#333D4B]">
              {rating.toFixed(1)}{reviewCount > 0 ? `(${reviewCount.toLocaleString('ko-KR')})` : ''}
            </strong>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[13.5px] text-[#8B95A1]">예약</dt>
          <dd className="mt-1 truncate text-[15px] font-semibold text-[#333D4B]">{reservationCount.toLocaleString('ko-KR')}건</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[13.5px] text-[#8B95A1]">금액</dt>
          <dd className="mt-1 truncate text-[15px] font-bold text-[#1E3A78]">{productPrice(product.price)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-[#F2F4F6] text-[15px] font-semibold text-[#333D4B] transition-all active:scale-[0.98] active:bg-[#E5E8EB]"
        >
          <MonoIcon name="pencil" size={18} color="#6B7684" />
          {pending ? '요청수정' : '수정'}
        </button>
        {registered && (
          <Link
            href={`/partner/insights?product=${product.id}`}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-[#EFF5FE] text-[15px] font-semibold text-[#2F6FE4] transition-all active:scale-[0.98]"
          >
            <MonoIcon name="chart-bar" size={18} color="#2F6FE4" />
            인사이트
          </Link>
        )}
        {registered ? (
          <button
            type="button"
            onClick={() => onToggleHidden(product, live)}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-[#F2F4F6] text-[15px] font-semibold text-[#333D4B] transition-all active:scale-[0.98] active:bg-[#E5E8EB]"
          >
            <MonoIcon name={live ? 'eye-off' : 'eye-on'} size={18} color="#6B7684" />
            {live ? '가리기' : '다시 보이기'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onDelete(product)}
            disabled={deleteDisabled}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-[#F2F4F6] text-[15px] font-semibold text-[#F04452] transition-all active:scale-[0.98] active:bg-[#E5E8EB] disabled:text-[#B0B8C1] disabled:active:scale-100"
          >
            <MonoIcon name="bin" size={18} color={deleteDisabled ? '#B0B8C1' : '#F04452'} />
            {approvalStatus === 'pending_create' ? '요청취소' : deleteDisabled ? '삭제대기' : '삭제'}
          </button>
        )}
      </div>
    </article>
  );
}

export default function PartnerHomePage() {
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const showConfirm = useStore((s) => s.showConfirm);
  const unreadNotice = useStore((s) => s.meHydrated && s.notifications.some((n) => !n.isRead));
  const {
    data: hospitalData,
    loading,
    refresh: refreshHospital,
    mutate: mutateHospital,
  } = useMyHospitalData<HospitalRow, ReservationRow>(authUser?.id);
  const hospital = hospitalData?.hospital ?? null;
  const reservations = hospitalData?.reservations ?? [];
  const [filter, setFilter] = useState<Filter>('all');
  const [homeTab, setHomeTab] = useState<HomeTab>('reservations');
  const [productApprovalTab, setProductApprovalTab] = useState<ProductApprovalTab>('approved');
  // 예약 상태 거르기 = 탭 옆 '⊞ 전체 ⌄' 버튼 → 프리티풀 툴팁 메뉴(.pop-menu)
  const [filterMenuAt, setFilterMenuAt] = useState<{ right: number; top: number } | null>(null);
  // 등록 상품 승인 현황 = 제목 '등록 상품 ⌄' → 툴팁 메뉴(승인완료·승인대기·반려)
  const [productMenuAt, setProductMenuAt] = useState<{ left: number; top: number } | null>(null);
  // '⊞ 전체 ⌄' 버튼 폭 — 등록 상품 탭으로 가면 이 폭에서 0 으로 줄며 사라진다(뚝 사라지지 않게)
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const [filterBtnW, setFilterBtnW] = useState<number | null>(null);
  const [productModal, setProductModal] = useState<{ mode: 'create' | 'edit'; product?: ProductRow } | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>({ ...EMPTY_PRODUCT_FORM });
  const [productTagDraft, setProductTagDraft] = useState('');
  const [productSaving, setProductSaving] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState<'imageUrls' | 'detailImageUrls' | null>(null);
  const [productImageSelection, setProductImageSelection] = useState({ imageUrls: 0, detailImageUrls: 0 });
  const productFormSession = useRef<symbol | null>(null);
  const productUploadOperation = useRef<symbol | null>(null);
  useEffect(() => () => {
    productFormSession.current = null;
    productUploadOperation.current = null;
  }, []);
  // 내 병원 진료과 — 상품 카테고리는 이걸로 고정
  const hospitalCategory = toCategoryCode(hospital?.category) ?? 'dental';

  useEffect(() => {
    if (!productModal) return undefined;
    document.body.classList.add('partner-product-modal-open');
    return () => {
      document.body.classList.remove('partner-product-modal-open');
    };
  }, [productModal]);

  useReservationRealtimeRefresh({
    enabled: Boolean(authUser && hospital?.id),
    hospitalId: hospital?.id,
    onChange: () => {
      void refreshHospital({ force: true, showLoading: false });
    },
  });

  useEffect(() => {
    if (!filterMenuAt && !productMenuAt) return;
    const close = () => { setFilterMenuAt(null); setProductMenuAt(null); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('scroll', close, { passive: true, capture: true });
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('scroll', close, { capture: true }); window.removeEventListener('keydown', key); };
  }, [filterMenuAt, productMenuAt]);

  // 버튼 글자(전체·새예약…)가 바뀌면 폭을 다시 잰다 — 접힐 때 이 폭에서 0 으로 줄어든다
  useLayoutEffect(() => {
    if (filterBtnRef.current) setFilterBtnW(filterBtnRef.current.offsetWidth);
  }, [filter]);

  const counts = useMemo(() => {
    return {
      all: reservations.filter((r) => r.status !== 'completed').length,
      pending: reservations.filter((r) => r.status === 'pending').length,
      confirmed: reservations.filter((r) => r.status === 'confirmed').length,
      completed: reservations.filter((r) => r.status === 'completed').length,
      cancelled: reservations.filter((r) => r.status === 'cancelled').length,
    };
  }, [reservations]);

  const visible = useMemo(() => {
    const rows = [...reservations].sort((a, b) => {
      const ad = new Date(a.visit_at ?? a.reservation_at ?? 0).getTime();
      const bd = new Date(b.visit_at ?? b.reservation_at ?? 0).getTime();
      return bd - ad;
    });
    if (filter === 'all') return rows.filter((r) => r.status !== 'completed');
    return rows.filter((r) => r.status === filter);
  }, [filter, reservations]);

  const products = useMemo(() => hospital?.products ?? [], [hospital?.products]);
  const productApprovalCounts = useMemo(() => ({
    approved: products.filter((product) => productApprovalTabOf(product) === 'approved').length,
    pending: products.filter((product) => productApprovalTabOf(product) === 'pending').length,
    rejected: products.filter((product) => productApprovalTabOf(product) === 'rejected').length,
  }), [products]);
  const visibleProducts = useMemo(
    () => products.filter((product) => productApprovalTabOf(product) === productApprovalTab),
    [productApprovalTab, products]
  );

  // 새 예약을 확정하면 — 위 '새로운 예약' 칸에서 접히며 빠지고(leavingId) 아래 목록에 잠깐 연파랑으로 반짝(movedId)
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [movedId, setMovedId] = useState<string | null>(null);
  const updateStatus = async (id: string, status: ReservationRow['status']) => {
    const previous = hospitalData;
    mutateHospital((current) => current
      ? { ...current, reservations: current.reservations.map((r) => (r.id === id ? { ...r, status } : r)) }
      : current
    );
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(status === 'cancelled' ? { cancelReason: '병원 사정으로 취소되었습니다.' } : {}),
        }),
      });
      if (!res.ok) {
        mutateHospital(() => previous ?? null);
        const payload = await res.json().catch(() => ({}));
        showToast(payload.error || '예약 상태 변경에 실패했습니다.');
      } else {
        showToast(status === 'confirmed' ? '예약을 확정했습니다.' : '예약을 취소했습니다.');
      }
    } catch {
      mutateHospital(() => previous ?? null);
      showToast('네트워크 오류가 발생했습니다.');
    }
  };

  const openProductCreate = () => {
    productFormSession.current = Symbol();
    productUploadOperation.current = null;
    setProductImageUploading(null);
    setProductImageSelection({ imageUrls: 0, detailImageUrls: 0 });
    setProductForm({ ...EMPTY_PRODUCT_FORM, category: hospitalCategory });
    setProductTagDraft('');
    setProductModal({ mode: 'create' });
  };

  const openProductEdit = (product: ProductRow) => {
    productFormSession.current = Symbol();
    productUploadOperation.current = null;
    setProductImageUploading(null);
    setProductImageSelection({ imageUrls: 0, detailImageUrls: 0 });
    setProductForm({ ...toProductForm(product), category: hospitalCategory });
    setProductTagDraft('');
    setProductModal({ mode: 'edit', product });
  };

  const closeProductModal = () => {
    productFormSession.current = null;
    productUploadOperation.current = null;
    setProductImageUploading(null);
    setProductImageSelection({ imageUrls: 0, detailImageUrls: 0 });
    setProductModal(null);
  };

  const updateProductOriginalPrice = (value: string) => {
    const originalPrice = onlyDigits(value);
    setProductForm((prev) => ({
      ...prev,
      originalPrice,
      price: calculateSalePrice(originalPrice, prev.discount),
    }));
  };

  const updateProductDiscount = (value: string) => {
    const discount = normalizeDiscountInput(value);
    setProductForm((prev) => ({
      ...prev,
      discount,
      price: calculateSalePrice(prev.originalPrice, discount),
    }));
  };

  // 이미지 여러 장 올리기 — 고른 순서대로 뒤에 붙인다. 썸네일은 줄여서, 상세는 원본(25MB 까지) 그대로 저장소로 바로.
  const uploadProductImages = async (field: 'imageUrls' | 'detailImageUrls', picked: File[]): Promise<File[]> => {
    if (productUploadOperation.current || productSaving || !productFormSession.current) return picked;
    const session = productFormSession.current;
    if (!picked.length) return [];
    const max = field === 'imageUrls' ? PRODUCT_THUMB_MAX : PRODUCT_DETAIL_MAX;
    const room = max - productForm[field].length;
    if (picked.length > room) { showToast(`최대 ${max}장까지 올릴 수 있어요. 선택한 사진 수를 줄여주세요.`); return picked; }
    const valid: File[] = [];
    const failed: File[] = [];
    const errors: string[] = [];
    for (const file of picked) {
      try { prepareProductImage(file); valid.push(file); }
      catch (error) {
        failed.push(file);
        errors.push(error instanceof Error ? error.message : `${file.name}: 올릴 수 없는 파일입니다.`);
      }
    }
    const queue = valid.slice(0, room);
    if (!queue.length) { showToast(errors[0] || '선택한 이미지를 확인해주세요.'); return picked; }

    const operation = Symbol();
    productUploadOperation.current = operation;
    const isCurrent = () => productFormSession.current === session && productUploadOperation.current === operation;
    setProductImageUploading(field);
    try {
      for (const file of queue) {
        if (!isCurrent()) return [];
        try {
          const prepared = prepareProductImage(file);
          const body = field === 'imageUrls' ? await compressImage(prepared, 1600).catch(() => prepared) : prepared;
          if (!isCurrent()) return [];
          const url = await uploadDirect(body, field === 'imageUrls' ? 'product-images' : 'product-details');
          if (!isCurrent()) return [];
          setProductForm((prev) => productFormSession.current === session ? { ...prev, [field]: [...prev[field], url] } : prev);
        } catch (error) {
          failed.push(file);
          errors.push(`${file.name}: ${error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.'}`);
        }
      }
      if (isCurrent() && errors.length) showToast(errors[0]);
      return failed;
    } finally {
      if (isCurrent()) {
        productUploadOperation.current = null;
        setProductImageUploading(null);
      }
    }
  };

  const removeProductImage = (field: 'imageUrls' | 'detailImageUrls', url: string) => {
    setProductForm((prev) => ({ ...prev, [field]: prev[field].filter((item) => item !== url) }));
  };

  const addProductTag = () => {
    const tag = productTagDraft.trim().replace(/^#/, '');
    if (!tag) return;
    setProductForm((prev) => (
      prev.tags.includes(tag)
        ? prev
        : { ...prev, tags: [...prev.tags, tag] }
    ));
    setProductTagDraft('');
  };

  const removeProductTag = (tag: string) => {
    setProductForm((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }));
  };

  const submitProductRequest = async () => {
    if (productUploadOperation.current) { showToast('이미지 업로드가 끝난 뒤 승인 요청을 보내주세요.'); return; }
    if (productImageSelection.imageUrls || productImageSelection.detailImageUrls) { showToast('실패한 사진을 다시 올리거나 선택을 취소해주세요.'); return; }
    if (!productForm.title.trim()) {
      showToast('상품명을 입력해주세요.');
      return;
    }
    if (productForm.discountEnabled) {
      if (!productForm.originalPrice.trim()) { showToast('정가를 입력해주세요.'); return; }
      if (!productForm.discount.trim()) { showToast('할인율을 입력하거나 할인 적용을 꺼 주세요.'); return; }
    } else if (!onlyDigits(productForm.price)) {
      showToast('판매가를 입력해주세요.');
      return;
    }
    if (!productModal) return;

    setProductSaving(true);
    try {
      const res = await fetch('/api/my-hospital/products', {
        method: productModal.mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(productModal.mode === 'edit' ? { id: productModal.product?.id } : {}),
          ...productPayload(productForm),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        showToast(payload.error || '상품 요청 저장에 실패했습니다.');
        return;
      }
      const payload = await res.json().catch(() => ({}));
      if (payload.approvalRequired === false) {
        showToast(productModal.mode === 'create' ? '상품을 추가했습니다.' : '상품을 수정했습니다.');
      } else {
        showToast(productModal.mode === 'create' ? '상품 추가 승인 요청을 보냈습니다.' : '상품 수정 승인 요청을 보냈습니다.');
      }
      const nextTab: ProductApprovalTab = payload.approvalRequired === false ? 'approved' : 'pending';
      setProductApprovalTab(nextTab);
      if (productModal.mode === 'create' && payload.product) {
        mutateHospital((current) => current?.hospital
          ? {
              ...current,
              hospital: {
                ...current.hospital,
                products: [
                  {
                    ...payload.product,
                    reservation_count: 0,
                  },
                  ...(current.hospital.products ?? []),
                ],
              },
            }
          : current
        );
      }
      closeProductModal();
      await refreshHospital({ force: true, showLoading: false });
    } catch {
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setProductSaving(false);
    }
  };

  // 승인된 상품 가리기 — 대기·확정 예약이 남아 있으면 막고 예약목록으로 안내(서버도 같은 규칙)
  const requestProductHide = (product: ProductRow, hide: boolean) => {
    const open = reservations.filter((r) => r.product_id === product.id && (r.status === 'pending' || r.status === 'confirmed')).length;
    if (hide && open > 0) {
      showConfirm('아직 가릴 수 없어요', `진행 중인 예약이 ${open}건 있어요. 예약을 모두 취소해야 가릴 수 있어요.`, () => {
        setHomeTab('reservations');
        setFilter('all');
      }, { confirmText: '예약 보러가기', cancelText: '닫기' });
      return;
    }
    const run = async () => {
      setProductSaving(true);
      try {
        const res = await fetch('/api/my-hospital/products/visibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: product.id, hidden: hide }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) { showToast(payload.error || '상품 노출을 바꾸지 못했어요.'); return; }
        showToast(hide ? '상품을 가렸어요. 고객 화면에 보이지 않아요.' : '상품을 다시 보이게 했어요.');
        await refreshHospital({ force: true, showLoading: false });
      } catch {
        showToast('네트워크 오류가 발생했어요.');
      } finally {
        setProductSaving(false);
      }
    };
    if (hide) showConfirm('상품 가리기', `${product.title}을(를) 고객 화면에서 가릴까요? 지우지 않고 언제든 다시 보이게 할 수 있어요.`, () => { void run(); }, { confirmText: '가리기' });
    else void run();
  };

  const requestProductDelete = (product: ProductRow) => {
    showConfirm('상품 삭제', `${product.title} 삭제를 요청할까요?`, async () => {
      setProductSaving(true);
      try {
        const res = await fetch('/api/my-hospital/products', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: product.id }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          showToast(payload.error || '상품 삭제 요청에 실패했습니다.');
          return;
        }
        const payload = await res.json().catch(() => ({}));
        if (payload.approvalRequired === false) {
          showToast('상품을 삭제했습니다.');
        } else {
          showToast(payload.removedDraft ? '상품 추가 요청을 취소했습니다.' : '상품 삭제 승인 요청을 보냈습니다.');
        }
        await refreshHospital({ force: true, showLoading: false });
      } catch {
        showToast('네트워크 오류가 발생했습니다.');
      } finally {
        setProductSaving(false);
      }
    });
  };

  if (loading) {
    return <div className="partner-loading">불러오는 중...</div>;
  }

  if (!hospital) {
    return (
      <EmptyBlock icon="hospital" title="등록된 병원이 없어요" sub="병원을 등록하면 파트너센터를 이용할 수 있어요">
        <Link
          href="/hospital/register"
          className="qd-a-item mt-6 inline-flex h-12 items-center rounded-[14px] bg-[#4A82EE] px-6 text-[16px] font-bold text-white transition-all active:scale-[0.98] active:bg-[#3D74DE]"
          style={{ animationDelay: '.18s' }}
        >
          병원 등록하기
        </Link>
      </EmptyBlock>
    );
  }

  const onConfirmRequest = (action: { id: string; status: ReservationRow['status'] }) => {
    if (action.status === 'cancelled') {
      router.push(`/partner/reservations/${action.id}/cancel`);
      return;
    }
    const title = action.status === 'confirmed'
      ? '정말로 예약을 확정 하시겠습니까?'
      : '정말로 예약을 취소 하시겠습니까?';
    const message = action.status === 'confirmed'
      ? '예약이 확정되며 스케줄에 표시됩니다'
      : '예약이 취소되며 취소 내역에 표시됩니다';
    showConfirm(title, message, () => {
      if (action.status !== 'confirmed') { void updateStatus(action.id, action.status); return; }
      setLeavingId(action.id);
      window.setTimeout(() => {
        setLeavingId(null);
        setMovedId(action.id);
        void updateStatus(action.id, action.status);
        window.setTimeout(() => setMovedId((cur) => (cur === action.id ? null : cur)), 1800);
      }, 320);
    });
  };

  return (
    <div className="partner-mobile-screen has-fixed-title">
      {/* 머리 — 프리티풀 탭 머리 표준: 병원 이름(20 굵게) + 오른쪽 종(안 읽은 알림 빨간 점) */}
      <header className="partner-screen-title partner-home-title with-action">
        <h1>{hospital.name || '내 병원'}</h1>
        <div className="pd-tabhead-actions">
          <button
            type="button"
            aria-label={unreadNotice ? '알림 (안 읽은 알림 있음)' : '알림'}
            onClick={() => window.dispatchEvent(new CustomEvent('dental:notifications'))}
          >
            <HeaderBellIcon dot={unreadNotice} />
          </button>
        </div>
      </header>

      {/* 예약 · 상품 — 회색 트랙 위 미끄러지는 흰 알약 */}
      <div className="flex items-center px-5 pb-3 pt-1">
        <nav className="pd-seg is-wide min-w-0 flex-1" aria-label="홈 탭" style={{ ['--n' as string]: HOME_TABS.length, ['--i' as string]: HOME_TABS.indexOf(homeTab) }}>
          <span className="pd-seg-thumb" aria-hidden />
          {HOME_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={homeTab === tab ? 'is-active' : undefined}
              onClick={() => setHomeTab(tab)}
            >
              {HOME_TAB_LABEL[tab]}
              {tab === 'reservations' && counts.pending > 0 && <em className="not-italic text-[#3180F7]">{counts.pending}</em>}
            </button>
          ))}
        </nav>
        {/* 상태 거르기 — 예약 탭에서만. 등록 상품으로 가면 폭이 줄며 흐려지고(옆 탭 트랙이 같이 늘어난다), 돌아오면 다시 펼쳐진다 */}
        <div
          aria-hidden={homeTab !== 'reservations'}
          className="shrink-0 overflow-hidden transition-[width,margin-left,opacity] duration-[380ms] ease-[cubic-bezier(.22,1,.36,1)]"
          style={{
            width: homeTab === 'reservations' ? (filterBtnW ?? 'auto') : 0,
            marginLeft: homeTab === 'reservations' ? 8 : 0,
            opacity: homeTab === 'reservations' ? 1 : 0,
          }}
        >
          <button
            ref={filterBtnRef}
            type="button"
            tabIndex={homeTab === 'reservations' ? undefined : -1}
            aria-haspopup="menu"
            aria-expanded={!!filterMenuAt}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setFilterMenuAt(filterMenuAt ? null : { right: Math.max(12, window.innerWidth - r.right), top: r.bottom + 6 });
            }}
            className={`inline-flex h-[42px] items-center gap-1.5 whitespace-nowrap rounded-[12px] px-1.5 text-[14.5px] font-bold transition-all duration-300 active:scale-[0.97] active:bg-[#F2F4F6] ${homeTab === 'reservations' ? 'scale-100' : 'scale-90'} ${filter === 'all' ? 'text-[#333D4B]' : 'text-[#2F6FE4]'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FILTER_ICON[filter]} alt="" width={20} height={20} />
            {FILTER_LABEL[filter]}
            <ChevronDown size={16} strokeWidth={2.4} className={`text-[#8B95A1] transition-transform ${filterMenuAt ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {homeTab === 'products' ? (
        <section className="pb-28">
          {/* 제목 '등록 상품 ⌄' — 누르면 승인 현황 툴팁 메뉴 */}
          <div className="px-5 pb-1 pt-4">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={!!productMenuAt}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setProductMenuAt(productMenuAt ? null : { left: Math.max(12, r.left), top: r.bottom + 6 });
              }}
              className="-ml-1 inline-flex items-center gap-1 rounded-[10px] px-1 py-1 transition-colors active:bg-[#F2F4F6]"
            >
              <span className="text-[22px] font-bold tracking-[-0.5px] text-[#191F28]">등록 상품</span>
              {productApprovalTab !== 'approved' && (
                <span className="ml-1 text-[22px] font-bold tracking-[-0.5px] text-[#3180F7]">{PRODUCT_APPROVAL_TAB_LABEL[productApprovalTab]}</span>
              )}
              <ChevronDown size={22} strokeWidth={2.4} className={`ml-0.5 text-[#8B95A1] transition-transform ${productMenuAt ? 'rotate-180' : ''}`} />
            </button>
            <p className="mt-0.5 text-[15px] text-[#8B95A1]">
              {PRODUCT_APPROVAL_TAB_LABEL[productApprovalTab]} {productApprovalCounts[productApprovalTab]}개
            </p>
          </div>
          {productMenuAt && typeof document !== 'undefined' && createPortal(
            <>
              <div className="fixed inset-0 z-[130]" onClick={() => setProductMenuAt(null)} aria-hidden="true" />
              <div role="menu" aria-label="상품 승인 현황" className="pop-menu fixed z-[131]" style={{ left: productMenuAt.left, top: productMenuAt.top, transformOrigin: 'top left' }}>
                {PRODUCT_APPROVAL_TABS.map((tab, i) => (
                  <button
                    key={tab}
                    type="button"
                    role="menuitemradio"
                    aria-checked={productApprovalTab === tab}
                    className="pop-menu-item"
                    style={{ animationDelay: `${0.04 + i * 0.05}s`, ...(productApprovalTab === tab ? { color: '#2F6FE4', fontWeight: 700 } : {}) }}
                    onClick={() => { setProductApprovalTab(tab); setProductMenuAt(null); }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={PRODUCT_TAB_ICON[tab]} alt="" />
                    <span className="flex-1">{PRODUCT_APPROVAL_TAB_LABEL[tab]}</span>
                    <span className={`ml-4 tabular-nums text-[15px] ${productApprovalTab === tab ? 'text-[#2F6FE4]' : 'text-[#8B95A1]'}`}>{productApprovalCounts[tab]}</span>
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )}

          {/* 상품 추가 — 떠 있는 버튼(탭바 위) */}
          <button
            type="button"
            onClick={openProductCreate}
            className="fixed right-5 z-[60] inline-flex h-14 items-center gap-1.5 rounded-full bg-[#4A82EE] pl-5 pr-6 text-[16px] font-bold text-white shadow-[0_8px_24px_rgba(74,130,238,0.35)] transition-transform active:scale-[0.96] pc:right-10"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}
          >
            <Plus size={20} strokeWidth={2.6} />
            상품 추가
          </button>

          {products.length === 0 ? (
            <button type="button" onClick={openProductCreate} className="block w-full rounded-[16px] transition-colors active:bg-[#F9FAFB]">
              <EmptyBlock icon="tag" title="등록된 상품이 없어요" sub="상품을 추가하면 승인 후 고객 화면에 보여요">
                <span
                  className="qd-a-item mt-6 inline-flex h-12 items-center gap-1 rounded-[14px] bg-[#4A82EE] px-5 text-[16px] font-bold text-white"
                  style={{ animationDelay: '.18s' }}
                >
                  <Plus size={18} strokeWidth={2.4} />
                  상품 추가하기
                </span>
              </EmptyBlock>
            </button>
          ) : visibleProducts.length === 0 ? (
            <div key={productApprovalTab}>
              <EmptyBlock icon="tag" title={`${PRODUCT_APPROVAL_TAB_LABEL[productApprovalTab]} 상품이 없어요`} />
            </div>
          ) : (
            <div key={productApprovalTab}>
              {visibleProducts.map((product, index) => (
                <div key={product.id}>
                  {index > 0 && <Band />}
                  <ProductRequestCard
                    product={product}
                    hospital={hospital}
                    onEdit={openProductEdit}
                    onDelete={requestProductDelete}
                    onToggleHidden={requestProductHide}
                    index={index}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {filterMenuAt && typeof document !== 'undefined' && createPortal(
            <>
              <div className="fixed inset-0 z-[130]" onClick={() => setFilterMenuAt(null)} aria-hidden="true" />
              <div role="menu" aria-label="예약 상태" className="pop-menu fixed z-[131]" style={{ right: filterMenuAt.right, top: filterMenuAt.top, transformOrigin: 'top right' }}>
                {FILTERS.map((item, i) => (
                  <button
                    key={item}
                    type="button"
                    role="menuitemradio"
                    aria-checked={filter === item}
                    className="pop-menu-item"
                    style={{ animationDelay: `${0.04 + i * 0.05}s`, ...(filter === item ? { color: '#2F6FE4', fontWeight: 700 } : {}) }}
                    onClick={() => { setFilter(item); setFilterMenuAt(null); }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={FILTER_ICON[item]} alt="" />
                    <span className="flex-1">{FILTER_LABEL[item]}</span>
                    <span className={`ml-4 tabular-nums text-[15px] ${filter === item ? 'text-[#2F6FE4]' : 'text-[#8B95A1]'}`}>{counts[item]}</span>
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )}

          <section key={filter}>
            {visible.length === 0 ? (
              <EmptyBlock icon="calendar-x" title="표시할 예약이 없어요" sub="예약이 들어오면 이 화면에 바로 보여요" />
            ) : filter === 'all' ? (
              (() => {
                // 전체 — 확인 기다리는 새 예약을 위 칸에 따로 모으고, 확정하면 아래 목록으로 내려간다
                const fresh = visible.filter((r) => r.status === 'pending');
                const rest = visible.filter((r) => r.status !== 'pending');
                const card = (row: ReservationRow, index: number) => (
                  <ReservationCard
                    row={row}
                    hospital={hospital}
                    index={index}
                    onConfirmRequest={onConfirmRequest}
                    onDetailRequest={(id) => router.push(`/partner/reservations/${id}`)}
                  />
                );
                return (
                  <>
                    {fresh.length > 0 && (
                      <div className="bg-[#F5F8FF] pb-1">
                        <div className="flex items-center gap-2 px-5 pt-6">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3180F7] opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3180F7]" />
                          </span>
                          <h2 className="text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">새로운 예약</h2>
                          <span className="text-[18px] font-bold text-[#3180F7]">{fresh.length}</span>
                        </div>
                        <p className="px-5 pt-1 text-[14px] text-[#6B7684]">확정하면 아래 예약 목록으로 옮겨져요</p>
                        {fresh.map((row, index) => (
                          <div
                            key={row.id}
                            className="grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out"
                            style={leavingId === row.id
                              ? { gridTemplateRows: '0fr', opacity: 0, transform: 'translateY(24px)' }
                              : { gridTemplateRows: '1fr' }}
                          >
                            <div className="min-h-0 overflow-hidden">
                              {index > 0 && <div className="mx-5 h-px bg-[#E5ECFA]" />}
                              {card(row, index)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {rest.length > 0 && (
                      <>
                        {fresh.length > 0 && <Band />}
                        <h2 className="px-5 pt-6 text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">예약 목록</h2>
                        {rest.map((row, index) => (
                          <div
                            key={row.id}
                            className="transition-colors duration-700"
                            style={{ backgroundColor: movedId === row.id ? '#EFF5FE' : 'transparent' }}
                          >
                            {index > 0 && <Band />}
                            {card(row, index)}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                );
              })()
            ) : (
              visible.map((row, index) => (
                <div key={row.id}>
                  {index > 0 && <Band />}
                  <ReservationCard
                    row={row}
                    hospital={hospital}
                    index={index}
                    onConfirmRequest={onConfirmRequest}
                    onDetailRequest={(id) => router.push(`/partner/reservations/${id}`)}
                  />
                </div>
              ))
            )}
          </section>
        </>
      )}

      {productModal && (
        <div className="partner-product-sheet-backdrop" role="presentation" onClick={closeProductModal}>
          <div className="partner-product-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="partner-product-sheet-grab" aria-hidden="true" />
            <div className="partner-product-sheet-head">
              <h2>{productModal.mode === 'create' ? '상품 추가' : '상품 수정'}</h2>
              <button type="button" onClick={closeProductModal}>닫기</button>
            </div>

            <label>
              상품명
              <input
                value={productForm.title}
                onChange={(e) => setProductForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="예: 임플란트 상담 패키지"
              />
            </label>
            <label>
              카테고리
              {/* 병원 진료과로 고정 — 바꿀 수 없다 */}
              <input value={categoryLabel(hospitalCategory)} readOnly aria-readonly="true" className="partner-product-locked" />
              <span className="partner-product-description-hint">병원 진료과({categoryLabel(hospitalCategory)}) 상품만 등록할 수 있어요.</span>
            </label>
            <label>
              세부 카테고리
              <span className="partner-product-select-field">
                <select
                  value={productForm.subCategory}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, subCategory: e.target.value }))}
                >
                  <option value="">세부 카테고리 선택</option>
                  {productSubCategoryOptions(hospitalCategory).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <ChevronDown className="partner-product-select-chevron" size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </label>

            <section className="space-y-3">
              <h3 className="text-[16px] font-semibold">상품 옵션</h3>
              <p className="text-[13px] text-[#8B95A1]">옵션별 이름과 최종 결제금액을 입력해주세요. 승인 후 고객에게 표시됩니다.</p>
              {productForm.options.map((option, index) => <div key={option.id} className="flex flex-wrap items-center gap-2">
                <input aria-label={'옵션 ' + (index + 1) + ' 이름'} value={option.name} placeholder="옵션 이름" className="min-w-0 flex-1 rounded-xl bg-[#F2F4F6] p-3"
                  onChange={e => setProductForm(prev => ({ ...prev, options: prev.options.map(o => o.id === option.id ? { ...o, name: e.target.value } : o) }))} />
                <input aria-label={'옵션 ' + (index + 1) + ' 금액'} inputMode="numeric" value={option.price ? Number(option.price).toLocaleString() : ''} placeholder="판매가(원)" className="w-28 rounded-xl bg-[#F2F4F6] p-3"
                  onChange={e => setProductForm(prev => ({ ...prev, options: prev.options.map(o => o.id === option.id ? { ...o, price: e.target.value.replace(/\D/g, '') } : o) }))} />
                <button type="button" aria-label={'옵션 ' + (index + 1) + ' 삭제'} onClick={() => setProductForm(prev => ({ ...prev, options: prev.options.filter(o => o.id !== option.id) }))}>삭제</button>
              </div>)}
              <button type="button" disabled={productForm.options.length >= 20} className="h-11 rounded-xl bg-[#EFF5FE] px-4 text-[#3180F7]"
                onClick={() => setProductForm(prev => ({ ...prev, options: [...prev.options, { id: crypto.randomUUID(), name: '', price: '' }] }))}>+ 옵션 추가</button>
            </section>

            {/* 할인 — 체크해야 정가·할인율을 받는다. 안 하면 판매가만 */}
            <button
              type="button"
              role="checkbox"
              aria-checked={productForm.discountEnabled}
              className={`partner-product-check ${productForm.discountEnabled ? 'on' : ''}`}
              onClick={() => setProductForm((prev) => {
                const on = !prev.discountEnabled;
                // 켤 때 지금 판매가를 정가로 옮겨 둔다 · 끌 때 계산된 판매가를 그대로 남긴다
                return on
                  ? { ...prev, discountEnabled: true, originalPrice: prev.originalPrice || prev.price, price: calculateSalePrice(prev.originalPrice || prev.price, prev.discount) || prev.price }
                  : { ...prev, discountEnabled: false };
              })}
            >
              <span className="box" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              할인 적용
            </button>
            {productForm.discountEnabled ? (
              <>
                <div className="partner-product-form-grid">
                  <label>
                    정가(원)
                    <CurrencyInput
                      value={productForm.originalPrice}
                      onValueChange={updateProductOriginalPrice}
                      placeholder="0"
                    />
                  </label>
                  <label>
                    할인율(%)
                    <input
                      inputMode="numeric"
                      value={productForm.discount}
                      onChange={(e) => updateProductDiscount(e.target.value)}
                      placeholder="예: 20"
                    />
                  </label>
                </div>
                <label>
                  판매가(원)
                  <CurrencyInput
                    value={productForm.price}
                    readOnly
                    placeholder="정가와 할인율을 넣으면 자동 계산"
                  />
                </label>
              </>
            ) : (
              <label>
                판매가(원)
                <CurrencyInput
                  value={productForm.price}
                  onValueChange={(price) => setProductForm((prev) => ({ ...prev, price }))}
                  placeholder="0"
                />
              </label>
            )}

            <div className="partner-product-images">
              <span className="partner-product-images-label">
                썸네일 이미지 <b>등록 {productForm.imageUrls.length}/{PRODUCT_THUMB_MAX}{productImageSelection.imageUrls > 0 ? ` · 선택 ${productImageSelection.imageUrls}장` : ''}</b>
              </span>
              <div className="partner-product-thumbs">
                {productForm.imageUrls.map((url, i) => (
                  <div key={url} className="partner-product-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" />
                    {i === 0 && <span className="lead">대표</span>}
                    <button type="button" disabled={!!productImageUploading || productSaving} onClick={() => removeProductImage('imageUrls', url)} aria-label={`썸네일 ${i + 1} 삭제`}>×</button>
                  </div>
                ))}
              </div>
              <ProductImagePicker
                label="썸네일 추가"
                className="partner-product-detail-add"
                room={PRODUCT_THUMB_MAX - productForm.imageUrls.length}
                disabled={!!productImageUploading || productSaving}
                uploading={productImageUploading === 'imageUrls'}
                onUpload={(files) => uploadProductImages('imageUrls', files)}
                onSelectionChange={(count) => setProductImageSelection(prev => ({ ...prev, imageUrls: count }))}
              />
              <span className="partner-product-description-hint">사진을 선택하면 자동으로 올라갑니다. 첫 장이 대표 이미지예요.</span>
            </div>

            <div className="partner-product-images">
              <span className="partner-product-images-label">
                상세페이지 이미지 <b>등록 {productForm.detailImageUrls.length}/{PRODUCT_DETAIL_MAX}{productImageSelection.detailImageUrls > 0 ? ` · 선택 ${productImageSelection.detailImageUrls}장` : ''}</b>
              </span>
              <LongPressSortList
                items={productForm.detailImageUrls}
                disabled={!!productImageUploading || productSaving}
                getKey={(url) => url}
                gap={8}
                onReorder={(next) => setProductForm((prev) => ({ ...prev, detailImageUrls: next }))}
                renderItem={(url, i) => (
                  <div className="partner-product-detail-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" draggable={false} />
                    <span className="num">{i + 1}</span>
                    <button type="button" disabled={!!productImageUploading || productSaving} onClick={() => removeProductImage('detailImageUrls', url)} aria-label={`상세 이미지 ${i + 1} 삭제`}>×</button>
                  </div>
                )}
              />
              <ProductImagePicker
                label="상세 이미지 추가"
                className="partner-product-detail-add"
                room={PRODUCT_DETAIL_MAX - productForm.detailImageUrls.length}
                disabled={!!productImageUploading || productSaving}
                uploading={productImageUploading === 'detailImageUrls'}
                onUpload={(files) => uploadProductImages('detailImageUrls', files)}
                onSelectionChange={(count) => setProductImageSelection(prev => ({ ...prev, detailImageUrls: count }))}
              />
              <span className="partner-product-description-hint">
                JPG·PNG·WEBP·AVIF, 한 장에 25MB까지 등록할 수 있어요. 상세 이미지는 위에서부터 순서대로 이어 보여요. 꾹 눌러 끌면 순서를 바꿀 수 있어요.
              </span>
            </div>
            <label>
              상품 설명
              <textarea
                value={productForm.description}
                onChange={(e) =>
                  setProductForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="시술 절차, 마취 여부, 회복 기간 등 환자에게 도움 될 내용을 자세히 작성해주세요."
                rows={8}
                className="partner-product-description"
                maxLength={4000}
              />
              <span className="partner-product-description-hint">
                {productForm.description.length}/4000자 · 줄바꿈은 그대로 노출됩니다.
              </span>
            </label>
            <div className="partner-product-tag-field">
              태그
              <div>
                <input
                  value={productTagDraft}
                  onChange={(e) => setProductTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addProductTag();
                    }
                  }}
                  placeholder="태그 입력"
                />
                <button type="button" onClick={addProductTag} aria-label="태그 추가">
                  <Plus size={18} />
                </button>
              </div>
              {productForm.tags.length > 0 && (
                <ul>
                  {productForm.tags.map((tag) => (
                    <li key={tag}>
                      #{tag}
                      <button type="button" onClick={() => removeProductTag(tag)} aria-label={`${tag} 태그 삭제`}>
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="partner-product-sheet-actions">
              <button type="button" onClick={closeProductModal}>취소</button>
              <button type="button" onClick={submitProductRequest} disabled={productSaving || !!productImageUploading || productImageSelection.imageUrls > 0 || productImageSelection.detailImageUrls > 0}>
                {productSaving ? '저장 중...' : '승인 요청'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
