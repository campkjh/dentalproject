import type { HomeBanner } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const defaultHomeBanners: HomeBanner[] = [
  {
    id: 'default-rejuran-2026',
    title: '리쥬란 정품인증 안심 시술의 시작',
    subtitle: 'REJURAN',
    imageUrl: '/home-banners/rejuran-certified.png',
    targetUrl: '/search',
    badgeText: '제휴',
    sortOrder: 0,
    isActive: true,
  },
  {
    id: 'default-event-finder-2026',
    title: '전문의 시술 이벤트 한 번에 확인하세요',
    subtitle: '원하는 시술 이벤트 쉽게 찾아보세요',
    imageUrl: '/home-banners/specialist-event.png',
    targetUrl: '/search',
    badgeText: '이벤트',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'default-review-awards-2026',
    title: '고객들이 선택한 5월 고객평가 우수병원',
    subtitle: '상담부터 시술 결과까지, 오직 고객 후기로만',
    imageUrl: '/home-banners/review-awards.png',
    targetUrl: '/search',
    badgeText: '우수병원',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'default-first-visit-2026',
    title: '첫방문 체험가 이벤트만 모았어요',
    subtitle: '첫방문 뱃지를 확인하세요',
    imageUrl: '/home-banners/first-visit.png',
    targetUrl: '/search',
    badgeText: '첫방문',
    sortOrder: 3,
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
