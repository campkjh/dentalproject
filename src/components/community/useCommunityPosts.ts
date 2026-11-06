'use client';

import { useCallback, useEffect } from 'react';
import { communityViewerKey, useStore } from '@/store';
import type { Post } from '@/types';

const EMPTY_POSTS: Post[] = [];

export function useCommunityPosts() {
  const viewerKey = useStore(communityViewerKey);
  const feed = useStore(s => s.communityFeed);
  const posts = useStore(s => s.communityFeed.key === viewerKey ? s.posts : EMPTY_POSTS);
  const hydrateCommunity = useStore(s => s.hydrateCommunity);
  const refresh = useCallback(() => { void hydrateCommunity({ force: true }); }, [hydrateCommunity]);
  const loading = feed.key !== viewerKey || feed.loading;
  const error = feed.key === viewerKey ? feed.error : '';

  useEffect(() => {
    void hydrateCommunity();
  }, [hydrateCommunity, viewerKey]);

  useEffect(() => {
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refreshVisible);
    window.addEventListener('dental:community-comments', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    const timer = window.setInterval(refreshVisible, 30000);
    return () => {
      window.removeEventListener('focus', refreshVisible);
      window.removeEventListener('dental:community-comments', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { posts, loading, error, refresh };
}
