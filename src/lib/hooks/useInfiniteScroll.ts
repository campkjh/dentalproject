'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tracks how many items of a list should be visible, growing automatically
 * when the returned sentinel ref enters the viewport.
 *
 * Usage:
 *   const { visibleCount, sentinelRef } = useInfiniteScroll(filtered.length, 10);
 *   const visible = filtered.slice(0, visibleCount);
 *   ...
 *   {visibleCount < filtered.length && <div ref={sentinelRef} />}
 */
export function useInfiniteScroll(totalCount: number, pageSize = 10) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset back to the first page whenever the underlying list shrinks/swaps.
  useEffect(() => {
    setVisibleCount((current) => Math.min(current, Math.max(totalCount, pageSize)));
  }, [totalCount, pageSize]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (visibleCount >= totalCount) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisibleCount((c) => Math.min(c + pageSize, totalCount));
          }
        }
      },
      { rootMargin: '120px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, totalCount, pageSize]);

  const reset = () => setVisibleCount(pageSize);

  return { visibleCount, sentinelRef, reset };
}
