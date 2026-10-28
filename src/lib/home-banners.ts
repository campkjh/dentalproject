import type { HomeBanner } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const defaultHomeBanners: HomeBanner[] = [
  {
    id: 'default-skin-citrus-2026',
    title: '피부 톤,\n왜 칙칙해질까?',
    subtitle: '미백·비타민 관리 한 번에',
    imageUrl: '/home-banners/01_skin_citrus.jpg',
    targetUrl: '/search?category=dermatology',
    badgeText: '피부과',
    sortOrder: 0,
    isActive: true,
  },
  {
    id: 'default-hydration-aloe-2026',
    title: '당기는 피부엔\n속까지 수분 채우기',
    subtitle: '물광·보습 시술 모음',
    imageUrl: '/home-banners/02_hydration_aloe.jpg',
    targetUrl: '/search?category=dermatology',
    badgeText: '피부과',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'default-dental-2026',
    title: '하얀 치아,\n미소부터 달라져요',
    subtitle: '미백부터 교정까지 한눈에',
    imageUrl: '/home-banners/03_dental.jpg',
    targetUrl: '/search?category=dental',
    badgeText: '치과',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'default-health-checkup-2026',
    title: '올해 건강검진,\n미루지 마세요',
    subtitle: '가까운 병원 검진 일정 보기',
    imageUrl: '/home-banners/04_health_checkup.jpg',
    targetUrl: '/search?category=internal',
    badgeText: '내과',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'default-eye-care-2026',
    title: '안경 없이\n선명한 하루',
    subtitle: '시력교정·눈 관리 시술',
    imageUrl: '/home-banners/05_eye_care.jpg',
    targetUrl: '/search?category=eye',
    badgeText: '안과',
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'default-rehabilitation-2026',
    title: '뻐근한 몸,\n제대로 풀어 주세요',
    subtitle: '도수·재활 치료 가까이에서',
    imageUrl: '/home-banners/06_rehabilitation.jpg',
    targetUrl: '/search?category=physical-therapy',
    badgeText: '물리치료',
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 'default-doctor-2026',
    title: '믿을 수 있는\n전문의에게 상담받으세요',
    subtitle: '진짜 후기로 골라요',
    imageUrl: '/home-banners/07_doctor.jpg',
    targetUrl: '/search',
    badgeText: '전문의',
    sortOrder: 6,
    isActive: true,
  },
];

export function normalizeHomeBanner(row: any): HomeBanner {
  return {
    id: row.id,
    title: row.title ?? '',
    subtitle: row.subtitle ?? undefined,
    imageUrl: row.image_url ?? row.imageUrl ?? '',
    mobileImageUrl: row.mobile_image_url ?? row.mobileImageUrl ?? undefined,
    targetUrl: row.target_url ?? row.targetUrl ?? undefined,
    badgeText: row.badge_text ?? row.badgeText ?? undefined,
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
    isActive: row.is_active ?? row.isActive ?? true,
    startsAt: row.starts_at ?? row.startsAt ?? undefined,
    endsAt: row.ends_at ?? row.endsAt ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? undefined,
    updatedAt: row.updated_at ?? row.updatedAt ?? undefined,
  };
}

export function isVisibleHomeBanner(banner: HomeBanner, now = new Date()) {
  if (!banner.isActive) return false;
  if (banner.startsAt && new Date(banner.startsAt) > now) return false;
  if (banner.endsAt && new Date(banner.endsAt) < now) return false;
  return true;
}

export function isMissingHomeBannersTable(error: { message?: string; details?: string | null; hint?: string | null } | null) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes('home_banners') || text.includes('could not find the table') || text.includes('relation');
}
