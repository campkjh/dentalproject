const LEGACY_PRODUCT_IMAGE_MAP: Record<string, string> = {
  '/images/product1.jpg': '/partner-template/reservation-1.png',
  '/images/product2.jpg': '/partner-template/reservation-2a.png',
  '/images/product3.jpg': '/partner-template/reservation-2b.png',
  '/images/product4.jpg': '/partner-template/reservation-2c.png',
  '/images/product5.jpg': '/partner-template/reservation-3c.png',
  '/images/product6.jpg': '/partner-template/reservation-1.png',
};

const DETAIL_IMAGE_TAG_PREFIX = '__detail_image_url:';

export function normalizeProductImageUrl(value?: string | null) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const mapped = LEGACY_PRODUCT_IMAGE_MAP[withSlash.toLowerCase()];
  if (mapped) return mapped;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) return trimmed;
  return withSlash;
}

export function getVisibleProductTags(tags?: string[] | null) {
  return (tags ?? []).filter((tag) => !tag.startsWith(DETAIL_IMAGE_TAG_PREFIX));
}

export function extractProductDetailImageUrl(tags?: string[] | null) {
  const encoded = (tags ?? [])
    .find((tag) => tag.startsWith(DETAIL_IMAGE_TAG_PREFIX))
    ?.slice(DETAIL_IMAGE_TAG_PREFIX.length);
  if (!encoded) return undefined;
  try {
    return normalizeProductImageUrl(decodeURIComponent(encoded));
  } catch {
    return normalizeProductImageUrl(encoded);
  }
}

export function mergeProductDetailImageTag(tags: string[] | undefined, detailImageUrl: string | null | undefined) {
  const visibleTags = getVisibleProductTags(tags);
  const normalized = normalizeProductImageUrl(detailImageUrl);
  if (!normalized) return visibleTags;
  return [...visibleTags, `${DETAIL_IMAGE_TAG_PREFIX}${encodeURIComponent(normalized)}`];
}
