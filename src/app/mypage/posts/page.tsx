'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/common/TopBar';
import CommunityPostCard from '@/components/community/CommunityPostCard';
import { Screen, EmptyBlock, NeedLogin } from '@/components/mypage/screens/ScreenKit';
import { useSession } from '@/lib/supabase/SessionProvider';
import { ownPosts } from '@/lib/own-posts';
import type { Post } from '@/types';

export default function MyPostsPage() {
  const { authUser, loading } = useSession();
  const ownerId = authUser?.id;
  const [result, setResult] = useState<{ ownerId: string; posts: Post[]; error?: string } | null>(null);
  useEffect(() => {
    if (!ownerId) return;
    const controller = new AbortController();
    fetch('/api/posts/mine', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('내가 쓴 글을 불러오지 못했어요. 다시 시도해주세요.');
        const data = await response.json();
        if (data.userId !== ownerId || !Array.isArray(data.posts)) throw new Error('로그인 정보를 다시 확인해주세요.');
        if (!controller.signal.aborted) setResult({ ownerId, posts: ownPosts(data.posts, ownerId) });
      })
      .catch(error => {
        if (!controller.signal.aborted) setResult({ ownerId, posts: [], error: error instanceof Error ? error.message : '글을 불러오지 못했어요.' });
      });
    return () => controller.abort();
  }, [ownerId]);
  const current = result?.ownerId === ownerId ? result : null;
  return <Screen>
    <TopBar title="내가 쓴 글" sub="내가 남긴 커뮤니티 글을 모았어요" />
    {loading || (ownerId && !current) ? <p className="px-6 py-12 text-center text-[#8B95A1]">글을 불러오는 중이에요.</p>
      : !ownerId ? <NeedLogin />
      : current?.error ? <p role="alert" className="px-6 py-12 text-center text-[#8B95A1]">{current.error}</p>
      : !current?.posts.length ? <EmptyBlock icon="chat" title="아직 작성한 글이 없어요" desc="커뮤니티에서 이야기를 남기면 이곳에 모여요." />
      : <div className="px-[24px] pb-8 pc:px-0">
        <p className="mb-3 text-[14px] text-[#8B95A1]">내가 쓴 글 {current.posts.length}개</p>
        {current.posts.map(post => <CommunityPostCard key={post.id} post={post} onDeleted={() => setResult(previous => previous?.ownerId === ownerId ? { ...previous, posts: previous.posts.filter(item => item.id !== post.id) } : previous)} />)}
      </div>}
  </Screen>;
}
