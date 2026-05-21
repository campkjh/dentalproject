'use client';

import Avatar from '@/components/common/Avatar';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import {
  Eye, Heart, MessageCircle, MoreHorizontal,
  AlertTriangle, Trash2, X, CornerDownRight,
} from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';

type CommentItem = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorTitle?: string;
  authorHospital?: string;
  parentCommentId?: string;
  content: string;
  isAnonymous: boolean;
  anonymousId?: string;
  likeCount: number;
  date: string;
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, showToast, showModal, posts, deletePost } = useStore();
  const postId = params.id as string;
  const isRealPost = /^[0-9a-f]{8}-/.test(postId);

  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [dbComments, setDbComments] = useState<CommentItem[] | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const fetchSeqRef = useRef(0);
  const viewedRef = useRef(false);

  const post = posts.find((p) => p.id === postId);

  /* ── 댓글 로드 ── */
  const fetchComments = useCallback(async (seq: number) => {
    if (!isRealPost || !hasSupabaseEnv()) return;
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

    // 댓글 좋아요 수 로드
    const commentIds = rows.map((c) => c.id);
    if (commentIds.length > 0) {
      const { data: clikes } = await sb
        .from('comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', commentIds);
      const likeMap: Record<string, { liked: boolean; count: number }> = {};
      for (const id of commentIds) {
        const rows2 = (clikes ?? []).filter((cl: any) => cl.comment_id === id);
        likeMap[id] = {
          liked: user?.id ? rows2.some((cl: any) => cl.user_id === user.id) : false,
          count: rows2.length,
        };
      }
      if (seq === fetchSeqRef.current) setCommentLikes(likeMap);
    }

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
  }, [postId, isRealPost]);

  /* ── 초기 로드 ── */
  useEffect(() => {
    const seq = ++fetchSeqRef.current;
    fetchComments(seq);
  }, [fetchComments]);

  /* ── 조회수 증가 (1회) ── */
  useEffect(() => {
    if (!isRealPost || !hasSupabaseEnv() || viewedRef.current || !post) return;
    viewedRef.current = true;
    setViewCount((post.viewCount ?? 0) + 1);
    createClient().rpc('increment_view_count', { p_post_id: postId });
  }, [isRealPost, postId, post]);

  /* ── 좋아요 초기 상태 + 카운트 DB에서 직접 로드 ── */
  useEffect(() => {
    if (!isRealPost || !hasSupabaseEnv()) return;
    const sb = createClient();
    // post_likes 테이블에서 직접 카운트 (posts.like_count RLS 우회)
    sb.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId)
      .then(({ count }) => { if (count !== null) setLikeCount(count); });
    // 스토어 user.id = auth.uid() 보장 (SessionProvider에서 검증됨)
    if (user?.id) {
      sb.from('post_likes').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setLiked(!!data));
    }
  }, [isRealPost, postId, user?.id]);

  const postComments = dbComments ?? [];
  const topComments = postComments.filter((c) => !c.parentCommentId);
  const replies = (parentId: string) => postComments.filter((c) => c.parentCommentId === parentId);

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

  /* ── 좋아요 토글 ── */
  const handleLike = async () => {
    if (!user?.id) { showToast('로그인이 필요합니다.'); return; }
    if (!isRealPost || !hasSupabaseEnv()) return;
    // 낙관적 업데이트
    setLiked((prev) => !prev);
    setLikeCount((n) => liked ? Math.max(0, n - 1) : n + 1);
    const { data, error } = await createClient().rpc('toggle_post_like', {
      p_post_id: postId,
      p_user_id: user.id,
    });
    if (error) {
      // 롤백
      setLiked((prev) => !prev);
      setLikeCount((n) => liked ? n + 1 : Math.max(0, n - 1));
      showToast('오류: ' + error.message);
    } else if (data) {
      setLiked(data.liked);
      setLikeCount(data.count);
    }
  };

  /* ── 댓글 등록 ── */
  const handleSubmitComment = async () => {
    if (!user) { showToast('로그인이 필요합니다.'); router.push('/login'); return; }
    if (!commentText.trim()) return;

    const tempId = `comment-${Date.now()}`;
    const tempComment: CommentItem = {
      id: tempId,
      postId,
      authorName: user.name,
      authorId: user.id,
      authorTitle: user.isDoctor ? '의사' : undefined,
      isAnonymous: post.boardType === 'free',
      anonymousId: post.boardType === 'free' ? String(Math.floor(Math.random() * 900) + 100) : undefined,
      content: commentText.trim(),
      date: new Date().toLocaleDateString('ko-KR'),
      likeCount: 0,
      parentCommentId: replyTo?.id,
    };

    // 낙관적 업데이트
    fetchSeqRef.current++;
    setDbComments((prev) => [...(prev ?? []), tempComment]);
    setCommentText('');
    setReplyTo(null);

    if (isRealPost && hasSupabaseEnv()) {
      const sb = createClient();
      const { data, error } = await sb
        .from('comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: tempComment.content,
          is_anonymous: tempComment.isAnonymous,
          anonymous_id: tempComment.anonymousId ?? null,
          parent_comment_id: tempComment.parentCommentId ?? null,
        })
        .select('id')
        .single();

      if (error) {
        showToast('댓글 등록 실패: ' + error.message);
        setDbComments((prev) => prev ? prev.filter((c) => c.id !== tempId) : prev);
        setCommentText(tempComment.content);
        return;
      }
      showToast('댓글이 등록되었습니다.');
      setDbComments((prev) => prev ? prev.map((c) => c.id === tempId ? { ...c, id: data.id } : c) : prev);
      // DB 재조회
      const seq = ++fetchSeqRef.current;
      fetchComments(seq);
    } else {
      showToast('댓글이 등록되었습니다.');
    }
  };

  /* ── 댓글 좋아요 토글 ── */
  const handleCommentLike = async (commentId: string) => {
    if (!user?.id) { showToast('로그인이 필요합니다.'); return; }
    if (!isRealPost || !hasSupabaseEnv()) return;
    const current = commentLikes[commentId] ?? { liked: false, count: 0 };
    // 낙관적 업데이트
    setCommentLikes((prev) => ({
      ...prev,
      [commentId]: { liked: !current.liked, count: current.liked ? Math.max(0, current.count - 1) : current.count + 1 },
    }));
    const { data, error } = await createClient().rpc('toggle_comment_like', {
      p_comment_id: commentId,
      p_user_id: user.id,
    });
    if (error) {
      setCommentLikes((prev) => ({ ...prev, [commentId]: current }));
      showToast('오류: ' + error.message);
    } else if (data) {
      setCommentLikes((prev) => ({ ...prev, [commentId]: { liked: data.liked, count: data.count } }));
    }
  };

  /* ── 댓글 삭제 ── */
  const handleDeleteComment = async (commentId: string) => {
    showModal('댓글 삭제', '이 댓글을 삭제하시겠습니까?', async () => {
      setDbComments((prev) => prev ? prev.filter((c) => c.id !== commentId && c.parentCommentId !== commentId) : prev);
      if (isRealPost && hasSupabaseEnv()) {
        const sb = createClient();
        const { error } = await sb.from('comments').delete().eq('id', commentId);
        if (error) {
          showToast('삭제 실패: ' + error.message);
          const seq = ++fetchSeqRef.current;
          fetchComments(seq);
          return;
        }
      }
      showToast('댓글이 삭제되었습니다.');
    });
  };

  /* ── 게시글 삭제 ── */
  const handleDelete = () => {
    setShowMenu(false);
    showModal('삭제하기', '이 게시글을 삭제하시겠습니까?', async () => {
      if (isRealPost && hasSupabaseEnv()) {
        const sb = createClient();
        const { error } = await sb.from('posts').delete().eq('id', postId);
        if (error) { showToast('삭제 실패: ' + error.message); return; }
      }
      deletePost(postId);
      showToast('게시글이 삭제되었습니다.');
      router.push('/community');
    });
  };

  /* ── 게시글 수정 ── */
  const handleEdit = () => {
    setShowMenu(false);
    router.push(`/community/${postId}/edit`);
  };

  const doctorAnswerCount = postComments.filter((c) => c.authorTitle === '의사').length;
  const hasAnswer = doctorAnswerCount > 0 || (post.hasAnswer && (post.answerCount ?? 0) > 0);

  /* ── 댓글 카드 컴포넌트 ── */
  const CommentCard = ({ comment, isReply = false }: { comment: CommentItem; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-10 mt-2' : 'pb-4 border-b border-gray-100 last:border-0'}`}>
      {isReply && (
        <div className="flex items-center gap-1 mb-1">
          <CornerDownRight size={12} className="text-gray-300" />
        </div>
      )}
      <div className="flex items-center gap-2.5 mb-2">
        <Avatar seed={comment.anonymousId || comment.authorId || comment.id} size={isReply ? 26 : 32} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-900">
              {comment.isAnonymous ? `익명 ${comment.anonymousId}` : comment.authorName}
            </span>
            {comment.authorTitle === '의사' && (
              <span className="px-1.5 py-0.5 bg-[#3182F6] text-white text-[10px] rounded font-medium">의사</span>
            )}
          </div>
        </div>
        <span className="text-[10px] text-gray-400">{comment.date}</span>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed ml-[38px] whitespace-pre-line">{comment.content}</p>

      <div className="flex items-center gap-4 ml-[38px] mt-2">
        <button
          onClick={() => handleCommentLike(comment.id)}
          className={`flex items-center gap-1 text-[10px] ${commentLikes[comment.id]?.liked ? 'text-red-400' : 'text-gray-400'}`}
        >
          <Heart size={12} className={commentLikes[comment.id]?.liked ? 'fill-red-400' : ''} />
          {commentLikes[comment.id]?.count ?? comment.likeCount}
        </button>
        {!isReply && (
          <button
            onClick={() => setReplyTo({ id: comment.id, authorName: comment.isAnonymous ? `익명 ${comment.anonymousId}` : comment.authorName })}
            className="flex items-center gap-1 text-[10px] text-gray-400"
          >
            <MessageCircle size={12} />답글
          </button>
        )}
        {user?.id === comment.authorId && (
          <button onClick={() => handleDeleteComment(comment.id)} className="flex items-center gap-1 text-[10px] text-red-400">
            <Trash2 size={12} />삭제
          </button>
        )}
      </div>

      {/* 대댓글 */}
      {!isReply && replies(comment.id).map((r) => (
        <CommentCard key={r.id} comment={r} isReply />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-[86px]">
      <TopBar
        title=""
        rightContent={
          <button onClick={() => setShowMenu(!showMenu)} className="p-1">
            <MoreHorizontal size={22} className="text-gray-700" />
          </button>
        }
      />

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-4 top-12 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {isOwnPost ? (
              <>
                <button onClick={handleDelete} className="block w-full px-5 py-3 text-sm text-left text-red-500">삭제하기</button>
                <button onClick={handleEdit} className="block w-full px-5 py-3 text-sm text-left text-gray-700 border-t border-gray-100">수정하기</button>
              </>
            ) : (
              <>
                <button onClick={() => { setShowMenu(false); showModal('신고하기', '이 게시글을 신고하시겠습니까?', () => showToast('신고가 접수되었습니다.')); }} className="block w-full px-5 py-3 text-sm text-left text-red-500">신고하기</button>
                <button onClick={() => { setShowMenu(false); showModal('유저 차단하기', '이 유저를 차단하시겠습니까?', () => showToast('유저가 차단되었습니다.')); }} className="block w-full px-5 py-3 text-sm text-left text-gray-700 border-t border-gray-100">유저 차단하기</button>
              </>
            )}
          </div>
        </>
      )}

      {post.boardType === 'free' && showWarning && (
        <div className="mx-4 mt-2 mb-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 relative">
          <button onClick={() => setShowWarning(false)} className="absolute top-2 right-2 p-1">
            <X size={14} className="text-yellow-600" />
          </button>
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-yellow-700 mb-1">주의사항</p>
              <p className="text-[11px] text-yellow-600 leading-relaxed">
                자유익명게시판은 익명으로 운영됩니다. 타인을 비방하거나 불쾌감을 주는 게시글은 관리자에 의해 삭제될 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="px-2.5 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar role={post.boardType === 'dental' ? 'doctor' : 'user'} seed={post.anonymousId || post.authorId || post.id} size={40} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">
                {post.isAnonymous ? `익명 ${post.anonymousId}` : post.authorName}
              </span>
              {post.boardType === 'dental' && (
                <span className="px-1.5 py-0.5 bg-[#3182F6] text-white text-[10px] rounded font-medium">치과</span>
              )}
            </div>
            {!post.isAnonymous && (
              <p className="text-xs text-gray-400">{post.authorTitle}{post.authorHospital && ` | ${post.authorHospital}`}</p>
            )}
          </div>
          <span className="text-xs text-gray-400">{post.date}</span>
        </div>

        <h1 className="text-lg font-bold text-gray-900 mb-3">{post.title}</h1>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{post.content}</p>

        {post.imageUrl && (
          <div className="mt-4 rounded-xl overflow-hidden bg-gray-100 relative aspect-video">
            <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center">
              <span className="text-gray-400 text-xs">IMG</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Eye size={14} />{viewCount || post.viewCount}
          </span>
          <button onClick={handleLike} className="flex items-center gap-1 text-xs">
            <Heart size={14} className={liked ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
            <span className={liked ? 'text-red-500' : 'text-gray-400'}>{likeCount}</span>
          </button>
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((tag) => (
              <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        <div className="mt-4 bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            본 게시글의 저작권은 작성자에게 있으며, 무단 전재 및 배포를 금합니다.
          </p>
        </div>
      </div>

      {post.boardType === 'question' && (
        <div className="px-2.5 py-3 bg-gray-50 border-y border-gray-100">
          {hasAnswer ? (
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-[#3182F6]" />
              <span className="text-sm font-medium text-[#3182F6]">{doctorAnswerCount || post.answerCount}명이 답변했어요</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-500">답변이 필요해요!</span>
            </div>
          )}
        </div>
      )}

      <div className="px-2.5 py-4">
        <h3 className="text-sm font-bold text-gray-900 mb-4">댓글 {postComments.length}</h3>
        {topComments.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-gray-400">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topComments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>

      {/* 댓글 입력 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 z-50">
        {replyTo && (
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs text-gray-500">
              <CornerDownRight size={12} className="inline mr-1" />
              <span className="font-medium">{replyTo.authorName}</span>에게 답글
            </span>
            <button onClick={() => setReplyTo(null)} className="p-1">
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 px-2.5 py-3">
          <div className="flex-1 relative">
            <textarea
              value={commentText}
              onChange={(e) => { if (e.target.value.length <= 5000) setCommentText(e.target.value); }}
              placeholder={replyTo ? '답글을 입력해주세요' : '댓글을 입력해주세요'}
              rows={1}
              className="w-full px-2.5 py-2.5 bg-gray-100 rounded-xl text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#3182F6]"
              style={{ minHeight: '40px', maxHeight: '100px' }}
            />
            <span className="absolute right-3 bottom-2 text-[10px] text-gray-400">{commentText.length}/5000자</span>
          </div>
          <button
            onClick={handleSubmitComment}
            disabled={!commentText.trim()}
            className={`px-2.5 py-2.5 rounded-xl text-sm font-medium flex-shrink-0 transition-colors ${commentText.trim() ? 'bg-[#3182F6] text-white' : 'bg-gray-200 text-gray-400'}`}
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
}
