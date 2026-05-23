import type { HomeBanner } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const defaultHomeBanners: HomeBanner[] = [
  {
    id: 'default-summer-2026',
    title: '미리 여름, 먼저 준비하고 즐기자',
    subtitle: '강남언니 단독가 + 최대 49% 할인',
    imageUrl: '/home-banners/summer-2026.png',
    targetUrl: '/search',
    badgeText: '최대 49%',
    sortOrder: 0,
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

