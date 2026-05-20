'use client';

import Avatar from '@/components/common/Avatar';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import {
  Eye,
  Heart,
  MessageCircle,
  MoreHorizontal,
  AlertTriangle,
  Trash2,
  X,
} from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, showToast, showModal, posts, comments, addComment, deleteComment, deletePost } = useStore();
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [dbComments, setDbComments] = useState<typeof comments | null>(null);
  const fetchSeqRef = useRef(0);

  const post = posts.find((p) => p.id === params.id);

  const fetchComments = useCallback(async (postId: string, seq: number) => {
    if (!hasSupabaseEnv()) return;
    const sb = createClient();
    const { data: rows } = await sb
      .from('comments')
      .select('id, post_id, author_id, parent_comment_id, content, is_anonymous, anonymous_id, like_count, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (!rows || seq !== fetchSeqRef.current) return;

    const authorIds = [...new Set(rows.map((c) => c.author_id))];
    const profileMap: Record<string, { name: string; is_doctor: boolean }> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await sb.from('profiles').select('id, name, is_doctor').in('id', authorIds);
      for (const p of profiles ?? []) {
        profileMap[(p as any).id] = { name: (p as any).name, is_doctor: (p as any).is_doctor };
      }
    }
    if (seq !== fetchSeqRef.current) return;

    setDbComments(rows.map((c) => ({
      id: c.id,
      postId: c.post_id,
      authorId: c.author_id,
      authorName: profileMap[c.author_id]?.name ?? '익명',
      authorTitle: profileMap[c.author_id]?.is_doctor ? '의사' : undefined,
      parentCommentId: (c as any).parent_comment_id ?? undefined,
      content: c.content,
      isAnonymous: c.is_anonymous,
      anonymousId: (c as any).anonymous_id ?? undefined,
      likeCount: c.like_count ?? 0,
      date: c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR') : '',
    })));
  }, []);

  useEffect(() => {
    const postId = params.id as string;
    if (!/^[0-9a-f]{8}-/.test(postId)) return;
    const seq = ++fetchSeqRef.current;
    fetchComments(postId, seq);
  }, [params.id, fetchComments]);

  const postComments = dbComments !== null
    ? dbComments
    : comments.filter((c) => c.postId === params.id);

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar title="" />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400">게시글을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const isOwnPost = user?.id === post.authorId;

  const handleLike = () => {
    setLiked(!liked);
  };

  const handleSubmitComment = async () => {
    if (!user) {
      showToast('로그인이 필요합니다.');
      router.push('/login');
      return;
    }
    if (!commentText.trim()) return;

    const postId = params.id as string;
    const tempComment = {
      id: `comment-${Date.now()}`,
      postId,
      authorName: user.name,
      authorId: user.id,
      isAnonymous: post?.boardType === 'free',
      anonymousId: post?.boardType === 'free' ? String(Math.floor(Math.random() * 900) + 100) : undefined,
      content: commentText.trim(),
      date: new Date().toLocaleDateString('ko-KR'),
      likeCount: 0,
    };

    const tempId = tempComment.id;

    // stale 초기 fetch 무효화 + 낙관적 업데이트
    fetchSeqRef.current++;
    setDbComments((prev) => (prev !== null ? [...prev, tempComment] : [tempComment]));
    setCommentText('');

    const result = await addComment(tempComment);

    if (result.error) {
      showToast(result.error);
      setDbComments((prev) => prev ? prev.filter((c) => c.id !== tempId) : prev);
      setCommentText(tempComment.content);
      return;
    }

    showToast('댓글이 등록되었습니다.');
    // 임시 ID → 실제 UUID로 교체
    if (result.id) {
      setDbComments((prev) =>
        prev ? prev.map((c) => c.id === tempId ? { ...c, id: result.id as string } : c) : prev
      );
    }
    // 클라이언트에서 직접 최신 댓글 재조회
    if (/^[0-9a-f]{8}-/.test(postId)) {
      const seq = ++fetchSeqRef.current;
      fetchComments(postId, seq);
    }
  };

  const handleReport = () => {
    setShowMenu(false);
    showModal('신고하기', '이 게시글을 신고하시겠습니까?', () => {
      showToast('신고가 접수되었습니다.');
    });
  };

  const handleBlock = () => {
    setShowMenu(false);
    showModal('유저 차단하기', '이 유저를 차단하시겠습니까?', () => {
      showToast('유저가 차단되었습니다.');
    });
  };

  const handleDelete = () => {
    setShowMenu(false);
    showModal('삭제하기', '이 게시글을 삭제하시겠습니까?', () => {
      deletePost(params.id as string);
      showToast('게시글이 삭제되었습니다.');
      router.push('/community');
    });
  };

  const handleEdit = () => {
    setShowMenu(false);
    showToast('수정 페이지로 이동합니다.');
  };

  return (
    <div className="min-h-screen bg-white pb-[86px]">
      <TopBar
        title=""
        rightContent={
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1"
          >
            <MoreHorizontal size={22} className="text-gray-700" />
          </button>
        }
      />

      {/* More menu dropdown */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-4 top-12 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {isOwnPost ? (
              <>
                <button
                  onClick={handleDelete}
                  className="block w-full px-5 py-3 text-sm text-left text-red-500"
                >
                  삭제하기
                </button>
                <button
                  onClick={handleEdit}
                  className="block w-full px-5 py-3 text-sm text-left text-gray-700 border-t border-gray-100"
                >
                  수정하기
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleReport}
                  className="block w-full px-5 py-3 text-sm text-left text-red-500"
                >
                  신고하기
                </button>
                <button
                  onClick={handleBlock}
                  className="block w-full px-5 py-3 text-sm text-left text-gray-700 border-t border-gray-100"
                >
                  유저 차단하기
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Free board warning */}
      {post.boardType === 'free' && showWarning && (
        <div className="mx-4 mt-2 mb-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 relative">
          <button
            onClick={() => setShowWarning(false)}
            className="absolute top-2 right-2 p-1"
          >
            <X size={14} className="text-yellow-600" />
          </button>
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={16}
              className="text-yellow-600 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-xs font-bold text-yellow-700 mb-1">
                주의사항
              </p>
              <p className="text-[11px] text-yellow-600 leading-relaxed">
                자유익명게시판은 익명으로 운영됩니다. 타인을 비방하거나
                불쾌감을 주는 게시글은 관리자에 의해 삭제될 수 있으며, 관련
                법률에 따라 처벌을 받을 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Post content */}
      <div className="px-2.5 pb-4">
        {/* Author info */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar
            role={post.boardType === 'dental' ? 'doctor' : 'user'}
            seed={post.anonymousId || post.authorId || post.id}
            size={40}
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">
                {post.isAnonymous
                  ? `익명 ${post.anonymousId}`
                  : post.authorName}
              </span>
              {post.boardType === 'dental' && (
                <span className="px-1.5 py-0.5 bg-[#3182F6] text-white text-[10px] rounded font-medium">
                  치과
                </span>
              )}
            </div>
            {!post.isAnonymous && (
              <p className="text-xs text-gray-400">
                {post.authorTitle}
                {post.authorHospital && ` | ${post.authorHospital}`}
              </p>
            )}
          </div>
          <span className="text-xs text-gray-400">{post.date}</span>
        </div>

        {/* Title */}
        <h1 className="text-lg font-bold text-gray-900 mb-3">{post.title}</h1>

        {/* Content */}
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {post.content}
        </p>

        {/* Image */}
        {post.imageUrl && (
          <div className="mt-4 rounded-xl overflow-hidden bg-gray-100 relative aspect-video">
            <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center"><span className="text-gray-400 text-xs">IMG</span></div>
          </div>
        )}

        {/* View / Like counts */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Eye size={14} />
            {post.viewCount}
          </span>
          <button
            onClick={handleLike}
            className="flex items-center gap-1 text-xs text-gray-400"
          >
            <Heart
              size={14}
              className={liked ? 'fill-red-500 text-red-500' : ''}
            />
            {post.likeCount + (liked ? 1 : 0)}
          </button>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Copyright notice */}
        <div className="mt-4 bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            본 게시글의 저작권은 작성자에게 있으며, 무단 전재 및 배포를 금합니다.
            게시글 내용에 대한 책임은 작성자 본인에게 있습니다.
          </p>
        </div>
      </div>

      {/* Answer needed / answer count section */}
      {post.boardType === 'question' && (
        <div className="px-2.5 py-3 bg-gray-50 border-y border-gray-100">
          {post.hasAnswer && post.answerCount && post.answerCount > 0 ? (
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-[#3182F6]" />
              <span className="text-sm font-medium text-[#3182F6]">
                {post.answerCount}명이 답변했어요
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-500">
                답변이 필요해요!
              </span>
            </div>
          )}
        </div>
      )}

      {/* Comments section */}
      <div className="px-2.5 py-4">
        <h3 className="text-sm font-bold text-gray-900 mb-4">
          댓글 {postComments.length}
        </h3>

        {postComments.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-gray-400">
              아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {postComments.map((comment) => (
              <div key={comment.id} className="pb-4 border-b border-gray-100 last:border-0">
                {/* Comment author */}
                <div className="flex items-center gap-2.5 mb-2">
                  <Avatar seed={comment.anonymousId || comment.authorId || comment.id} size={32} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">
                        {comment.isAnonymous
                          ? `익명 ${comment.anonymousId}`
                          : comment.authorName}
                      </span>
                      {comment.authorTitle && (
                        <span className="text-[10px] text-gray-400">
                          {comment.authorTitle}
                          {comment.authorHospital &&
                            ` | ${comment.authorHospital}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {comment.date}
                  </span>
                </div>

                {/* Comment content */}
                <p className="text-sm text-gray-700 leading-relaxed ml-[42px] whitespace-pre-line">
                  {comment.content}
                </p>

                {/* Comment actions */}
                <div className="flex items-center gap-4 ml-[42px] mt-2">
                  <button className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Heart size={12} />
                    {comment.likeCount}
                  </button>
                  <button className="flex items-center gap-1 text-[10px] text-gray-400">
                    <MessageCircle size={12} />
                    답글
                  </button>
                  {user?.id === comment.authorId && (
                    <button
                      onClick={() => {
                        showModal('댓글 삭제', '이 댓글을 삭제하시겠습니까?', () => {
                          deleteComment(comment.id);
                          setDbComments((prev) => prev ? prev.filter((c) => c.id !== comment.id) : prev);
                          showToast('댓글이 삭제되었습니다.');
                        });
                      }}
                      className="flex items-center gap-1 text-[10px] text-red-400"
                    >
                      <Trash2 size={12} />
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment input - fixed at bottom */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 px-2.5 py-3 z-50">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={commentText}
              onChange={(e) => {
                if (e.target.value.length <= 5000) {
                  setCommentText(e.target.value);
                }
              }}
              placeholder="댓글을 입력해주세요"
              rows={1}
              className="w-full px-2.5 py-2.5 bg-gray-100 rounded-xl text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#3182F6]"
              style={{ minHeight: '40px', maxHeight: '100px' }}
            />
            <span className="absolute right-3 bottom-2 text-[10px] text-gray-400">
              {commentText.length}/5000자
            </span>
          </div>
          <button
            onClick={handleSubmitComment}
            disabled={!commentText.trim()}
            className={`px-2.5 py-2.5 rounded-xl text-sm font-medium flex-shrink-0 transition-colors ${
              commentText.trim()
                ? 'bg-[#3182F6] text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
}
