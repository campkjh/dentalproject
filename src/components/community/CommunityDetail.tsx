'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import Avatar from '@/components/common/Avatar';
import { communityRelativeTime, isDoctorOnlyBoard, isTipPost } from '@/lib/community';
import type { Post } from '@/types';
import CommunityPostCard from './CommunityPostCard';
import { BackIcon, CloseIcon, EmojiBar, formatCount, ReplyArrowIcon, SendUpIcon, SortArrowsIcon, TossHeartIcon } from './StadyIcons';
import styles from './community.module.css';

interface CommunityComment {
  id: string; postId: string; authorId: string; authorName: string;
  authorIsDoctor?: boolean; authorTitle?: string; authorHospital?: string;
  authorSpecialty?: string; authorProfileImage?: string; parentCommentId?: string;
  content: string; isAnonymous?: boolean; anonymousId?: string;
  likeCount: number; liked: boolean; createdAt?: string; date: string;
}

// 스타디 댓글 정렬 — 화면에서만 다시 늘어놓는다(서버 순서 = 오래된순)
const COMMENT_SORTS = [
  { key: 'oldest', label: '오래된순' },
  { key: 'newest', label: '최신순' },
  { key: 'popular', label: '인기순' },
] as const;
type CommentSort = (typeof COMMENT_SORTS)[number]['key'];
const commentTime = (c: CommunityComment) => new Date(c.createdAt || c.date).getTime() || 0;

export default function CommunityDetail({ postId, commentsOnly = false, onClose, basePath = '/community' }: {
  postId: string; commentsOnly?: boolean; onClose?: () => void; basePath?: string;
}) {
  const router = useRouter();
  const user = useStore(s => s.user);
  const showToast = useStore(s => s.showToast);
  const showModal = useStore(s => s.showModal);
  const storePost = useStore(s => s.posts.find(p => p.id === postId));
  const allPosts = useStore(s => s.posts);
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
  const [sort, setSort] = useState<CommentSort>('oldest');
  const [sortOpen, setSortOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
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
  // 맨 위 감시점이 가려지면 상단바 뒤 그라데이션을 켠다(패널 안 스크롤도 같은 방식으로 잡힌다)
  useEffect(() => {
    const element = sentinel.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [commentsOnly]);

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
    showModal('댓글을 삭제할까요?', '답글도 함께 삭제되며 되돌릴 수 없어요.', async () => {
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

  function startReply(comment: CommunityComment) {
    if (!user) { showToast('로그인이 필요합니다.'); return; }
    setReply(comment);
    input.current?.focus({ preventScroll: true });
    if (!commentsOnly) composer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // 이전글·다음글 — 같은 칸(의사 라운지 = 자유·과별 / 고객 커뮤니티 = 질문·꿀팁) 안에서 최신순으로 이웃한 글
  const adjacent = useMemo(() => {
    if (!post) return null;
    const lounge = isDoctorOnlyBoard(post.boardType);
    const same = allPosts
      .filter(p => !p.id.startsWith('pending-') && (lounge ? isDoctorOnlyBoard(p.boardType) : p.boardType === 'question'))
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
    const i = same.findIndex(p => p.id === post.id);
    if (i < 0) return null; // 목록을 아직 못 받았으면 줄을 띄우지 않는다
    return { prev: same[i + 1], next: same[i - 1] }; // 이전글 = 더 오래된 글, 다음글 = 더 새 글
  }, [allPosts, post]);

  const roots = useMemo(() => {
    const list = comments.filter(c => !c.parentCommentId);
    if (sort === 'newest') return [...list].sort((a, b) => commentTime(b) - commentTime(a));
    if (sort === 'popular') return [...list].sort((a, b) => b.likeCount - a.likeCount || commentTime(a) - commentTime(b));
    return list;
  }, [comments, sort]);

  function renderComment(comment: CommunityComment, isReply = false): React.ReactNode {
    const name = comment.isAnonymous ? `익명 ${comment.anonymousId || ''}`.trim() : comment.authorName;
    const row = <div key={comment.id} className={styles.c} data-reply={isReply || undefined} data-active={reply?.id === comment.id || undefined}>
      <Avatar src={comment.isAnonymous ? undefined : comment.authorProfileImage} role={comment.authorIsDoctor ? 'doctor' : 'user'} seed={comment.isAnonymous ? comment.id : comment.authorId} size={isReply ? 34 : 44} className={styles.cAvatar} />
      <div className={styles.cMain}>
        <div className={styles.cHead}>
          <strong className={styles.cName}>{name}</strong>
          {comment.authorIsDoctor && <span className={styles.cDoctor}>{comment.authorTitle || '의사'}</span>}
          <span className={styles.cTime}>· {communityRelativeTime(comment)}</span>
        </div>
        {(comment.authorHospital || comment.authorSpecialty) && <p className={styles.cHospital}>{[comment.authorHospital, comment.authorSpecialty].filter(Boolean).join(' · ')}</p>}
        <p className={styles.cText}>{comment.content}</p>
        <div className={styles.cActs}>
          <button type="button" className={styles.cLike} aria-label={`${name} 댓글 좋아요`} aria-pressed={comment.liked} onClick={() => likeComment(comment)}><TossHeartIcon filled={comment.liked} />{comment.likeCount > 0 && <span>{formatCount(comment.likeCount)}</span>}</button>
          {!isReply && <button type="button" className={styles.cReply} onClick={() => startReply(comment)}><ReplyArrowIcon />답글 달기</button>}
          {user?.id === comment.authorId && <button type="button" className={styles.cTextBtn} onClick={() => deleteComment(comment)}>삭제</button>}
        </div>
      </div>
    </div>;
    if (isReply) return row;
    // 답글은 부모 댓글 바로 아래, 본문 칸 선에 맞춰 이어 붙인다(스타디)
    return [row, ...comments.filter(c => c.parentCommentId === comment.id).map(c => renderComment(c, true))];
  }

  const sortMenu = <>
    <button type="button" className={styles.sortButton} aria-haspopup="listbox" aria-expanded={sortOpen} onClick={() => setSortOpen(v => !v)}>{COMMENT_SORTS.find(x => x.key === sort)?.label}<SortArrowsIcon /></button>
    {sortOpen && <>
      <div className={styles.sortBackdrop} onClick={() => setSortOpen(false)} />
      <div className={styles.sortMenu} data-align="left" role="listbox">{COMMENT_SORTS.map(x => <button key={x.key} type="button" role="option" aria-selected={sort === x.key} className={styles.sortItem} onClick={() => { setSortOpen(false); setSort(x.key); }}>{x.label}</button>)}</div>
    </>}
  </>;

  const list = commentsError ? <div className={styles.error} role="alert">{commentsError}<button type="button" onClick={loadComments}>다시 시도</button></div>
    : commentsLoading && !comments.length ? <CommunitySkeleton count={2} />
    : !comments.length ? <div className={styles.sleep}><img src="/icons/toss/sleeping.svg" alt="" width={44} height={44} /><p>댓글이 자고있나봐요<br />깨워주세요!</p></div>
    : <div className={styles.cList}>{roots.map(c => renderComment(c))}</div>;

  const form = <form className={styles.compose} onSubmit={e => { e.preventDefault(); void send(); }}>
    <Avatar src={user?.profileImage} seed={user?.id} role={user?.isDoctor ? 'doctor' : 'user'} size={40} />
    <div className={styles.bar}>
      {reply && <button type="button" className={styles.mention} onClick={() => setReply(null)} aria-label={`${reply.isAnonymous ? '익명' : reply.authorName}님 답글 취소`}>@{reply.isAnonymous ? '익명' : reply.authorName}</button>}
      <input ref={input} className={styles.input} value={text} onChange={e => setText(e.target.value)} maxLength={5000} disabled={sending}
        placeholder={reply ? '' : user ? '댓글로 의견을 남겨보세요' : '로그인하고 이야기를 나눠보세요'} enterKeyHint="send" aria-label={reply ? '답글 내용' : '댓글 내용'} />
      <button type="submit" className={styles.send} disabled={!text.trim() || sending} aria-label="댓글 등록"><SendUpIcon /></button>
    </div>
  </form>;

  // 목록에서 여는 댓글 시트(스타디 CommentModal)
  if (commentsOnly) return <div className={styles.ccs}>
    <div className={styles.ccsHead}>
      <p className={styles.ccsTitle}>댓글 {comments.length}</p>
      <button type="button" className={styles.ccsClose} onClick={onClose} aria-label="닫기"><CloseIcon size={22} stroke={2.2} /></button>
    </div>
    <div className={styles.ccsSort}>{sortMenu}</div>
    <div className={styles.ccsList}>{list}</div>
    <div className={styles.ccsDock}>
      <EmojiBar className={styles.emojiBar} buttonClassName={styles.emojiBtn} onPick={emoji => { setText(t => t + emoji); input.current?.focus({ preventScroll: true }); }} />
      {form}
    </div>
  </div>;

  const inPanel = Boolean(onClose);
  return <div className={`${styles.detail} ${inPanel ? styles.inPanel : ''}`}>
    <div ref={sentinel} aria-hidden="true" style={{ height: 1, marginBottom: -1 }} />
    <header className={styles.detailTopbar} data-scrolled={scrolled}>
      {inPanel
        ? <>
          <h1 className={styles.detailTitle}>{post?.title ?? (postLoading ? '' : '커뮤니티')}</h1>
          <Link className={styles.fullLink} href={`${basePath}/${postId}`}>전체 보기</Link>
          <button type="button" className={styles.panelClose} onClick={onClose} aria-label="상세 닫기"><CloseIcon size={20} stroke={2.2} /></button>
        </>
        : <>
          <button type="button" className={styles.backButton} onClick={() => { if (window.history.length > 1) router.back(); else router.push(basePath); }} aria-label="커뮤니티 목록으로 이동"><BackIcon /></button>
          <h1 className={styles.detailTitle}>{post?.title ?? (postLoading ? '' : '커뮤니티')}</h1>
        </>}
    </header>
    {post ? <>
      <CommunityPostCard post={post} detail basePath={basePath} onComments={() => { composer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); input.current?.focus({ preventScroll: true }); }} onDeleted={() => { if (onClose) onClose(); else window.location.assign(basePath); }} />
      <div className={styles.band} aria-hidden="true" />
      <section className={styles.cpdComments} aria-label="댓글 목록">
        <h2 className={styles.cTitle}>댓글 <span>{formatCount(post.commentCount)}</span></h2>
        <div ref={composer}>{form}</div>
        <div className={styles.commentSortWrap}>{sortMenu}</div>
        {list}
      </section>
      {adjacent && <><div className={styles.band} aria-hidden="true" style={{ marginTop: 28 }} />
      <nav className={styles.adjacent} aria-label="이전글 다음글">
        {([['이전글', adjacent.prev, 'M15 18l-6-6 6-6'], ['다음글', adjacent.next, 'M9 18l6-6-6-6']] as const).map(([label, target, d]) => target
          ? <Link key={label} href={`${basePath}/${target.id}`} className={styles.adjRow}>
            <span className={styles.adjLabel}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>{label}</span>
            <span className={styles.adjTitle}>{isTipPost(target) ? '[꿀팁] ' : ''}{target.title}</span>
            <span className={styles.adjMeta}>{communityRelativeTime(target)}</span>
          </Link>
          : <div key={label} className={`${styles.adjRow} ${styles.adjEmpty}`}>
            <span className={styles.adjLabel}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>{label}</span>
            <span className={styles.adjTitle}>{label === '이전글' ? '첫 글이에요' : '가장 최근 글이에요'}</span>
          </div>)}
      </nav></>}
    </> : postLoading ? <DetailSkeleton /> : <div className={styles.detailState} role="status"><p>{postError || '게시글을 찾을 수 없습니다.'}</p><button type="button" onClick={() => { setPostLoading(true); setPostError(''); setRetry(n => n + 1); }}>다시 시도</button></div>}
  </div>;
}

// 글 모양 스켈레톤(분류·시간 / 제목 / 작성자 / 본문 줄 / 사진 / 공감 줄) — 천천히 숨 쉬듯 깜빡인다
function DetailSkeleton() {
  const b = (style: React.CSSProperties) => <span className={styles.skBlock} style={style} />;
  return <div className={styles.detailState} style={{ display: 'block' }} role="status" aria-busy="true" aria-label="게시글을 불러오는 중">
    <div style={{ display: 'flex', gap: 8 }}>{b({ width: 74, height: 28, borderRadius: 999 })}{b({ width: 54, height: 14, marginTop: 7 })}</div>
    {b({ width: '78%', height: 24, marginTop: 18 })}{b({ width: '52%', height: 24, marginTop: 8 })}
    <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>{b({ width: 28, height: 28, borderRadius: '50%' })}{b({ width: 84, height: 14, marginTop: 7 })}</div>
    {b({ width: '100%', height: 15, marginTop: 20 })}{b({ width: '94%', height: 15, marginTop: 10 })}{b({ width: '62%', height: 15, marginTop: 10 })}
    {b({ width: '100%', height: 180, marginTop: 20, borderRadius: 14 })}
    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>{b({ width: 70, height: 34, borderRadius: 999 })}{b({ width: 70, height: 34, borderRadius: 999 })}</div>
  </div>;
}

export function CommunitySkeleton({ count = 4 }: { count?: number }) {
  return <div aria-label="게시글 불러오는 중" role="status">{Array.from({ length: count }, (_, i) => <div key={i} className={styles.skeletonCard} aria-hidden="true">
    <div className={styles.skeletonLine} style={{ width: '38%' }} />
    <div className={styles.skeletonLine} style={{ width: '72%', height: 18 }} />
    <div className={styles.skeletonLine} style={{ width: '100%' }} />
    <div className={styles.skeletonLine} style={{ width: '58%' }} />
  </div>)}</div>;
}
