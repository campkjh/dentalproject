'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, ChevronLeft, Heart, MessageCircle, Trash2, X } from 'lucide-react';
import { useStore } from '@/store';
import Avatar from '@/components/common/Avatar';
import { communityRelativeTime } from '@/lib/community';
import type { Post } from '@/types';
import CommunityPostCard from './CommunityPostCard';
import styles from './community.module.css';

interface CommunityComment {
  id: string; postId: string; authorId: string; authorName: string;
  authorIsDoctor?: boolean; authorTitle?: string; authorHospital?: string;
  authorSpecialty?: string; authorProfileImage?: string; parentCommentId?: string;
  content: string; isAnonymous?: boolean; anonymousId?: string;
  likeCount: number; liked: boolean; createdAt?: string; date: string;
}

export default function CommunityDetail({ postId, commentsOnly = false, onClose, basePath = '/community' }: {
  postId: string; commentsOnly?: boolean; onClose?: () => void; basePath?: string;
}) {
  const user = useStore(s => s.user);
  const showToast = useStore(s => s.showToast);
  const showModal = useStore(s => s.showModal);
  const storePost = useStore(s => s.posts.find(p => p.id === postId));
  const [fetchedPost, setFetchedPost] = useState<Post | null>(null);
  const post = storePost || fetchedPost;
  const [postLoading, setPostLoading] = useState(!storePost);
  const [postError, setPostError] = useState('');
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState('');
  const [text, setText] = useState('');
  const [reply, setReply] = useState<CommunityComment | null>(null);
  const [sending, setSending] = useState(false);
  const [retry, setRetry] = useState(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const commentHeading = useRef<HTMLHeadingElement>(null);
  const [commentVersion, setCommentVersion] = useState(0);
  const sendingRef = useRef(false);
  const commentLikesBusy = useRef(new Set<string>());
  const alive = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (storePost) return;
    const controller = new AbortController();
    fetch(`/api/posts/${postId}`, { signal: controller.signal })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); return data.post as Post; })
      .then(data => { if (!controller.signal.aborted) setFetchedPost(data); })
      .catch(e => { if (!controller.signal.aborted) setPostError(e instanceof Error ? e.message : '게시글을 불러오지 못했습니다.'); })
      .finally(() => { if (!controller.signal.aborted) setPostLoading(false); });
    return () => controller.abort();
  }, [postId, storePost, retry]);

  const loadComments = useCallback(() => setCommentVersion(version => version + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/posts/${postId}/comments`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '댓글을 불러오지 못했습니다.');
        return data.comments as CommunityComment[];
      })
      .then(data => { if (!controller.signal.aborted) { setComments(data); setCommentsError(''); } })
      .catch(error => { if (!controller.signal.aborted) setCommentsError(error instanceof Error ? error.message : '댓글을 불러오지 못했습니다.'); })
      .finally(() => { if (!controller.signal.aborted) setCommentsLoading(false); });
    return () => controller.abort();
  }, [postId, user?.id, commentVersion]);
  useEffect(() => {
    if (commentsOnly) return;
    const controller = new AbortController();
    fetch('/api/community/view', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId }) })
      .then(r => r.ok ? r.json() : null).then(data => {
        if (typeof data?.count !== 'number') return;
        useStore.setState(state => ({ posts: state.posts.map(p => p.id === postId ? { ...p, viewCount: data.count } : p) }));
        setFetchedPost(p => p ? { ...p, viewCount: data.count } : p);
      }).catch(() => {});
    return () => controller.abort();
  }, [postId, commentsOnly]);
  useEffect(() => {
    if (!textarea.current) return;
    textarea.current.style.height = 'auto';
    textarea.current.style.height = `${Math.min(140, Math.max(44, textarea.current.scrollHeight))}px`;
  }, [text]);

  const updatePostCommentCount = (delta: number) => {
    useStore.setState(state => ({ posts: state.posts.map(p => p.id === postId ? { ...p, commentCount: Math.max(0, p.commentCount + delta) } : p) }));
    setFetchedPost(p => p ? { ...p, commentCount: Math.max(0, p.commentCount + delta) } : p);
  };

  async function send() {
    if (!user) { showToast('로그인이 필요합니다.'); return; }
    if (!text.trim() || sendingRef.current) return;
    sendingRef.current = true; setSending(true);
    const content = text.trim();
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, parentCommentId: reply?.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '댓글을 등록하지 못했습니다.');
      if (!alive.current) return;
      setText(''); setReply(null); updatePostCommentCount(1);
      showToast('댓글이 등록되었습니다.');
      if (user.isDoctor && post?.boardType === 'question') {
        void fetch('/api/community/doctor-answered', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId }) }).then(r => r.ok ? r.json() : null).then(data => {
          if (!data?.ok || typeof data.answerCount !== 'number') return;
          useStore.setState(state => ({ posts: state.posts.map(p => p.id === postId ? { ...p, hasAnswer: data.answerCount > 0, answerCount: data.answerCount } : p) }));
          if (alive.current) setFetchedPost(p => p ? { ...p, hasAnswer: data.answerCount > 0, answerCount: data.answerCount } : p);
        }).catch(() => {});
      }
      await loadComments();
    } catch (e) { showToast(e instanceof Error ? e.message : '댓글을 등록하지 못했습니다.'); }
    finally { sendingRef.current = false; if (alive.current) setSending(false); }
  }

  async function likeComment(comment: CommunityComment) {
    if (!user) { showToast('로그인이 필요합니다.'); return; }
    if (commentLikesBusy.current.has(comment.id)) return;
    commentLikesBusy.current.add(comment.id);
    setComments(current => current.map(c => c.id === comment.id ? { ...c, liked: !c.liked, likeCount: Math.max(0, c.likeCount + (c.liked ? -1 : 1)) } : c));
    try {
      const response = await fetch('/api/community/comment-like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commentId: comment.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '좋아요를 저장하지 못했습니다.');
      if (alive.current) setComments(current => current.map(c => c.id === comment.id ? { ...c, liked: data.liked, likeCount: data.count } : c));
    } catch (e) {
      if (alive.current) setComments(current => current.map(c => c.id === comment.id ? comment : c));
      showToast(e instanceof Error ? e.message : '좋아요를 저장하지 못했습니다.');
    } finally { commentLikesBusy.current.delete(comment.id); }
  }

  function deleteComment(comment: CommunityComment) {
    showModal('댓글 삭제', '이 댓글을 삭제하시겠습니까?', async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/comments`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commentId: comment.id }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '댓글을 삭제하지 못했습니다.');
        const removed = comments.filter(c => c.id === comment.id || c.parentCommentId === comment.id).length;
        updatePostCommentCount(-removed);
        if (reply?.id === comment.id) setReply(null);
        showToast('댓글이 삭제되었습니다.');
        await loadComments();
      } catch (e) { showToast(e instanceof Error ? e.message : '댓글을 삭제하지 못했습니다.'); }
    });
  }

  function renderComment(comment: CommunityComment, isReply = false) {
    const name = comment.isAnonymous ? `익명 ${comment.anonymousId || ''}` : comment.authorName;
    return <div key={comment.id} className={styles.comment}>
      <Avatar src={comment.isAnonymous ? undefined : comment.authorProfileImage} role={comment.authorIsDoctor ? 'doctor' : 'user'} seed={comment.isAnonymous ? comment.id : comment.authorId} size={isReply ? 30 : 38} className="shrink-0" />
      <div className={styles.commentMain}>
        <div className={styles.commentAuthor}>{name}{comment.authorIsDoctor && <small>{comment.authorTitle || '의사'}</small>}<time>{communityRelativeTime(comment)}</time></div>
        {(comment.authorHospital || comment.authorSpecialty) && <p className={styles.commentHospital}>{[comment.authorHospital, comment.authorSpecialty].filter(Boolean).join(' · ')}</p>}
        <p className={styles.commentText}>{comment.content}</p>
        <div className={styles.commentActions}>
          <button type="button" aria-label={`${name} 댓글 좋아요`} aria-pressed={comment.liked} onClick={() => likeComment(comment)}><Heart size={15} fill={comment.liked ? 'currentColor' : 'none'} />{comment.likeCount || '좋아요'}</button>
          {!isReply && <button type="button" onClick={() => { if (!user) { showToast('로그인이 필요합니다.'); return; } setReply(comment); textarea.current?.focus(); }}><MessageCircle size={15} />답글</button>}
          {user?.id === comment.authorId && <button type="button" title="댓글 삭제" aria-label="댓글 삭제" onClick={() => deleteComment(comment)}><Trash2 size={14} /></button>}
        </div>
        {!isReply && comments.filter(c => c.parentCommentId === comment.id).map(c => renderComment(c, true))}
      </div>
    </div>;
  }

  const commentList = <section className={styles.comments} aria-label="댓글 목록">
    <h2 ref={commentHeading} tabIndex={-1}>댓글 {comments.length}</h2>
    {commentsError ? <div className={styles.error} role="alert">{commentsError}<button type="button" onClick={loadComments}>다시 시도</button></div>
      : commentsLoading && !comments.length ? <CommunitySkeleton count={2} />
      : !comments.length ? <div className={styles.empty}><MessageCircle size={28} /><p>첫 댓글을 남겨보세요.</p></div>
      : comments.filter(c => !c.parentCommentId).map(c => renderComment(c))}
  </section>;
  const input = <div className={styles.commentInput}>
    {reply && <div className={styles.replyTo}><span>{reply.isAnonymous ? '익명' : reply.authorName}님에게 답글</span><button type="button" aria-label="답글 취소" onClick={() => setReply(null)}><X size={16} /></button></div>}
    <textarea ref={textarea} aria-label={reply ? '답글 내용' : '댓글 내용'} placeholder={user ? reply ? '답글을 남겨주세요' : '댓글을 남겨주세요' : '로그인하고 이야기를 나눠보세요'} value={text} onChange={e => setText(e.target.value)} maxLength={5000} rows={1} disabled={sending} />
    <button type="button" className={styles.sendButton} aria-label="댓글 등록" title="댓글 등록" onClick={send} disabled={!text.trim() || sending}><ArrowUp size={24} strokeWidth={2.3} /></button>
  </div>;

  if (commentsOnly) return <>
    <header className={styles.sheetHeader}><button type="button" className={styles.iconButton} aria-label="닫기" onClick={onClose}><X size={20} /></button><h2>댓글</h2><span /></header>
    <div className={styles.commentsSheet}>{commentList}</div>{input}
  </>;
  return <div className={styles.detail}>
    <header className={styles.detailHeader}>
      {onClose ? <button type="button" className={styles.iconButton} title="상세 닫기" aria-label="상세 닫기" onClick={onClose}><X size={22} /></button> : <Link className={styles.iconButton} href={basePath} aria-label="커뮤니티로 돌아가기"><ChevronLeft size={24} /></Link>}
      <h1>게시글</h1><Link href={`${basePath}/${postId}`} aria-label="게시글 전체 보기">{onClose ? '전체 보기' : ''}</Link>
    </header>
    <div className={styles.detailBody}>
      {post ? <CommunityPostCard post={post} detail basePath={basePath} onComments={() => { commentHeading.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); textarea.current?.focus({ preventScroll: true }); }} onDeleted={() => { if (onClose) onClose(); else window.location.assign(basePath); }} />
        : postLoading ? <CommunitySkeleton count={1} /> : <div className={styles.empty} role="status"><p>{postError || '게시글을 찾을 수 없습니다.'}</p><button type="button" onClick={() => { setPostLoading(true); setPostError(''); setRetry(n => n + 1); }}>다시 시도</button></div>}
      {post && commentList}
    </div>
    {post && input}
  </div>;
}

export function CommunitySkeleton({ count = 4 }: { count?: number }) {
  return <div aria-label="게시글 불러오는 중" role="status">{Array.from({ length: count }, (_, i) => <div key={i} className={styles.skeleton}><span /><div><i /><i /><i /></div></div>)}</div>;
}
