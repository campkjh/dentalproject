'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

export default function EditPostPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <EditPostPage />
    </Suspense>
  );
}

function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const { posts, showToast } = useStore();
  const postId = params.id as string;
  const post = posts.find((p) => p.id === postId);

  const [title, setTitle] = useState(post?.title ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
    }
  }, [post]);

  const handleSubmit = async () => {
    if (!title.trim()) { showToast('제목을 입력해주세요.'); return; }
    if (!content.trim()) { showToast('내용을 입력해주세요.'); return; }
    if (submitting) return;

    setSubmitting(true);
    try {
      if (hasSupabaseEnv() && /^[0-9a-f]{8}-/.test(postId)) {
        const sb = createClient();
        const { error } = await sb.from('posts').update({ title: title.trim(), content: content.trim() }).eq('id', postId);
        if (error) { showToast('수정 실패: ' + error.message); return; }
      }
      showToast('게시글이 수정되었습니다.');
      router.push(`/community/${postId}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar title="글수정" />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400">게시글을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <TopBar title="글수정" />
      <div className="px-2.5 py-4 space-y-5">
        <div>
          <label className="text-sm font-bold text-gray-900 mb-2 block">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="제목을 입력해주세요"
            className="w-full border border-gray-200 rounded-xl px-2.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-gray-900 mb-2 block">내용</label>
          <textarea
            value={content}
            onChange={(e) => { if (e.target.value.length <= 5000) setContent(e.target.value); }}
            rows={12}
            placeholder="내용을 입력해주세요"
            className="w-full border border-gray-200 rounded-xl px-2.5 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
          <p className="text-xs text-gray-400 text-right">{content.length}/5000자</p>
        </div>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-2.5 py-3 bg-white border-t border-gray-100">
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !content.trim()}
          className={`w-full py-3.5 rounded-xl text-sm font-bold transition-colors ${
            submitting || !title.trim() || !content.trim()
              ? 'bg-gray-200 text-gray-400'
              : 'bg-[#3182F6] text-white'
          }`}
        >
          {submitting ? '수정 중...' : '수정 완료'}
        </button>
      </div>
    </div>
  );
}
