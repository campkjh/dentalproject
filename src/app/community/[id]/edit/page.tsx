'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Camera, X } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { communityTags } from '@/lib/mock-data';

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

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setSelectedTags(post.tags ?? []);
      setImagePreview(post.imageUrl ?? null);
    }
  }, [post]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('이미지 파일만 선택해주세요.'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('10MB 이하 이미지만 등록할 수 있습니다.'); return; }

    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'community-posts');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('업로드 실패');
      const blob = await res.json();
      setImagePreview(blob.url);
    } catch {
      showToast('이미지 업로드에 실패했습니다.');
      setImagePreview(post?.imageUrl ?? null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(preview);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 5 ? prev : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) { showToast('제목을 입력해주세요.'); return; }
    if (!content.trim()) { showToast('내용을 입력해주세요.'); return; }
    if (submitting || uploading) return;

    setSubmitting(true);
    try {
      if (hasSupabaseEnv() && /^[0-9a-f]{8}-/.test(postId)) {
        const sb = createClient();
        const { error } = await sb.from('posts').update({
          title: title.trim(),
          content: content.trim(),
          tags: selectedTags,
          image_url: imagePreview || null,
          thumbnail_url: imagePreview || null,
        }).eq('id', postId);
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
        {/* 제목 */}
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

        {/* 내용 */}
        <div>
          <label className="text-sm font-bold text-gray-900 mb-2 block">내용</label>
          <textarea
            value={content}
            onChange={(e) => { if (e.target.value.length <= 5000) setContent(e.target.value); }}
            rows={10}
            placeholder="내용을 입력해주세요"
            className="w-full border border-gray-200 rounded-xl px-2.5 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
          <p className="text-xs text-gray-400 text-right">{content.length}/5000자</p>
        </div>

        {/* 이미지 첨부 */}
        <div>
          <label className="text-sm font-bold text-gray-900 mb-2 block">이미지 첨부 <span className="text-gray-400 font-normal">[선택]</span></label>
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={imagePreview} alt="" className="w-full object-cover max-h-48 rounded-xl" />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
              >
                <X size={14} className="text-white" />
              </button>
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                  <p className="text-white text-sm">업로드 중...</p>
                </div>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#3182F6] transition-colors">
              <Camera size={24} className="text-gray-300 mb-1" />
              <span className="text-xs text-gray-400">사진 추가</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </label>
          )}
        </div>

        {/* 태그 선택 (질문게시판 제외) */}
        {post.boardType !== 'question' && (
          <div>
            <label className="text-sm font-bold text-gray-900 mb-2 block">
              해시태그 <span className="text-gray-400 font-normal">[선택]</span>
              <span className="text-xs text-gray-400 font-normal ml-2">{selectedTags.length}/5</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {communityTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isSelected ? 'bg-[#3182F6] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-2.5 py-3 bg-white border-t border-gray-100">
        <button
          onClick={handleSubmit}
          disabled={submitting || uploading || !title.trim() || !content.trim()}
          className={`w-full py-3.5 rounded-xl text-sm font-bold transition-colors ${
            submitting || uploading || !title.trim() || !content.trim()
              ? 'bg-gray-200 text-gray-400'
              : 'bg-[#3182F6] text-white'
          }`}
        >
          {submitting ? '수정 중...' : uploading ? '이미지 업로드 중...' : '수정 완료'}
        </button>
      </div>
    </div>
  );
}
