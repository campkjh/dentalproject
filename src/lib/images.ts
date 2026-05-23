const LEGACY_PRODUCT_IMAGE_MAP: Record<string, string> = {
  '/images/product1.jpg': '/partner-template/reservation-1.png',
  '/images/product2.jpg': '/partner-template/reservation-2a.png',
  '/images/product3.jpg': '/partner-template/reservation-2b.png',
  '/images/product4.jpg': '/partner-template/reservation-2c.png',
  '/images/product5.jpg': '/partner-template/reservation-3c.png',
  '/images/product6.jpg': '/partner-template/reservation-1.png',
};

const DETAIL_IMAGE_TAG_PREFIX = '__detail_image_url:';
const DEFAULT_HOSPITAL_IMAGE = '/partner-template/nav-hospital.svg';
const DEFAULT_DOCTOR_IMAGE = '/icons/profile-default-doctor.svg';
const FALLBACK_PRODUCT_IMAGES = [
  '/partner-template/reservation-1.png',
  '/partner-template/reservation-2a.png',
  '/partner-template/reservation-2b.png',
  '/partner-template/reservation-2c.png',
  '/partner-template/reservation-3c.png',
];

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

export function getFallbackProductImage(seed?: string | null) {
  const source = seed || 'product';
  let hash = 0;
  for (let i = 0; i < source.length; i++) hash = ((hash << 5) - hash) + source.charCodeAt(i);
  return FALLBACK_PRODUCT_IMAGES[Math.abs(hash) % FALLBACK_PRODUCT_IMAGES.length];
}

export function resolveProductImageUrl(value?: string | null, seed?: string | null) {
  return normalizeProductImageUrl(value) ?? getFallbackProductImage(seed);
}

export function resolveHospitalImageUrl(
  hospital?: {
    logoUrl?: string | null;
    logo_url?: string | null;
    imageUrl?: string | null;
    image_url?: string | null;
    coverImages?: (string | null | undefined)[] | null;
    cover_images?: (string | null | undefined)[] | null;
  } | null
) {
  if (!hospital) return DEFAULT_HOSPITAL_IMAGE;
  const cover = hospital.coverImages?.find(Boolean) ?? hospital.cover_images?.find(Boolean);
  return normalizeProductImageUrl(hospital.logoUrl)
    ?? normalizeProductImageUrl(hospital.logo_url)
    ?? normalizeProductImageUrl(hospital.imageUrl)
    ?? normalizeProductImageUrl(hospital.image_url)
    ?? normalizeProductImageUrl(cover)
    ?? DEFAULT_HOSPITAL_IMAGE;
}

export function resolveDoctorImageUrl(value?: string | null) {
  return normalizeProductImageUrl(value) ?? DEFAULT_DOCTOR_IMAGE;
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
