'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/common/Avatar';
import { useStore } from '@/store';
import { communityRelativeTime } from '@/lib/community';
import type { Post } from '@/types';
import CommunityModal from './CommunityModal';
import { boardTone, CommentFillIcon, DotsIcon, formatCount, postPillName, QBadge, TossCommentIcon, TossHeartIcon, TossShareIcon } from './StadyIcons';
import styles from './community.module.css';

const REPORT_REASONS = ['부적절한 의료 정보', '불법 광고/스팸', '욕설/비방', '허위/사기 정보', '저작권 침해', '기타'];

// 스타디 글 카드 — 목록(detail=false)은 토스 커뮤니티식 카드, 상세(detail)는 스타디 cpd 배치
export default function CommunityPostCard({ post, detail = false, basePath = '/community', initialLiked = false, onOpen, onComments, onCategory, onDeleted }: {
  post: Post; detail?: boolean; basePath?: string; initialLiked?: boolean;
  onOpen?: (post: Post) => void; onComments?: (post: Post) => void;
  onCategory?: (category: string) => void; onDeleted?: () => void;
}) {
  const router = useRouter();
  const user = useStore(s => s.user);
  const showToast = useStore(s => s.showToast);
  const showModal = useStore(s => s.showModal);
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(post.likeCount);
  const [source, setSource] = useState({ count: post.likeCount, liked: initialLiked });
  // 점 3개 시트: menu(동작 고르기) → reason(신고 사유) → done(접수 결과)
  const [sheet, setSheet] = useState<'menu' | 'reason' | 'done' | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState('');
  const busy = useRef(false);
  const href = `${basePath}/${post.id}`;
  const mine = user?.id === post.authorId;
  const name = post.isAnonymous ? `익명 ${post.anonymousId || ''}`.trim() : post.authorName;
  const pill = postPillName(post);
  const tone = boardTone(pill);
  const isQuestion = post.boardType === 'question';
  const answered = Boolean(post.hasAnswer || post.answerCount);

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
      else { await navigator.clipboard.writeText(url); showToast('링크를 복사했어요'); }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) showToast('링크를 공유하지 못했습니다.');
    }
  }

  function remove() {
    setSheet(null);
    showModal('게시글을 삭제할까요?', '삭제하면 되돌릴 수 없어요.', async () => {
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

  // 스타디처럼 사유를 누르는 즉시 접수한다
  async function submitReport(reason: string) {
    if (reporting) return;
    setReporting(true); setReportError('');
    try {
      const response = await fetch(`/api/posts/${post.id}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '신고를 접수하지 못했습니다.');
      setSheet('done');
    } catch (e) { setReportError(e instanceof Error ? e.message : '신고를 접수하지 못했습니다.'); }
    finally { setReporting(false); }
  }

  const stop = (e: MouseEvent) => e.stopPropagation();
  const openSheet = (e: MouseEvent) => { e.stopPropagation(); setReportError(''); setSheet('menu'); };
  const doctorMark = !post.isAnonymous && post.authorTitle ? <span className={styles.doctorMark}>{post.authorTitle}</span> : null;

  const actionSheet = sheet && <CommunityModal label="게시글 메뉴" onClose={() => setSheet(null)}>
    <div className={styles.actionSheet}>
      {sheet === 'menu' && <>
        <p className={styles.actionTitle}>{name}님의 게시글</p>
        {mine && <button type="button" className={styles.actionBtn} onClick={() => { setSheet(null); router.push(`/community/${post.id}/edit`); }}>수정하기</button>}
        {mine && <button type="button" className={styles.actionBtn} data-tone="danger" onClick={remove}>삭제하기</button>}
        {!mine && <button type="button" className={styles.actionBtn} onClick={() => { if (!user) { setSheet(null); showToast('로그인이 필요합니다.'); } else setSheet('reason'); }}>신고하기</button>}
        <button type="button" className={styles.actionBtn} onClick={() => { setSheet(null); void share(); }}>공유하기</button>
        <button type="button" className={styles.actionMuted} onClick={() => setSheet(null)}>취소</button>
      </>}
      {sheet === 'reason' && <>
        <p className={styles.actionTitle}>신고 사유를 선택해 주세요</p>
        {REPORT_REASONS.map(reason => <button key={reason} type="button" className={styles.actionBtn} disabled={reporting} onClick={() => submitReport(reason)}>{reason}</button>)}
        {reportError && <p className={styles.actionError} role="alert">{reportError}</p>}
        <button type="button" className={styles.actionMuted} onClick={() => setSheet(null)}>취소</button>
      </>}
      {sheet === 'done' && <>
        <p className={styles.actionTitle}>신고가 접수되었어요</p>
        <button type="button" className={styles.actionBtn} data-tone="main" onClick={() => setSheet(null)}>확인</button>
      </>}
    </div>
  </CommunityModal>;

  const tags = post.tags.length > 0 && <div className={styles.tagRow}>{post.tags.map(tag => onCategory
    ? <button type="button" key={tag} className={styles.tagBadge} onClick={e => { e.stopPropagation(); onCategory(tag); }}>#{tag}</button>
    : <span key={tag} className={styles.tagBadge}>#{tag}</span>)}</div>;
  // 질문 글의 의사 답변 상태 — 스타디 '제일 상단 댓글' 회색 줄 자리에 둔다
  const answerLine = isQuestion && <div className={styles.topComment} data-answered={answered}>
    <CommentFillIcon />
    <span>{answered ? <><b>의사 답변</b>{post.answerCount || 1}명이 답변했어요</> : '답변을 기다리고 있어요'}</span>
  </div>;

  if (detail) return <article className={styles.cpdPost} data-post-id={post.id}>
    <div className={styles.cpdTop}>
      <span className={styles.cpdBoard} style={{ background: tone.bg, color: tone.color }}>{pill}</span>
      <span className={styles.cpdTime}>{communityRelativeTime(post)}</span>
      <button type="button" className={styles.moreBtn} aria-label="게시글 더보기" onClick={openSheet}><DotsIcon /></button>
    </div>
    <div className={styles.cpdBody}>
      <h2 className={styles.cpdTitle}>{isQuestion && <QBadge answered={answered} size={22} />}{post.title}</h2>
      <div className={styles.cpdAuthor}>
        <Avatar src={post.isAnonymous ? undefined : post.authorProfileImage} seed={post.isAnonymous ? `${post.id}-${post.anonymousId}` : post.authorId} role={doctorMark ? 'doctor' : 'user'} size={34} />
        <p className={styles.cpdNameRow}>
          <span className={styles.inkName} style={{ backgroundImage: tone.ink }}>{name}</span>{doctorMark}
          {!post.isAnonymous && post.authorHospital && <span className={styles.cpdViews}>· {post.authorHospital}</span>}
          <span className={styles.cpdViews}>· 조회 {formatCount(post.viewCount)}</span>
        </p>
      </div>
      {post.content !== post.title && <p className={styles.cpdContent}>{post.content}</p>}
    </div>
    {mine && <div className={styles.ownerRow}>
      <button type="button" className={styles.ownerBtn} onClick={() => router.push(`/community/${post.id}/edit`)}>편집</button>
      <button type="button" className={styles.ownerBtn} data-danger="true" onClick={remove}>삭제</button>
    </div>}
    {post.imageUrl && <div className={styles.detailImages}><img src={post.imageUrl} alt="게시글 첨부 사진" decoding="async" /></div>}
    {tags}
    {answerLine}
    <div className={styles.cpdActions}>
      <button type="button" className={styles.pill} aria-label="좋아요" aria-pressed={liked} onClick={toggleLike}><TossHeartIcon filled={liked} /><span>좋아요 {formatCount(count)}</span></button>
      <button type="button" className={styles.pill} aria-label="댓글" onClick={() => onComments?.(post)}><TossCommentIcon /><span>댓글 {formatCount(post.commentCount)}</span></button>
      <button type="button" className={styles.pill} data-icon="true" aria-label="공유" onClick={share}><TossShareIcon /></button>
    </div>
    {actionSheet}
  </article>;

  // 목록 카드: 카드 전체가 눌림 영역(Cmd·Ctrl 클릭은 새 탭)
  function openCard(e: MouseEvent | KeyboardEvent) {
    if (e.metaKey || e.ctrlKey) { window.open(href, '_blank'); return; }
    if (onOpen) onOpen(post); else router.push(href);
  }
  return <article className={styles.card} data-post-id={post.id} role="button" tabIndex={0} aria-label={`${post.title} 상세 보기`}
    onClick={openCard} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCard(e); } }}>
    <div className={styles.cardHead}>
      <div className={styles.avaWrap}>
        <Avatar src={post.isAnonymous ? undefined : post.authorProfileImage} seed={post.isAnonymous ? `${post.id}-${post.anonymousId}` : post.authorId} role={doctorMark ? 'doctor' : 'user'} size={52} />
        <span className={styles.rolePill} style={{ background: tone.bg, color: tone.color }}>{pill}</span>
      </div>
      <div className={styles.who}>
        <p className={styles.author}><span className={styles.inkName} style={{ backgroundImage: tone.ink }}>{name}</span>{doctorMark}</p>
        <p className={styles.date}>{communityRelativeTime(post)}{!post.isAnonymous && post.authorHospital && ` · ${post.authorHospital}`}</p>
      </div>
    </div>
    <h2 className={styles.cardTitle}>{isQuestion && <QBadge answered={answered} />}{post.title}</h2>
    {post.content !== post.title && <p className={styles.cardContent}>{post.content}</p>}
    {post.imageUrl && <div className={styles.imageSingle}><div className={styles.thumb}><img src={post.imageUrl} alt="게시글 첨부 사진" loading="lazy" decoding="async" /></div></div>}
    {tags}
    {answerLine}
    <div className={styles.metrics}>
      <button type="button" className={styles.metricBtn} aria-label="좋아요" aria-pressed={liked} onClick={e => { stop(e); void toggleLike(); }}><TossHeartIcon filled={liked} /><span>{formatCount(count)}</span></button>
      <button type="button" className={styles.metricBtn} aria-label="댓글" onClick={e => { stop(e); onComments?.(post); }}><TossCommentIcon /><span>{formatCount(post.commentCount)}</span></button>
      <button type="button" className={styles.metricBtn} aria-label="공유" onClick={e => { stop(e); void share(); }}><TossShareIcon /></button>
      <button type="button" className={styles.moreBtn} aria-label="게시글 더보기" onClick={openSheet}><DotsIcon /></button>
    </div>
    {/* 시트는 body 로 포털되지만 React 이벤트는 카드로 올라오므로 여기서 끊는다 */}
    {actionSheet && <div onClick={stop} onKeyDown={e => e.stopPropagation()}>{actionSheet}</div>}
  </article>;
}
