'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store';
import type { Post } from '@/types';
import CommunityComposer from '@/components/community/CommunityComposer';
import { CommunitySkeleton } from '@/components/community/CommunityDetail';
import styles from '@/components/community/community.module.css';

export default function EditCommunityPost() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const storePost = useStore(s => s.posts.find(p => p.id === id));
  const user = useStore(s => s.user);
  const [fetchedPost, setFetchedPost] = useState<Post | null>(null);
  const [error, setError] = useState('');
  const post = storePost || fetchedPost;
  useEffect(() => {
    if (storePost) return;
    const controller = new AbortController();
    fetch(`/api/posts/${id}`, { signal: controller.signal }).then(async r => {
      const payload = await r.json();
      if (!r.ok) throw new Error(payload.error || '게시글을 불러오지 못했습니다.');
      if (!controller.signal.aborted) setFetchedPost(payload.post);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '게시글을 불러오지 못했습니다.'); });
    return () => controller.abort();
  }, [id, storePost]);
  return <div className={styles.standaloneCompose}>{post && user?.id === post.authorId ? <CommunityComposer key={post.id} post={post} onClose={() => router.push(`/community/${id}`)} onPosted={() => router.push(`/community/${id}`)} />
    : error || (post && user?.id !== post.authorId) ? <div className={styles.empty}><p>{error || '본인이 작성한 글만 수정할 수 있습니다.'}</p><Link href="/community">커뮤니티로 돌아가기</Link></div> : <CommunitySkeleton />}</div>;
}
