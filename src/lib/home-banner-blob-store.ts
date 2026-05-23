import { get, put } from '@vercel/blob';
import type { HomeBanner } from '@/types';
import { normalizeHomeBanner } from '@/lib/home-banners';

const HOME_BANNERS_BLOB_PATH = 'home-banners/index.json';

export type HomeBannerBlobStore = {
  banners: HomeBanner[];
  exists: boolean;
};

export async function readHomeBannersFromBlob(): Promise<HomeBannerBlobStore> {
  try {
    const result = await get(HOME_BANNERS_BLOB_PATH, {
      access: 'public',
      useCache: false,
    });

    if (!result?.stream) return { banners: [], exists: false };

    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed?.banners;
    const banners = Array.isArray(rows)
      ? rows.map(normalizeHomeBanner).filter((banner) => banner.id && banner.title)
      : [];

    return { banners, exists: true };
  } catch {
    return { banners: [], exists: false };
  }
}

export async function writeHomeBannersToBlob(banners: HomeBanner[]) {
  return put(
    HOME_BANNERS_BLOB_PATH,
    JSON.stringify({ banners, updatedAt: new Date().toISOString() }),
    {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
      contentType: 'application/json; charset=utf-8',
    }
  );
}
