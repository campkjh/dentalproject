'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { visibleReviews } from '@/lib/review-moderation';
import type { Review } from '@/types';

type Result = { key: string; reviews: Review[]; state: 'ready' | 'error' };
export function useProductReviews(productId: string | undefined, viewerId: string | undefined, fallback: Review[]) {
  const blockedIds = useStore(state => state.blockedReviewAuthorIds);
  const blockedKey = blockedIds.join(',');
  const key = JSON.stringify([productId, viewerId, blockedKey]);
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    if (!productId || !viewerId) return;
    const requestKey = JSON.stringify([productId, viewerId, blockedKey]);
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
  }, [productId, viewerId, blockedKey]);
  const current = result?.key === key ? result : null;
  return { reviews: visibleReviews(current?.state === 'ready' ? current.reviews : fallback, blockedIds),
    loading: !!productId && !!viewerId && !current, error: current?.state === 'error' };
}
