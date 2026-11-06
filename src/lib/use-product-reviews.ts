'use client';
import { useEffect, useState } from 'react';
import type { Review } from '@/types';

type Result = { key: string; reviews: Review[]; state: 'ready' | 'error' };
export function useProductReviews(productId: string | undefined, viewerId: string | undefined, fallback: Review[]) {
  const key = JSON.stringify([productId, viewerId]);
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    if (!productId || !viewerId) return;
    const requestKey = JSON.stringify([productId, viewerId]);
    const controller = new AbortController();
    let alive = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetch(`/api/products/${encodeURIComponent(productId)}/reviews`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('review load failed');
        const payload = await response.json();
        if (!Array.isArray(payload.reviews)) throw new Error('invalid reviews');
        if (alive) setResult({ key: requestKey, reviews: payload.reviews, state: 'ready' });
      })
      .catch(() => { if (alive) setResult({ key: requestKey, reviews: [], state: 'error' }); })
      .finally(() => clearTimeout(timeout));
    return () => { alive = false; clearTimeout(timeout); controller.abort(); };
  }, [productId, viewerId]);
  const current = result?.key === key ? result : null;
  return { reviews: current?.state === 'ready' ? current.reviews : fallback,
    loading: !!productId && !!viewerId && !current, error: current?.state === 'error' };
}
