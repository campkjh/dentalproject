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
  tags: string;
};

const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];
const HOME_TABS = ['reservations', 'products'] as const;
type HomeTab = (typeof HOME_TABS)[number];
const PRODUCT_APPROVAL_TABS = ['approved', 'pending', 'rejected'] as const;
type ProductApprovalTab = (typeof PRODUCT_APPROVAL_TABS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: '전체',
  pending: '새로운예약',
  confirmed: '확정된예약',
  completed: '완료된예약',
  cancelled: '취소된예약',
};

const HOME_TAB_LABEL: Record<HomeTab, string> = {
  reservations: '예약',
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
  tags: '',
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

function productCardStatus(product: ProductRow) {
  const approvalStatus = normalizeApprovalStatus(product);
  if (isActiveProduct(product)) return { label: '노출중', tone: 'live' as const };
  if (approvalStatus === 'rejected') return { label: '반려', tone: 'danger' as const };
  if (approvalStatus.startsWith('pending')) return { label: '심사중', tone: 'muted' as const };
  return { label: '비노출', tone: 'muted' as const };
}

function productApprovalTabOf(product: ProductRow): ProductApprovalTab {
  if (isActiveProduct(product)) return 'approved';
  const approvalStatus = normalizeApprovalStatus(product);
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
    ['tags', '태그'],
    ['location', '지역'],
  ];

  return labels
    .filter(([key]) => Object.prototype.hasOwnProperty.call(changes, key))
    .map(([key, label]) => ({ key, label, value: formatPendingValue(changes[key]) }));
}

function toProductForm(product?: ProductRow): ProductForm {
  if (!product) return { ...EMPTY_PRODUCT_FORM };
  return {
    title: product.title ?? '',
    category: product.category ?? 'dental',
    subCategory: product.sub_category ?? '',
    price: typeof product.price === 'number' ? String(product.price) : '',
    originalPrice: typeof product.original_price === 'number'
      ? String(product.original_price)
      : typeof product.price === 'number'
        ? String(product.price)
        : '',
    discount: typeof product.discount === 'number' ? String(product.discount) : '0',
    imageUrl: product.image_url ?? '',
    detailImageUrl: product.detail_image_url ?? '',
    tags: product.tags?.join(', ') ?? '',
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

function ReservationCard({
  row,
  hospital,
  onConfirmRequest,
  onDetailRequest,
}: {
  row: ReservationRow;
  hospital: HospitalRow | null;
  onConfirmRequest: (action: { id: string; status: ReservationRow['status'] }) => void;
  onDetailRequest: (id: string) => void;
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

  return (
    <article className="partner-reservation-card">
      <div className="partner-reservation-card-head" onClick={() => onDetailRequest(row.id)} style={{ cursor: 'pointer' }}>
        <strong className={`is-${status.tone}`}>{status.label}</strong>
        <span>
          {formatDate(row.reservation_at ?? row.visit_at)}
          <ChevronRight size={22} strokeWidth={2.2} />
        </span>
      </div>
      <div className="partner-reservation-card-body">
        <div className="partner-reservation-product">
          {productImage ? (
            <img src={productImage} alt="" />
          ) : (
            <div className="partner-reservation-image-empty" aria-hidden="true" />
          )}
          <div className="partner-reservation-product-copy">
            <h2>{title}</h2>
            <p>{hospitalName}</p>
            {address ? <p>{address}</p> : <p className="partner-info-placeholder">주소 미등록</p>}
          </div>
        </div>
        <dl className="partner-reservation-facts">
          <div>
            <dt>예약자</dt>
            <dd>{customerName}</dd>
          </div>
          <div>
            <dt>예약일시</dt>
            <dd>{formatVisit(row.reservation_at ?? row.visit_at)}</dd>
          </div>
          <div>
            <dt>금액</dt>
            <dd className="partner-reservation-payment">
              <strong>{money(row.amount)}</strong>
              <span>
                <em>{payment.status}</em>
                <em>{payment.method}</em>
              </span>
            </dd>
          </div>
        </dl>
        {scheduleHistory && (
          <div className="partner-reservation-change">
            <span>변경내역</span>
            <p>{scheduleHistory.content}</p>
          </div>
        )}
        {row.status === 'pending' && (
          <div className="partner-reservation-actions">
            <button type="button" onClick={() => onConfirmRequest({ id: row.id, status: 'confirmed' })}>
              예약확정
            </button>
            <button type="button" onClick={() => onConfirmRequest({ id: row.id, status: 'cancelled' })}>
              예약취소
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function ProductRequestCard({
  product,
  hospital,
  onEdit,
  onDelete,
}: {
  product: ProductRow;
  hospital: HospitalRow | null;
  onEdit: (product: ProductRow) => void;
  onDelete: (product: ProductRow) => void;
}) {
  const meta = approvalMeta(product);
  const pending = product.approval_status?.startsWith('pending_') ?? false;
  const deleteDisabled = product.approval_status === 'pending_delete';
  const productImage = normalizeProductImageUrl(product.image_url);
  const status = productCardStatus(product);
  const rating = Number(product.rating ?? 0);
  const reviewCount = Number(product.review_count ?? 0);
  const reservationCount = Number(product.reservation_count ?? 0);
  const publishedAt = formatDate(product.created_at) || '게시일 미정';
  const address = product.location || hospital?.address || hospital?.location || '주소 미등록';

  return (
    <article className={`partner-product-card is-${meta.tone}`}>
      <div className="partner-product-card-top">
        <span className={`partner-product-status is-${status.tone}`}>
          {status.label}
        </span>
        <span>게시일 {publishedAt}</span>
      </div>

      <div className="partner-product-content">
        <div className="partner-product-thumb">
          {productImage ? <img src={productImage} alt="" /> : <span aria-hidden="true" />}
        </div>
        <div className="partner-product-main">
          <div className="partner-product-main-copy">
            <h2>{product.title}</h2>
            <p>{hospital?.name || '병원명 미등록'}</p>
            <p>{address}</p>
          </div>
        </div>
      </div>

      <dl className="partner-product-stats">
        <div>
          <dt>리뷰수</dt>
          <dd>
            <span className="partner-product-stars" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={17} strokeWidth={0} fill={index < Math.round(rating) ? '#8037ff' : '#c8ced9'} />
              ))}
            </span>
            <strong>{rating.toFixed(1)}{reviewCount > 0 ? `(${reviewCount.toLocaleString('ko-KR')})` : ''}</strong>
          </dd>
        </div>
        <div>
          <dt>예약수</dt>
          <dd>{reservationCount.toLocaleString('ko-KR')}건</dd>
        </div>
        <div>
          <dt>금액</dt>
          <dd>{productPrice(product.price)}</dd>
        </div>
      </dl>

      <div className="partner-product-actions">
        <button type="button" onClick={() => onEdit(product)}>
          {pending ? '요청수정' : '수정'}
        </button>
        <button type="button" onClick={() => onDelete(product)} disabled={deleteDisabled}>
          {product.approval_status === 'pending_create' ? '요청취소' : deleteDisabled ? '삭제대기' : '삭제'}
        </button>
      </div>
    </article>
  );
}

export default function PartnerHomePage() {
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
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
  const [filterIndicator, setFilterIndicator] = useState({ x: 16, width: 56 });
  const [pendingAction, setPendingAction] = useState<{ id: string; status: ReservationRow['status'] } | null>(null);
  const [productModal, setProductModal] = useState<{ mode: 'create' | 'edit'; product?: ProductRow } | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>({ ...EMPTY_PRODUCT_FORM });
  const [productSaving, setProductSaving] = useState(false);

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
      setFilterIndicator({ x: target.offsetLeft, width: target.offsetWidth });
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

  const closeConfirm = () => setPendingAction(null);

  const runConfirm = () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    void updateStatus(action.id, action.status);
  };

  const openProductCreate = () => {
    setProductForm({ ...EMPTY_PRODUCT_FORM });
    setProductModal({ mode: 'create' });
  };

  const openProductEdit = (product: ProductRow) => {
    setProductForm(toProductForm(product));
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
      setProductModal(null);
      await refreshHospital({ force: true, showLoading: false });
    } catch {
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setProductSaving(false);
    }
  };

  const requestProductDelete = async (product: ProductRow) => {
    if (!window.confirm(`${product.title} 삭제를 요청할까요?`)) return;

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
  };

  if (loading) {
    return <div className="partner-loading">불러오는 중...</div>;
  }

  if (!hospital) {
    return (
      <div className="partner-empty-state">
        <p>등록된 병원이 없습니다.</p>
        <span>병원 등록 후 파트너센터를 이용할 수 있습니다.</span>
        <Link href="/hospital/register">병원 등록하기</Link>
      </div>
    );
  }

  return (
    <div className="partner-mobile-screen has-fixed-title">
      <header className="partner-screen-title partner-home-title with-action">
        <div className="partner-home-title-icon" aria-label="홈">
          <img src="/partner-template/nav-home.svg" alt="" />
        </div>
        <nav className="partner-inline-segment" aria-label="홈 탭">
          {HOME_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={homeTab === tab ? 'is-active' : undefined}
              onClick={() => setHomeTab(tab)}
            >
              {HOME_TAB_LABEL[tab]}
            </button>
          ))}
        </nav>
      </header>

      {homeTab === 'products' ? (
        <section className="partner-product-management">
          <div className="partner-product-section-head">
            <h2>등록 상품</h2>
            <button type="button" onClick={openProductCreate}>
              <Plus size={16} />
              상품 추가
            </button>
          </div>

          <div className="partner-product-summary" role="tablist" aria-label="상품 승인 현황">
            <span
              className="partner-product-summary-indicator"
              style={{ transform: `translateX(${PRODUCT_APPROVAL_TABS.indexOf(productApprovalTab) * 100}%)` }}
              aria-hidden="true"
            />
            {PRODUCT_APPROVAL_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={productApprovalTab === tab}
                className={productApprovalTab === tab ? 'is-active' : undefined}
                onClick={() => setProductApprovalTab(tab)}
              >
                {PRODUCT_APPROVAL_TAB_LABEL[tab]}({productApprovalCounts[tab]})
              </button>
            ))}
          </div>

          {products.length === 0 ? (
            <button type="button" className="partner-product-empty" onClick={openProductCreate}>
              <Plus size={18} />
              등록된 상품이 없습니다
            </button>
          ) : visibleProducts.length === 0 ? (
            <div key={productApprovalTab} className="partner-product-empty partner-product-empty-static">
              {PRODUCT_APPROVAL_TAB_LABEL[productApprovalTab]} 상품이 없습니다
            </div>
          ) : (
            <div key={productApprovalTab} className="partner-product-list partner-product-list-animated">
              {visibleProducts.map((product) => (
                <ProductRequestCard
                  key={product.id}
                  product={product}
                  hospital={hospital}
                  onEdit={openProductEdit}
                  onDelete={requestProductDelete}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="partner-home-filter hide-scrollbar" role="tablist" aria-label="예약 상태">
            <span
              className="partner-home-filter-indicator"
              style={{
                width: filterIndicator.width,
                transform: `translateX(${filterIndicator.x}px)`,
              }}
              aria-hidden="true"
            />
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
                className={filter === item ? 'is-active' : undefined}
              >
                {FILTER_LABEL[item]}({counts[item]})
              </button>
            ))}
          </div>

          <section className="partner-reservation-stack">
            {visible.length === 0 ? (
              <div className="partner-empty-state compact">
                <div className="partner-empty-calendar">
                  <img src="/partner-template/calendar-empty.svg" alt="" />
                </div>
                <p>표시할 예약이 없습니다.</p>
                <span>예약이 접수되면 이 화면에 바로 표시됩니다.</span>
              </div>
            ) : (
              visible.map((row) => (
            <ReservationCard
              key={row.id}
              row={row}
              hospital={hospital}
              onConfirmRequest={(action) => {
                if (action.status === 'cancelled') {
                  router.push(`/partner/reservations/${action.id}/cancel`);
                  return;
                }
                setPendingAction(action);
              }}
              onDetailRequest={(id) => router.push(`/partner/reservations/${id}`)}
            />
              ))
            )}
          </section>
        </>
      )}

      {pendingAction && (
        <div className="partner-figma-dialog-backdrop" role="presentation">
          <div className="partner-figma-alert" role="dialog" aria-modal="true">
            <div className="partner-figma-alert-copy">
              <h2>
                {pendingAction.status === 'confirmed'
                  ? '정말로 예약을 확정 하시겠습니까?'
                  : '정말로 예약을 취소 하시겠습니까?'}
              </h2>
              <p>
                {pendingAction.status === 'confirmed'
                  ? '예약이 확정되며 스케줄에 표시됩니다'
                  : '예약이 취소되며 취소 내역에 표시됩니다'}
              </p>
            </div>
            <div className="partner-figma-alert-actions">
              <button type="button" onClick={runConfirm}>네</button>
              <button type="button" onClick={closeConfirm}>아니요</button>
            </div>
          </div>
        </div>
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
              <input
                value={productForm.imageUrl}
                onChange={(e) => setProductForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="목록과 예약카드에 표시될 이미지 URL"
              />
            </label>
            <label>
              상세페이지 이미지
              <input
                value={productForm.detailImageUrl}
                onChange={(e) => setProductForm((prev) => ({ ...prev, detailImageUrl: e.target.value }))}
                placeholder="상품 상세 영역에 표시될 이미지 URL"
              />
            </label>
            {(productForm.imageUrl || productForm.detailImageUrl) && (
              <div className="partner-product-image-preview-grid">
                {productForm.imageUrl && (
                  <figure>
                    <img src={productForm.imageUrl} alt="" />
                    <figcaption>썸네일</figcaption>
                  </figure>
                )}
                {productForm.detailImageUrl && (
                  <figure>
                    <img src={productForm.detailImageUrl} alt="" />
                    <figcaption>상세</figcaption>
                  </figure>
                )}
              </div>
            )}
            <label>
              태그
              <input
                value={productForm.tags}
                onChange={(e) => setProductForm((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="태그를 쉼표로 구분"
              />
            </label>

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
