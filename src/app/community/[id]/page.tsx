'use client';

import Avatar from '@/components/common/Avatar';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
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
  authorTitle?: string;      // 직함 (원장 등)
  authorHospital?: string;   // 병원명
  authorSpecialty?: string;  // 전문분야
  authorProfileImage?: string;
  authorIsDoctor?: boolean;
  parentCommentId?: string;
  content: string;
  isAnonymous: boolean;
  anonymousId?: string;
  likeCount: number;
  date: string;
};

/* ── CommentCard: 컴포넌트 외부로 분리 (깜빡임 방지) ── */
const CommentCard = memo(function CommentCard({
  comment, isReply, commentLikes, userId, onLike, onReply, onDelete, replies,
}: {
  comment: CommentItem;
  isReply: boolean;
  commentLikes: Record<string, { liked: boolean; count: number }>;
  userId?: string;
  onLike: (id: string) => void;
  onReply: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  replies: CommentItem[];
}) {
  const cl = commentLikes[comment.id];
  const displayName = comment.isAnonymous ? `익명 ${comment.anonymousId}` : comment.authorName;

  return (
    <div className={isReply ? 'ml-10 mt-2' : 'pb-4 border-b border-gray-100 last:border-0'}>
      {isReply && <div className="flex items-center gap-1 mb-1"><CornerDownRight size={12} className="text-gray-300" /></div>}

      <div className="flex items-center gap-2.5 mb-2">
        <Avatar
          src={comment.authorProfileImage}
          role={comment.authorIsDoctor ? 'doctor' : 'user'}
          seed={comment.anonymousId || comment.authorId || comment.id}
          size={isReply ? 26 : 32}
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-gray-900">{displayName}</span>
            {comment.authorIsDoctor && !comment.isAnonymous && (
              <span className="px-1.5 py-0.5 bg-[#8037FF] text-white text-[12px] rounded font-medium">
                {comment.authorTitle ?? '의사'}
              </span>
            )}
          </div>
          {comment.authorIsDoctor && !comment.isAnonymous && (comment.authorHospital || comment.authorSpecialty) && (
            <p className="text-[12px] text-gray-400 mt-0.5">
              {[comment.authorHospital, comment.authorSpecialty].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <span className="text-[12px] text-gray-400">{comment.date}</span>
      </div>

      <p className="text-base text-gray-700 leading-relaxed ml-[38px] whitespace-pre-line">{comment.content}</p>

      <div className="flex items-center gap-4 ml-[38px] mt-2">
        <button
          onClick={() => onLike(comment.id)}
          className={`flex items-center gap-1 text-[12px] ${cl?.liked ? 'text-red-400' : 'text-gray-400'}`}
        >
          <Heart size={12} className={cl?.liked ? 'fill-red-400' : ''} />
          {cl?.count ?? comment.likeCount}
        </button>
        {!isReply && (
          <button onClick={() => onReply(comment.id, displayName)} className="flex items-center gap-1 text-[12px] text-gray-400">
            <MessageCircle size={12} />답글
          </button>
        )}
        {userId === comment.authorId && (
          <button onClick={() => onDelete(comment.id)} className="flex items-center gap-1 text-[12px] text-red-400">
            <Trash2 size={12} />삭제
          </button>
        )}
      </div>

      {!isReply && replies.map((r) => (
        <CommentCard
          key={r.id} comment={r} isReply commentLikes={commentLikes}
          userId={userId} onLike={onLike} onReply={onReply} onDelete={onDelete} replies={[]}
        />
      ))}
    </div>
  );
});

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

  // store에 없으면 DB에서 직접 로드
  const storePost = posts.find((p) => p.id === postId);
  const [dbPost, setDbPost] = useState<typeof posts[0] | null>(null);
  // 첫 렌더에서 바로 "찾을 수 없습니다" 대신 "불러오는 중..." 표시
  const [loadingPost, setLoadingPost] = useState(() => isRealPost && !posts.find((p) => p.id === postId));

  useEffect(() => {
    if (!isRealPost || storePost || !hasSupabaseEnv()) {
      setLoadingPost(false);
      return;
    }
    setLoadingPost(true);
    Promise.resolve(
      createClient()
        .from('posts')
        .select('id, board_type, title, content, author_id, view_count, like_count, comment_count, tags, has_answer, answer_count, is_anonymous, anonymous_id, image_url, created_at, author:profiles!posts_author_id_fkey(name, is_doctor)')
        .eq('id', postId)
        .single()
    ).then(({ data: p }) => {
      if (!p) return;
      setDbPost({
        id: p.id, boardType: (p as any).board_type, title: p.title, content: p.content,
        authorName: (p as any).author?.name ?? '익명',
        authorTitle: (p as any).author?.is_doctor ? '의사' : undefined,
        authorId: p.author_id, isAnonymous: (p as any).is_anonymous,
        anonymousId: (p as any).anonymous_id ?? undefined,
        date: (p as any).created_at ? new Date((p as any).created_at).toLocaleDateString('ko-KR') : '',
        viewCount: (p as any).view_count ?? 0, likeCount: (p as any).like_count ?? 0,
        commentCount: (p as any).comment_count ?? 0,
        imageUrl: (p as any).image_url ?? undefined,
        tags: (p as any).tags ?? [], hasAnswer: (p as any).has_answer ?? false,
        answerCount: (p as any).answer_count ?? 0,
      } as typeof posts[0]);
    }).finally(() => setLoadingPost(false));
  }, [isRealPost, storePost, postId]);

  const post = storePost ?? dbPost;

  /* ── 댓글 로드 (의사 병원/전문의 포함) ── */
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
    const profileMap: Record<string, { name: string; is_doctor: boolean; profile_image?: string }> = {};
    const doctorMap: Record<string, { title?: string; specialty?: string; profile_image?: string; hospital_name?: string }> = {};

    if (authorIds.length > 0) {
      const { data: profiles } = await sb.from('profiles').select('id, name, is_doctor, profile_image').in('id', authorIds);
      for (const p of profiles ?? []) {
        profileMap[(p as any).id] = { name: (p as any).name, is_doctor: (p as any).is_doctor, profile_image: (p as any).profile_image };
      }

      // 의사 정보 (병원명 + 전문분야)
      const doctorUserIds = (profiles ?? []).filter((p: any) => p.is_doctor).map((p: any) => p.id);
      if (doctorUserIds.length > 0) {
        const { data: doctors } = await sb
          .from('doctors')
          .select('user_id, title, specialty, profile_image, hospitals(name)')
          .in('user_id', doctorUserIds);
        for (const d of doctors ?? []) {
          doctorMap[(d as any).user_id] = {
            title: (d as any).title,
            specialty: (d as any).specialty,
            profile_image: (d as any).profile_image,
            hospital_name: (d as any).hospitals?.name,
          };
        }
      }
    }

    if (seq !== fetchSeqRef.current) return;

    // 댓글 좋아요
    const commentIds = rows.map((c) => c.id);
    if (commentIds.length > 0) {
      // comment_likes는 RLS로 본인 것만 보임 → liked 여부 체크용으로만 사용
      // count는 comments.like_count(트리거가 유지)로 읽음
      let clikesData: { comment_id: string }[] | null = null;
      if (user?.id) {
        const { data } = await sb.from('comment_likes').select('comment_id').in('comment_id', commentIds).eq('user_id', user.id);
        clikesData = data as { comment_id: string }[] | null;
      }
      const likedSet = new Set((clikesData ?? []).map((cl) => cl.comment_id));
      const likeMap: Record<string, { liked: boolean; count: number }> = {};
      for (const row of rows) {
        likeMap[row.id] = { liked: likedSet.has(row.id), count: (row as any).like_count ?? 0 };
      }
      if (seq === fetchSeqRef.current) setCommentLikes(likeMap);
    }

    setDbComments(rows.map((c) => {
      const profile = profileMap[c.author_id];
      const doctor = doctorMap[c.author_id];
      return {
        id: c.id,
        postId: c.post_id,
        authorId: c.author_id,
        authorName: profile?.name ?? '익명',
        authorIsDoctor: profile?.is_doctor,
        authorTitle: doctor?.title,
        authorHospital: doctor?.hospital_name,
        authorSpecialty: doctor?.specialty,
        authorProfileImage: doctor?.profile_image || profile?.profile_image,
        parentCommentId: (c as any).parent_comment_id ?? undefined,
        content: c.content,
        isAnonymous: c.is_anonymous,
        anonymousId: (c as any).anonymous_id ?? undefined,
        likeCount: c.like_count ?? 0,
        date: c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR') : '',
      };
    }));
  }, [postId, isRealPost, user?.id]);

  useEffect(() => {
    const seq = ++fetchSeqRef.current;
    fetchComments(seq);
  }, [fetchComments]);

  /* ── 조회수: post 로드 시 즉시 표시 + 백그라운드로 서버 증가 ── */
  useEffect(() => {
    if (!post) return;
    setViewCount(post.viewCount ?? 0);
  }, [post]);

  useEffect(() => {
    if (!isRealPost) return;
    // 백그라운드로 조회수 증가 (표시에 영향 없음)
    fetch('/api/community/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    }).then((r) => r.json()).then(({ count }) => { if (count) setViewCount(count); }).catch(() => {});
  }, [isRealPost, postId]);

  /* ── 좋아요 초기 상태 (서버 API → admin client) ── */
  useEffect(() => {
    if (!post) return;
    setLikeCount(post.likeCount ?? 0);
    if (!isRealPost) return;
    fetch(`/api/community/like?postId=${postId}`)
      .then((r) => r.json())
      .then(({ liked: l, count: c }) => {
        setLiked(!!l);
        if (c !== undefined) setLikeCount(c);
      })
      .catch(() => {});
  }, [post, isRealPost, postId]);

  const postComments = dbComments ?? [];
  const topComments = postComments.filter((c) => !c.parentCommentId);
  const getReplies = (parentId: string) => postComments.filter((c) => c.parentCommentId === parentId);

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar title="" />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400">{loadingPost ? '불러오는 중...' : '게시글을 찾을 수 없습니다.'}</p>
        </div>
      </div>
    );
  }

  const isOwnPost = user?.id === post.authorId;

  /* ── 좋아요 토글 (서버 API → admin client, RLS 우회) ── */
  const handleLike = async () => {
    if (!user?.id) { showToast('로그인이 필요합니다.'); return; }
    if (!isRealPost) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((n) => wasLiked ? Math.max(0, n - 1) : n + 1);
    try {
      const res = await fetch('/api/community/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as any).error || `오류 ${res.status}`);
      }
      const { liked: newLiked, count } = await res.json();
      setLiked(newLiked);
      setLikeCount(count);
    } catch (e: any) {
      setLiked(wasLiked);
      setLikeCount((n) => wasLiked ? n + 1 : Math.max(0, n - 1));
      showToast(e?.message || '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  /* ── 댓글 좋아요 (클라이언트 Supabase 직접 사용) ── */
  const handleCommentLike = useCallback(async (commentId: string) => {
    if (!user?.id) { showToast('로그인이 필요합니다.'); return; }
    if (!isRealPost || !hasSupabaseEnv()) return;
    const current = commentLikes[commentId] ?? { liked: false, count: 0 };
    setCommentLikes((prev) => ({
      ...prev,
      [commentId]: { liked: !current.liked, count: current.liked ? Math.max(0, current.count - 1) : current.count + 1 },
    }));
    try {
      const sb = createClient();
      if (current.liked) {
        const { error } = await sb.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    } catch (e: any) {
      setCommentLikes((prev) => ({ ...prev, [commentId]: current }));
      showToast(e?.message || '댓글 좋아요 오류');
    }
  }, [user?.id, isRealPost, commentLikes, showToast]);

  /* ── 댓글 등록 ── */
  const handleSubmitComment = async () => {
    if (!user) { showToast('로그인이 필요합니다.'); router.push('/login'); return; }
    if (!commentText.trim()) return;

    const tempId = `comment-${Date.now()}`;
    const tempComment: CommentItem = {
      id: tempId, postId,
      authorName: user.name, authorId: user.id,
      authorIsDoctor: user.isDoctor,
      isAnonymous: post.boardType === 'free',
      anonymousId: post.boardType === 'free' ? String(Math.floor(Math.random() * 900) + 100) : undefined,
      content: commentText.trim(),
      date: new Date().toLocaleDateString('ko-KR'),
      likeCount: 0,
      parentCommentId: replyTo?.id,
    };

    fetchSeqRef.current++;
    setDbComments((prev) => [...(prev ?? []), tempComment]);
    setCommentText('');
    setReplyTo(null);

    if (isRealPost && hasSupabaseEnv()) {
      const sb = createClient();
      const { data, error } = await sb.from('comments').insert({
        post_id: postId, author_id: user.id,
        content: tempComment.content,
        is_anonymous: tempComment.isAnonymous,
        anonymous_id: tempComment.anonymousId ?? null,
        parent_comment_id: tempComment.parentCommentId ?? null,
      }).select('id').single();

      if (error) {
        showToast('댓글 등록 실패: ' + error.message);
        setDbComments((prev) => prev ? prev.filter((c) => c.id !== tempId) : prev);
        setCommentText(tempComment.content);
        return;
      }
      showToast('댓글이 등록되었습니다.');
      setDbComments((prev) => prev ? prev.map((c) => c.id === tempId ? { ...c, id: data.id } : c) : prev);

      // 의사가 질문 게시판에 답변하면 answer_count 업데이트 (admin API)
      if (user.isDoctor && post.boardType === 'question') {
        fetch('/api/community/doctor-answered', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId }),
        }).catch(() => {});
      }

      const seq = ++fetchSeqRef.current;
      fetchComments(seq);
    } else {
      showToast('댓글이 등록되었습니다.');
    }
  };

  /* ── 댓글 삭제 ── */
  const handleDeleteComment = useCallback(async (commentId: string) => {
    showModal('댓글 삭제', '이 댓글을 삭제하시겠습니까?', async () => {
      setDbComments((prev) => prev ? prev.filter((c) => c.id !== commentId && c.parentCommentId !== commentId) : prev);
      if (isRealPost && hasSupabaseEnv()) {
        const { error } = await createClient().from('comments').delete().eq('id', commentId);
        if (error) {
          showToast('삭제 실패: ' + error.message);
          const seq = ++fetchSeqRef.current;
          fetchComments(seq);
          return;
        }
      }
      showToast('댓글이 삭제되었습니다.');
    });
  }, [isRealPost, showModal, showToast, fetchComments]);

  const handleSetReplyTo = useCallback((id: string, name: string) => setReplyTo({ id, authorName: name }), []);

  /* ── 게시글 삭제 ── */
  const handleDelete = () => {
    setShowMenu(false);
    showModal('삭제하기', '이 게시글을 삭제하시겠습니까?', async () => {
      if (isRealPost && hasSupabaseEnv()) {
        const { error } = await createClient().from('posts').delete().eq('id', postId);
        if (error) { showToast('삭제 실패: ' + error.message); return; }
      }
      deletePost(postId);
      showToast('게시글이 삭제되었습니다.');
      router.push('/community');
    });
  };

  const doctorAnswerCount = postComments.filter((c) => c.authorIsDoctor).length;
  const hasAnswer = doctorAnswerCount > 0 || (post.hasAnswer && (post.answerCount ?? 0) > 0);

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
                <button onClick={handleDelete} className="block w-full px-5 py-3 text-base text-left text-red-500">삭제하기</button>
                <button onClick={() => { setShowMenu(false); router.push(`/community/${postId}/edit`); }} className="block w-full px-5 py-3 text-base text-left text-gray-700 border-t border-gray-100">수정하기</button>
              </>
            ) : (
              <>
                <button onClick={() => { setShowMenu(false); showModal('신고하기', '이 게시글을 신고하시겠습니까?', () => showToast('신고가 접수되었습니다.')); }} className="block w-full px-5 py-3 text-base text-left text-red-500">신고하기</button>
                <button onClick={() => { setShowMenu(false); showModal('유저 차단하기', '이 유저를 차단하시겠습니까?', () => showToast('유저가 차단되었습니다.')); }} className="block w-full px-5 py-3 text-base text-left text-gray-700 border-t border-gray-100">유저 차단하기</button>
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
              <p className="text-sm font-bold text-yellow-700 mb-1">주의사항</p>
              <p className="text-[13px] text-yellow-600 leading-relaxed">자유익명게시판은 익명으로 운영됩니다.</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-2.5 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar role={post.authorTitle ? 'doctor' : 'user'} seed={post.anonymousId || post.authorId || post.id} size={40} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-gray-900">
                {post.isAnonymous ? `익명 ${post.anonymousId}` : post.authorName}
              </span>
              {post.boardType === 'dental' && (
                <span className="px-1.5 py-0.5 bg-[#8037FF] text-white text-[12px] rounded font-medium">치과</span>
              )}
            </div>
            {!post.isAnonymous && (
              <p className="text-sm text-gray-400">{post.authorTitle}{post.authorHospital && ` | ${post.authorHospital}`}</p>
            )}
          </div>
          <span className="text-sm text-gray-400">{post.date}</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h1>
        <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">{post.content}</p>

        {post.imageUrl && !post.imageUrl.startsWith('data:') && (
          <div className="mt-4 rounded-xl overflow-hidden">
            <img src={post.imageUrl} alt="" className="w-full object-cover rounded-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1 text-sm text-gray-400">
            <Eye size={14} />{viewCount || post.viewCount}
          </span>
          <button onClick={handleLike} className="flex items-center gap-1 text-sm">
            <Heart size={14} className={liked ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
            <span className={liked ? 'text-red-500' : 'text-gray-400'}>{likeCount}</span>
          </button>
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((tag) => (
              <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-500 text-sm rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        <div className="mt-4 bg-gray-50 rounded-xl p-3">
          <p className="text-[12px] text-gray-400 leading-relaxed">본 게시글의 저작권은 작성자에게 있으며, 무단 전재 및 배포를 금합니다.</p>
        </div>
      </div>

      {post.boardType === 'question' && (
        <div className="px-2.5 py-3 bg-gray-50 border-y border-gray-100">
          {hasAnswer ? (
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-[#8037FF]" />
              <span className="text-base font-medium text-[#8037FF]">{doctorAnswerCount || post.answerCount}명이 답변했어요</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-red-500" />
              <span className="text-base font-medium text-red-500">답변이 필요해요!</span>
            </div>
          )}
        </div>
      )}

      <div className="px-2.5 py-4">
        <h3 className="text-base font-bold text-gray-900 mb-4">댓글 {postComments.length}</h3>
        {dbComments === null ? (
          /* 댓글 로딩 스켈레톤 */
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="pb-4 border-b border-gray-100 animate-pulse">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 rounded w-20 mb-1" />
                    <div className="h-2 bg-gray-100 rounded w-14" />
                  </div>
                </div>
                <div className="ml-[38px] space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : topComments.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-base text-gray-400">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                isReply={false}
                commentLikes={commentLikes}
                userId={user?.id}
                onLike={handleCommentLike}
                onReply={handleSetReplyTo}
                onDelete={handleDeleteComment}
                replies={getReplies(comment.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 댓글 입력 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 z-50">
        {replyTo && (
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-sm text-gray-500">
              <CornerDownRight size={12} className="inline mr-1" />
              <span className="font-medium">{replyTo.authorName}</span>에게 답글
            </span>
            <button onClick={() => setReplyTo(null)} className="p-1"><X size={14} className="text-gray-400" /></button>
          </div>
        )}
        <div className="flex items-end gap-2 px-2.5 py-3">
          <div className="flex-1 relative">
            <textarea
              value={commentText}
              onChange={(e) => { if (e.target.value.length <= 5000) setCommentText(e.target.value); }}
              placeholder={replyTo ? '답글을 입력해주세요' : '댓글을 입력해주세요'}
              rows={1}
              className="w-full px-2.5 py-2.5 bg-gray-100 rounded-xl text-base resize-none focus:outline-none focus:ring-1 focus:ring-[#8037FF]"
              style={{ minHeight: '40px', maxHeight: '100px' }}
            />
            <span className="absolute right-3 bottom-2 text-[12px] text-gray-400">{commentText.length}/5000자</span>
          </div>
          <button
            onClick={handleSubmitComment}
            disabled={!commentText.trim()}
            className={`px-2.5 py-2.5 rounded-xl text-base font-medium flex-shrink-0 transition-colors ${commentText.trim() ? 'bg-[#8037FF] text-white' : 'bg-gray-200 text-gray-400'}`}
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
}
