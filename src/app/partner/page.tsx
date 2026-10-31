'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, Star } from 'lucide-react';
import { normalizeProductImageUrl } from '@/lib/images';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useReservationRealtimeRefresh } from '@/lib/realtime/reservations';
import { useStore } from '@/store';
import { HeaderBellIcon } from '@/components/icons/HeaderIcons';
import MonoIcon from '@/components/common/MonoIcon';

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
  address?: string | null;
  location?: string | null;
  products?: ProductRow[];
};

type ProductApprovalStatus = 'approved' | 'pending_create' | 'pending_update' | 'pending_delete' | 'rejected';

type ProductRow = {
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
  description?: string | null;
  tags?: string[] | null;
  category?: string | null;
  sub_category?: string | null;
  status?: string | null;
  approval_status?: ProductApprovalStatus | null;
  created_at?: string | null;
  pending_changes?: Partial<{
    title: string;
    location: string | null;
    price: number;
    original_price: number | null;
    discount: number | null;
    image_url: string | null;
    detail_image_url: string | null;
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
  title: string;
  category: string;
  subCategory: string;
  price: string;
  originalPrice: string;
  discount: string;
  imageUrl: string;
  detailImageUrl: string;
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

const HOME_TAB_LABEL: Record<HomeTab, string> = {
  reservations: '예약목록',
  products: '등록상품',
};

const PRODUCT_APPROVAL_TAB_LABEL: Record<ProductApprovalTab, string> = {
  approved: '승인완료',
  pending: '승인대기',
  rejected: '반려',
};

const PRODUCT_CATEGORIES = [
  { value: 'dental', label: '치과' },
  { value: 'plastic', label: '성형외과' },
  { value: 'skin', label: '피부과' },
];

const PRODUCT_SUB_CATEGORIES: Record<string, string[]> = {
  dental: ['임플란트', '치아교정', '라미네이트', '치아미백', '스케일링', '충치치료', '사랑니발치', '턱관절치료', '보철치료'],
  plastic: ['쌍꺼풀', '코성형', '안면윤곽', '리프팅', '보톡스', '필러', '지방흡입', '입술필러', '턱보톡스'],
  skin: ['리프팅', '보톡스', '필러', '레이저', '여드름', '색소치료', '모공관리', '스킨부스터'],
};

const EMPTY_PRODUCT_FORM: ProductForm = {
  title: '',
  category: 'dental',
  subCategory: '',
  price: '',
  originalPrice: '',
  discount: '',
  imageUrl: '',
  detailImageUrl: '',
  description: '',
  tags: [],
};

const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/avif', 'image/webp'];
const PRODUCT_IMAGE_MAX_SIZE = 10 * 1024 * 1024;

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
  return PRODUCT_SUB_CATEGORIES[category] ?? [];
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
    .map(([key, label]) => ({ key, label, value: formatPendingValue(changes[key]) }));
}

function toProductForm(product?: ProductRow): ProductForm {
  if (!product) return { ...EMPTY_PRODUCT_FORM };
  const pc = product.pending_changes ?? {};
  const pick = <K extends keyof NonNullable<ProductRow['pending_changes']>>(key: K, fallback: any) =>
    Object.prototype.hasOwnProperty.call(pc, key) ? (pc as any)[key] : fallback;

  const mergedTitle = pick('title', product.title);
  const mergedCategory = pick('category', product.category);
  const mergedSubCategory = pick('sub_category', product.sub_category);
  const mergedPrice = pick('price', product.price);
  const mergedOriginalPrice = pick('original_price', product.original_price);
  const mergedDiscount = pick('discount', product.discount);
  const mergedImageUrl = pick('image_url', product.image_url);
  const mergedDetailImageUrl = pick('detail_image_url', product.detail_image_url);
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
    discount: typeof mergedDiscount === 'number' ? String(mergedDiscount) : '0',
    imageUrl: mergedImageUrl ?? '',
    detailImageUrl: mergedDetailImageUrl ?? '',
    description: mergedDescription ?? '',
    tags: Array.isArray(mergedTags) ? mergedTags : [],
  };
}

function productPayload(form: ProductForm) {
  const originalPrice = onlyDigits(form.originalPrice);
  const discount = normalizeDiscountInput(form.discount);
  const price = calculateSalePrice(originalPrice, discount);
  return {
    title: form.title,
    category: form.category,
    subCategory: form.subCategory,
    price,
    originalPrice,
    discount,
    imageUrl: form.imageUrl,
    detailImageUrl: form.detailImageUrl,
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
  index = 0,
}: {
  product: ProductRow;
  hospital: HospitalRow | null;
  onEdit: (product: ProductRow) => void;
  onDelete: (product: ProductRow) => void;
  index?: number;
}) {
  const meta = approvalMeta(product);
  const approvalStatus = effectiveApprovalStatus(product);
  const pending = approvalStatus.startsWith('pending_');
  const deleteDisabled = approvalStatus === 'pending_delete';
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
        <button
          type="button"
          onClick={() => onDelete(product)}
          disabled={deleteDisabled}
          className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-[#F2F4F6] text-[15px] font-semibold text-[#F04452] transition-all active:scale-[0.98] active:bg-[#E5E8EB] disabled:text-[#B0B8C1] disabled:active:scale-100"
        >
          <MonoIcon name="bin" size={18} color={deleteDisabled ? '#B0B8C1' : '#F04452'} />
          {approvalStatus === 'pending_create' ? '요청취소' : deleteDisabled ? '삭제대기' : '삭제'}
        </button>
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
  const filterRefs = useRef<Record<Filter, HTMLButtonElement | null>>({
    all: null,
    pending: null,
    confirmed: null,
    completed: null,
    cancelled: null,
  });
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const detailInputRef = useRef<HTMLInputElement>(null);
  const [productModal, setProductModal] = useState<{ mode: 'create' | 'edit'; product?: ProductRow } | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>({ ...EMPTY_PRODUCT_FORM });
  const [productTagDraft, setProductTagDraft] = useState('');
  const [productSaving, setProductSaving] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState<'imageUrl' | 'detailImageUrl' | null>(null);

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

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const target = filterRefs.current[filter];
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [filter, homeTab]);

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
    setProductForm({ ...EMPTY_PRODUCT_FORM });
    setProductTagDraft('');
    setProductModal({ mode: 'create' });
  };

  const openProductEdit = (product: ProductRow) => {
    setProductForm(toProductForm(product));
    setProductTagDraft('');
    setProductModal({ mode: 'edit', product });
  };

  const updateProductCategory = (category: string) => {
    const options = productSubCategoryOptions(category);
    setProductForm((prev) => ({
      ...prev,
      category,
      subCategory: options.includes(prev.subCategory) ? prev.subCategory : '',
    }));
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

  const uploadProductImage = async (field: 'imageUrl' | 'detailImageUrl', file?: File | null) => {
    if (!file) return;
    if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
      showToast('jpg, png, webp, avif 형식만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > PRODUCT_IMAGE_MAX_SIZE) {
      showToast('10mb 이하 이미지만 업로드할 수 있습니다.');
      return;
    }

    setProductImageUploading(field);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'product-images');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.url) throw new Error(payload.error || '이미지 업로드에 실패했습니다.');
      setProductForm((prev) => ({ ...prev, [field]: payload.url }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.');
    } finally {
      setProductImageUploading(null);
    }
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
    if (!productForm.title.trim()) {
      showToast('상품명을 입력해주세요.');
      return;
    }
    if (!productForm.originalPrice.trim()) {
      showToast('정가를 입력해주세요.');
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
      setProductModal(null);
      await refreshHospital({ force: true, showLoading: false });
    } catch {
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setProductSaving(false);
    }
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
      <div className="px-5 pb-3 pt-1">
        <nav className="pd-seg is-wide" aria-label="홈 탭" style={{ ['--n' as string]: HOME_TABS.length, ['--i' as string]: HOME_TABS.indexOf(homeTab) }}>
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
      </div>

      {homeTab === 'products' ? (
        <section>
          {/* 제목 + 상품 추가 */}
          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <h2 className="text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">등록 상품</h2>
            <span className="min-w-0 flex-1" />
            <Link
              href="/partner/insights"
              className="mr-1.5 inline-flex h-9 items-center gap-1 rounded-[8px] bg-[#F2F4F6] pl-2.5 pr-3 text-[14.5px] font-semibold text-[#333D4B] transition-all active:scale-[0.97]"
            >
              <MonoIcon name="chart-bar" size={16} color="#6B7684" />
              인사이트
            </Link>
            <button
              type="button"
              onClick={openProductCreate}
              className="inline-flex h-9 items-center gap-1 rounded-[8px] bg-[#EFF5FE] pl-2.5 pr-3 text-[14.5px] font-bold text-[#2F6FE4] transition-all active:scale-[0.97]"
            >
              <Plus size={16} strokeWidth={2.4} />
              상품 추가
            </button>
          </div>

          {/* 승인 현황 — 분할 탭 */}
          <div className="px-5 pb-2">
            <nav
              className="pd-seg is-wide"
              role="tablist"
              aria-label="상품 승인 현황"
              style={{ ['--n' as string]: PRODUCT_APPROVAL_TABS.length, ['--i' as string]: PRODUCT_APPROVAL_TABS.indexOf(productApprovalTab) }}
            >
              <span className="pd-seg-thumb" aria-hidden />
              {PRODUCT_APPROVAL_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={productApprovalTab === tab}
                  className={productApprovalTab === tab ? 'is-active' : undefined}
                  onClick={() => setProductApprovalTab(tab)}
                >
                  {PRODUCT_APPROVAL_TAB_LABEL[tab]}
                  <em className={`not-italic ${productApprovalTab === tab ? 'text-[#3180F7]' : 'text-[#B0B8C1]'}`}>{productApprovalCounts[tab]}</em>
                </button>
              ))}
            </nav>
          </div>

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
                    index={index}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* 예약 상태 — 거르기 칩(고르면 연파랑) */}
          <div className="pd-chips" role="tablist" aria-label="예약 상태">
            {FILTERS.map((item) => (
              <button
                key={item}
                ref={(node) => {
                  filterRefs.current[item] = node;
                }}
                type="button"
                role="tab"
                aria-selected={filter === item}
                onClick={() => setFilter(item)}
                className={`pd-chip${filter === item ? ' is-active' : ''}`}
              >
                {FILTER_LABEL[item]}
                <em>{counts[item]}</em>
              </button>
            ))}
          </div>

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
        <div className="partner-product-sheet-backdrop" role="presentation">
          <div className="partner-product-sheet" role="dialog" aria-modal="true">
            <div className="partner-product-sheet-head">
              <h2>{productModal.mode === 'create' ? '상품 추가' : '상품 수정'}</h2>
              <button type="button" onClick={() => setProductModal(null)}>닫기</button>
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
              <select
                value={productForm.category}
                onChange={(e) => updateProductCategory(e.target.value)}
              >
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </label>
            <label>
              세부 카테고리
              <select
                value={productForm.subCategory}
                onChange={(e) => setProductForm((prev) => ({ ...prev, subCategory: e.target.value }))}
              >
                <option value="">세부 카테고리 선택</option>
                {productSubCategoryOptions(productForm.category).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <div className="partner-product-form-grid">
              <label>
                정가
                <input
                  inputMode="numeric"
                  value={productForm.originalPrice}
                  onChange={(e) => updateProductOriginalPrice(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label>
                할인율
                <input
                  inputMode="numeric"
                  value={productForm.discount}
                  onChange={(e) => updateProductDiscount(e.target.value)}
                  placeholder="예: 20"
                />
              </label>
            </div>
            <label>
              판매가
              <input
                inputMode="numeric"
                value={productForm.price}
                readOnly
                placeholder="정가와 할인율 입력 시 자동 계산"
              />
            </label>
            <label>
              썸네일 이미지
              <button
                type="button"
                className={`partner-product-upload ${productForm.imageUrl ? 'has-image' : ''}`}
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={productImageUploading === 'imageUrl'}
              >
                {productForm.imageUrl ? (
                  <img src={productForm.imageUrl} alt="" />
                ) : (
                  <span>{productImageUploading === 'imageUrl' ? '업로드 중...' : '이미지 첨부'}</span>
                )}
              </button>
              <input
                ref={thumbnailInputRef}
                hidden
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
                onChange={(event) => {
                  void uploadProductImage('imageUrl', event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            <label>
              상세페이지 이미지
              <button
                type="button"
                className={`partner-product-upload detail ${productForm.detailImageUrl ? 'has-image' : ''}`}
                onClick={() => detailInputRef.current?.click()}
                disabled={productImageUploading === 'detailImageUrl'}
              >
                {productForm.detailImageUrl ? (
                  <img src={productForm.detailImageUrl} alt="" />
                ) : (
                  <span>{productImageUploading === 'detailImageUrl' ? '업로드 중...' : '상세 이미지 첨부'}</span>
                )}
              </button>
              <input
                ref={detailInputRef}
                hidden
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
                onChange={(event) => {
                  void uploadProductImage('detailImageUrl', event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>
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
              <button type="button" onClick={() => setProductModal(null)}>취소</button>
              <button type="button" onClick={submitProductRequest} disabled={productSaving}>
                {productSaving ? '저장 중...' : '승인 요청'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
