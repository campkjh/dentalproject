import type { Metadata } from 'next';

export const PUBLIC_SITE_URL = 'https://my-doc.co.kr';

function publicImage(value?: string | null) {
  if (!value || /^(data:|blob:|\/\/)/i.test(value)) return undefined;
  try {
    const url = new URL(value, PUBLIC_SITE_URL);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function detailMetadata({ path, title, description, image }: {
  path: string; title: string; description: string; image?: string | null;
}): Metadata {
  const url = new URL(path, PUBLIC_SITE_URL).href;
  const imageUrl = publicImage(image);
  const images = imageUrl ? [{ url: imageUrl, alt: title }] : [];
  return {
    title: `${title} | 마이닥`, description,
    alternates: { canonical: url },
    openGraph: { type: 'website', locale: 'ko_KR', siteName: '마이닥', url, title, description, images },
    twitter: { card: imageUrl ? 'summary_large_image' : 'summary', title, description, images: imageUrl ? [imageUrl] : [] },
  };
}

export function unavailableDetailMetadata(): Metadata {
  return { title: '마이닥', description: '내 주변 병원과 시술을 찾아보세요.', robots: { index: false, follow: false }, openGraph: { title: '마이닥', images: [] } };
}
