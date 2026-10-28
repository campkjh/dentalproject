'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Flag, Heart, MessageCircle, MoreHorizontal, Pencil, Share2, Trash2, X } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import { useStore } from '@/store';
import { communityRelativeTime } from '@/lib/community';
import type { Post } from '@/types';
import CommunityModal from './CommunityModal';
import styles from './community.module.css';

export default function CommunityPostCard({ post, detail = false, basePath = '/community', initialLiked = false, onOpen, onComments, onCategory, onDeleted }: {
  post: Post; detail?: boolean; basePath?: string; initialLiked?: boolean;
  onOpen?: (post: Post) => void; onComments?: (post: Post) => void;
  onCategory?: (category: string) => void; onDeleted?: () => void;
}) {
  const user = useStore(s => s.user);
  const showToast = useStore(s => s.showToast);
  const showModal = useStore(s => s.showModal);
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(post.likeCount);
  const [source, setSource] = useState({ count: post.likeCount, liked: initialLiked });
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState('부적절한 의료 정보');
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState('');
  const busy = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const href = `${basePath}/${post.id}`;

  if (source.count !== post.likeCount || source.liked !== initialLiked) {
    setSource({ count: post.likeCount, liked: initialLiked }); setCount(post.likeCount);
    if (source.liked !== initialLiked) setLiked(initialLiked);
  }
  useEffect(() => {
    if (!detail) return;
    const controller = new AbortController();
    fetch(`/api/community/like?postId=${post.id}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !busy.current) { setLiked(Boolean(data.liked)); if (typeof data.count === 'number') setCount(data.count); } })
      .catch(() => {});
    return () => controller.abort();
  }, [detail, post.id]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [menu]);

  async function toggleLike() {
    if (!user) { showToast('로그인이 필요합니다.'); return; }
    if (busy.current) return;
    busy.current = true;
    const previous = { liked, count };
    setLiked(!liked);
    setCount(Math.max(0, count + (liked ? -1 : 1)));
    try {
      const response = await fetch('/api/community/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: post.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '좋아요를 저장하지 못했습니다.');
      setLiked(payload.liked);
      setCount(payload.count);
      useStore.setState(state => ({ posts: state.posts.map(p => p.id === post.id ? { ...p, likeCount: payload.count } : p) }));
    } catch (e) {
      setLiked(previous.liked); setCount(previous.count);
      showToast(e instanceof Error ? e.message : '좋아요를 저장하지 못했습니다.');
    } finally { busy.current = false; }
  }

  async function share() {
    const url = new URL(href, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: post.title, url });
      else { await navigator.clipboard.writeText(url); showToast('게시글 링크를 복사했습니다.'); }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) showToast('링크를 공유하지 못했습니다.');
    }
  }

  function remove() {
    setMenu(false);
    showModal('게시글 삭제', '이 게시글을 삭제하시겠습니까?', async () => {
      try {
        const response = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || '삭제하지 못했습니다.');
        useStore.setState(state => ({ posts: state.posts.filter(p => p.id !== post.id) }));
        showToast('게시글이 삭제되었습니다.');
        onDeleted?.();
      } catch (e) { showToast(e instanceof Error ? e.message : '게시글을 삭제하지 못했습니다.'); }
    });
  }

  async function submitReport() {
    if (reporting) return;
    setReporting(true); setReportError('');
    try {
      const response = await fetch(`/api/posts/${post.id}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '신고를 접수하지 못했습니다.');
      showToast('신고가 접수되었습니다.'); setReport(false);
    } catch (e) { setReportError(e instanceof Error ? e.message : '신고를 접수하지 못했습니다.'); }
    finally { setReporting(false); }
  }

  const text = <>
    <h2 className={styles.postTitle}>{post.title}</h2>
    {post.content !== post.title && <p className={`${styles.postBody} ${!detail ? styles.clamp : ''}`}>{post.content}</p>}
    {post.imageUrl && <img className={styles.postImage} src={post.imageUrl} alt="게시글 첨부 사진" loading={detail ? 'eager' : 'lazy'} />}
  </>;

  return <article className={styles.post} data-post-id={post.id}>
    <div className={styles.postHead}>
      <div className={styles.avatarWrap}>
        <Avatar src={post.isAnonymous ? undefined : post.authorProfileImage} seed={post.isAnonymous ? `${post.id}-${post.anonymousId}` : post.authorId} role={!post.isAnonymous && post.authorTitle ? 'doctor' : 'user'} size={52} />
        <span className={styles.categoryBadge}>{post.tags[0] || (post.boardType === 'question' ? '질문' : post.boardType === 'free' ? '자유' : '치과')}</span>
      </div>
      <div className={styles.author}>
        <div className={styles.authorName}>{post.isAnonymous ? `익명 ${post.anonymousId || ''}` : post.authorName}{!post.isAnonymous && post.authorTitle && <small>{post.authorTitle}</small>}</div>
        <p className={styles.postDate}>{communityRelativeTime(post)}{!post.isAnonymous && post.authorHospital && ` · ${post.authorHospital}`}</p>
      </div>
      <div className={styles.menu} ref={menuRef}>
        <button type="button" className={styles.iconButton} aria-label="게시글 더보기" title="게시글 더보기" aria-expanded={menu} onClick={() => setMenu(v => !v)}><MoreHorizontal size={22} /></button>
        {menu && <div className={styles.menuList}>
          {user?.id === post.authorId ? <>
            <Link href={`/community/${post.id}/edit`} className="flex items-center gap-2.5 px-2.5 py-3 text-sm"><Pencil size={16} />수정하기</Link>
            <button type="button" className={styles.danger} onClick={remove}><Trash2 size={16} />삭제하기</button>
          </> : <button type="button" className={styles.danger} onClick={() => { setMenu(false); if (!user) showToast('로그인이 필요합니다.'); else setReport(true); }}><Flag size={16} />신고하기</button>}
          <button type="button" onClick={() => { setMenu(false); void share(); }}><Share2 size={16} />공유하기</button>
        </div>}
      </div>
    </div>
    {detail ? text : <Link className={styles.postLink} href={href} onClick={e => {
      if (onOpen && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); onOpen(post); }
    }}>{text}</Link>}
    {post.tags.length > 0 && <div className={styles.tags}>{post.tags.map(tag => onCategory ? <button type="button" key={tag} onClick={() => onCategory(tag)}>#{tag}</button> : <span key={tag}>#{tag}</span>)}</div>}
    {post.boardType === 'question' && <div className={styles.answerStatus} data-answered={Boolean(post.hasAnswer || post.answerCount)}>
      <img src={post.hasAnswer || post.answerCount ? '/icons/community-answer.svg' : '/icons/community-need-answer.svg'} alt="" />
      {post.hasAnswer || post.answerCount ? `${post.answerCount || 1}명이 답변했어요` : '답변을 기다리고 있어요'}
    </div>}
    <div className={styles.actions}>
      <button type="button" aria-label="좋아요" title="좋아요" aria-pressed={liked} onClick={toggleLike}><Heart size={23} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />{count > 0 && count.toLocaleString()}</button>
      <button type="button" aria-label="댓글 보기" title="댓글 보기" onClick={() => onComments?.(post)}><MessageCircle size={23} strokeWidth={1.8} />{post.commentCount > 0 && post.commentCount.toLocaleString()}</button>
      <button type="button" aria-label="공유하기" title="공유하기" onClick={share}><Share2 size={22} strokeWidth={1.8} /></button>
      <span className={styles.views}><Eye size={14} />{post.viewCount.toLocaleString()}</span>
    </div>
    {report && <CommunityModal label="게시글 신고" onClose={() => setReport(false)}>
      <header className={styles.sheetHeader}><button type="button" className={styles.iconButton} aria-label="닫기" onClick={() => setReport(false)}><X size={20} /></button><h2>게시글 신고</h2><span /></header>
      <div className={styles.reportBody}>
        {['부적절한 의료 정보', '불법 광고/스팸', '욕설/비방', '허위/사기 정보', '저작권 침해', '기타'].map(item => <label key={item}><input type="radio" name="report-reason" value={item} checked={reason === item} onChange={() => setReason(item)} />{item}</label>)}
        {reportError && <p className={styles.error} role="alert">{reportError}</p>}
        <button type="button" className={styles.submit} onClick={submitReport} disabled={reporting}>{reporting ? '접수 중' : '신고하기'}</button>
      </div>
    </CommunityModal>}
  </article>;
}
