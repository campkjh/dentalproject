'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/store';
import type { Post } from '@/types';

export function useCommunityPosts() {
  const posts = useStore(s => s.posts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => { setLoading(true); setError(''); setRevision(n => n + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/posts?limit=100', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || '게시글을 불러오지 못했습니다.');
        if (!Array.isArray(payload.posts)) throw new Error('게시글 응답이 올바르지 않습니다.');
        if (!controller.signal.aborted) useStore.setState({ posts: payload.posts as Post[] });
      })
      .catch(() => { if (!controller.signal.aborted) setError('게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  return { posts, loading, error, refresh };
}
