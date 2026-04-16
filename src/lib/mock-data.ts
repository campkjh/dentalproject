/**
 * Live data is fetched from Supabase via /api/catalog and /api/me.
 * This file now only re-exports UI form constants and provides empty
 * fallbacks for entity arrays, so any code that still imports these
 * keeps compiling but renders the proper empty state.
 *
 * Real seed data lives in scripts/seed-data.ts and is loaded by
 * `npm run db:seed:demo`.
 */
import type {
  Product,
  Hospital,
  Review,
  Reservation,
  Post,
  Comment,
  Notification,
  Coupon,
  PointHistory,
} from '@/types';

/* -------------------- UI form constants (not user data) -------------------- */
export const categories = [
  { id: 'internal', name: '내과', icon: '/icons/categories/internal.svg', popular: true },
  { id: 'pediatric', name: '소아과', icon: '/icons/categories/pediatric.svg', popular: true },
  { id: 'obstetrics', name: '산부인과', icon: '/icons/categories/obstetrics.svg', popular: true },
  { id: 'urology', name: '비뇨기과', icon: '/icons/categories/urology.svg', popular: false },
  { id: 'dermatology', name: '피부과', icon: '/icons/categories/dermatology.svg', popular: true },
  { id: 'plastic', name: '성형외과', icon: '/icons/categories/plastic.svg', popular: true },
  { id: 'eye', name: '안과', icon: '/icons/categories/eye.svg', popular: true },
  { id: 'ent', name: '이비인후과', icon: '/icons/categories/ent.svg', popular: false },
  { id: 'orthopedic', name: '정형외과', icon: '/icons/categories/orthopedic.svg', popular: false },
  { id: 'neurosurgery', name: '신경외과', icon: '/icons/categories/neurosurgery.svg', popular: false },
  { id: 'psychiatry', name: '정신과', icon: '/icons/categories/psychiatry.svg', popular: false },
  { id: 'korean-medicine', name: '한의학과', icon: '/icons/categories/korean-medicine.svg', popular: false },
  { id: 'physical-therapy', name: '물리치료과', icon: '/icons/categories/physical-therapy.svg', popular: false },
  { id: 'radiology', name: '영상·검사과', icon: '/icons/categories/radiology.svg', popular: false },
  { id: 'dental', name: '치과', icon: '/icons/categories/dental.svg', popular: true },
];

export const dentalSubCategories = [
  '전체', '치아교정', '라미네이트', '미백제도포', '임플란트', '충치치료', '스케일링',
];

export const regions = [
  '서울시 강남구', '서울시 서초구', '서울시 동작구', '서울시 금천구',
  '서울시 양천구', '서울시 마포구', '서울시 종로구', '서울시 중구',
  '서울시 강동구', '서울시 송파구', '서울시 관악구', '서울시 영등포구',
];

export const popularSearches = [
  '위고비', '삭센다', '탈모', '비만', '피로', '우울증', '불안', '불면증', '고혈압', '당뇨',
];

export const communityTags = [
  '전문의토론', '개원의모임', '임상케이스', '임상의학',
  '의학정보공유', '진료노하우', '치료전략', '진단토론',
  '의료정책', '의료법', '병원경영', '환자상담', '처방가이드',
  '의학연구', '학회정보', '세미나공유', '의료트렌드',
  '근거중심의학', 'EBM', '전공의수련', '봉직의', '개원준비',
  '의료마케팅', '의료윤리', '의료이슈', '보험청구', '수가관리',
  '메디컬네트워크',
];

/* -------------------- Empty entity fallbacks -------------------- */
export const products: Product[] = [];
export const hospitals: Hospital[] = [];
export const reviews: Review[] = [];
export const reservations: Reservation[] = [];
export const posts: Post[] = [];
export const comments: Comment[] = [];
export const notifications: Notification[] = [];
export const coupons: Coupon[] = [];
export const pointHistory: PointHistory[] = [];
export const announcements: { id: string; title: string; date: string; content: string }[] = [];
