import { get, put } from '@vercel/blob';

const SEARCH_PROMO_BLOB_PATH = 'search-promo/index.json';

export type SearchPromo = {
  productId: string | null;
};

export type SearchPromoBlobResult = {
  promo: SearchPromo;
  exists: boolean;
};

export async function readSearchPromoFromBlob(): Promise<SearchPromoBlobResult> {
  try {
    const result = await get(SEARCH_PROMO_BLOB_PATH, {
      access: 'public',
      useCache: false,
    });

    if (!result?.stream) return { promo: { productId: null }, exists: false };

    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);
    const productId =
      typeof parsed?.productId === 'string' && parsed.productId.trim()
        ? parsed.productId.trim()
        : null;

    return { promo: { productId }, exists: true };
  } catch {
    return { promo: { productId: null }, exists: false };
  }
}

export async function writeSearchPromoToBlob(promo: SearchPromo) {
  return put(
    SEARCH_PROMO_BLOB_PATH,
    JSON.stringify({ productId: promo.productId, updatedAt: new Date().toISOString() }),
    {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
      contentType: 'application/json; charset=utf-8',
    }
  );
}
