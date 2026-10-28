'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/common/Avatar';
import { useStore } from '@/store';
import { compressImage } from '@/lib/compressImage';
import { communityBoards, communityCategories } from '@/lib/community';
import { communityTags } from '@/lib/mock-data';
import type { Post } from '@/types';
import { CloseIcon } from './StadyIcons';
import styles from './community.module.css';

// 스타디 '새로운 스레드' 글쓰기 — sheet 는 목록 위에 뜨는 시트, 아니면 글쓰기·수정 페이지 한 장
export default function CommunityComposer({ initialBoard = 'question', initialCategory, post, onClose, onPosted, sheet = false }: {
  initialBoard?: Post['boardType']; initialCategory?: string; post?: Post;
  onClose: () => void; onPosted: (postId: string) => void;
  sheet?: boolean;
}) {
  const router = useRouter();
  const user = useStore(s => s.user);
  const isDoctor = useStore(s => s.isDoctor);
  const addPost = useStore(s => s.addPost);
  const showToast = useStore(s => s.showToast);
  const showModal = useStore(s => s.showModal);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [board, setBoard] = useState<Post['boardType']>(post?.boardType || (isDoctor ? initialBoard : 'question'));
  const [content, setContent] = useState(post?.content ?? '');
  const [title, setTitle] = useState(post?.title ?? '');
  const [tags, setTags] = useState(post?.tags ?? (initialCategory && initialCategory !== '전체' ? [initialCategory] : []));
  const [image, setImage] = useState(post?.imageUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const choices = isDoctor ? communityBoards : communityBoards.slice(0, 1);
  const availableTags = board === 'question' ? communityCategories.slice(1) : communityTags;
  const dirty = content !== (post?.content ?? '') || image !== (post?.imageUrl ?? '') || title !== (post?.title ?? '');
  const boardLabel = choices.find(item => item.value === board)?.label || communityBoards[0].label;
  const anonymous = board === 'free';

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => { textarea.current?.focus({ preventScroll: true }); }, []);
  // 글자 수만큼 늘어나는 입력칸
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(sheet ? 48 : 180, element.scrollHeight)}px`;
  }, [content, sheet]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  // 시트가 떠 있는 동안 뒤 목록 스크롤을 잠근다
  useEffect(() => {
    if (!sheet) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [sheet]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploading) return;
    if (!file.type.startsWith('image/')) { setError('이미지 파일만 첨부할 수 있습니다.'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('50MB 이하 이미지만 첨부할 수 있습니다.'); return; }
    const previous = image;
    const preview = URL.createObjectURL(file);
    setImage(preview);
    setUploading(true);
    setError('');
    try {
      const compressed = await compressImage(file);
      const body = new FormData();
      body.append('file', compressed);
      body.append('folder', 'community-posts');
      const response = await fetch('/api/upload', { method: 'POST', body });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || '이미지를 업로드하지 못했습니다.');
      if (alive.current) setImage(payload.url);
    } catch (e) {
      if (alive.current) { setImage(previous); setError(e instanceof Error ? e.message : '이미지 업로드에 실패했습니다.'); }
    } finally {
      URL.revokeObjectURL(preview);
      if (alive.current) setUploading(false);
    }
  }

  async function submit() {
    if (busy.current || uploading || !content.trim()) return;
    if (!user) { showToast('로그인이 필요합니다.'); router.push('/login'); return; }
    if (post && post.authorId !== user.id) { setError('본인이 작성한 글만 수정할 수 있습니다.'); return; }
    busy.current = true;
    setSubmitting(true);
    setError('');
    try {
      const nextTitle = (post ? title.trim() : content.trim().split('\n')[0].slice(0, 60)) || '새 글';
      if (post) {
        const response = await fetch(`/api/posts/${post.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: nextTitle, content: content.trim(), tags, imageUrl: image || null }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '게시글 수정에 실패했습니다.');
        useStore.setState(state => ({ posts: state.posts.map(p => p.id === post.id ? { ...p, title: nextTitle, content: content.trim(), tags, imageUrl: image || undefined, thumbnailUrl: image || undefined } : p) }));
        showToast('게시글이 수정되었습니다.');
        onPosted(post.id);
      } else {
        const next: Post = {
          id: `pending-${Date.now()}`, boardType: board, title: nextTitle, content: content.trim(),
          authorId: user.id, authorName: board === 'free' ? '익명' : user.name,
          authorTitle: user.doctorInfo?.title, authorHospital: user.doctorInfo?.hospitalName,
          authorProfileImage: user.profileImage, isAnonymous: board === 'free',
          anonymousId: board === 'free' ? String(Math.floor(1000 + Math.random() * 9000)) : undefined,
          createdAt: new Date().toISOString(), date: new Date().toLocaleDateString('ko-KR'),
          viewCount: 0, likeCount: 0, commentCount: 0, tags, imageUrl: image || undefined,
          thumbnailUrl: image || undefined, hasAnswer: false, answerCount: 0,
        };
        const result = await addPost(next);
        if (result.error || !result.id) throw new Error(result.error || '게시글을 등록하지 못했습니다.');
        showToast('게시글이 등록되었습니다.');
        setContent(''); setImage(''); setTags([]);
        onPosted(result.id);
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : '게시글을 저장하지 못했습니다.');
    } finally {
      busy.current = false;
      if (alive.current) setSubmitting(false);
    }
  }

  // 시트는 내려가는 모양을 보여 준 뒤 닫는다
  function exit() {
    if (!sheet) { onClose(); return; }
    setLeaving(true);
    setTimeout(onClose, 240);
  }
  // 쓰던 내용이 있으면 인앱 확인창으로 한 번 묻는다(안드 WebView 는 window.confirm 이 안 뜬다)
  function requestClose() {
    if (submitting || uploading || leaving) return;
    if (dirty) showModal('작성을 그만둘까요?', '작성 중인 내용은 저장되지 않아요.', exit);
    else exit();
  }
  useEffect(() => {
    if (!sheet) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) requestClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const head = <div className={styles.cmpHead}>
    <button type="button" className={styles.cmpCancel} onClick={requestClose} disabled={submitting || uploading}>취소</button>
    <span className={styles.cmpTitle}>{post ? '게시글 수정' : '새 게시글'}</span>
    <span className={styles.cmpHeadRight}><button type="button" className={styles.cmpPost} onClick={submit} disabled={!content.trim() || submitting || uploading}>{submitting ? '저장 중…' : uploading ? '업로드 중…' : post ? '저장' : '게시'}</button></span>
  </div>;
  const body = <div className={styles.cmpBody}>
    <div className={styles.cmpRow}>
      <div className={styles.cmpAvatarCol}>
        <Avatar size={40} src={anonymous ? undefined : user?.profileImage} role={!anonymous && isDoctor ? 'doctor' : 'user'} seed={user?.id} />
        <span className={styles.cmpThreadLine} aria-hidden="true" />
      </div>
      <div className={styles.cmpMain}>
        <div className={styles.cmpUserLine}>
          <span className={styles.cmpNick}>{anonymous ? '익명' : user?.name || '나'}</span>
          <span className={styles.cmpChevron}>›</span>
          <button type="button" className={styles.cmpCat} aria-expanded={pickerOpen} disabled={Boolean(post) || choices.length < 2} onClick={() => setPickerOpen(v => !v)}>{boardLabel}</button>
        </div>
        {pickerOpen && <div className={styles.cmpCatList}>{choices.map(item => <button key={item.value} type="button" className={styles.cmpCatItem} aria-pressed={board === item.value} onClick={() => { setBoard(item.value); setTags([]); setPickerOpen(false); }}>{item.label}</button>)}</div>}
        {post && <input className={styles.cmpTitleInput} aria-label="제목" placeholder="제목" value={title} maxLength={100} onChange={e => setTitle(e.target.value)} />}
        <textarea ref={textarea} className={styles.cmpTextarea} aria-label="게시글 내용" rows={1} placeholder={board === 'question' ? '궁금한 치아 이야기를 들려주세요.' : '새로운 소식이 있나요?'} value={content} maxLength={5000} onChange={e => setContent(e.target.value)} />
        {image && <div className={styles.cmpImages}><div className={styles.cmpImage}>
          <img src={image} alt="첨부 이미지" />
          {uploading ? <span className={styles.cmpImageBusy}><LoaderCircle size={22} className="animate-spin" /></span>
            : <button type="button" className={styles.cmpImageX} aria-label="첨부 이미지 삭제" onClick={() => setImage('')}><CloseIcon size={13} /></button>}
        </div></div>}
        <div className={styles.cmpAttach}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
          <button type="button" className={styles.cmpAttachBtn} aria-label="사진 첨부" title="사진 첨부" onClick={() => fileRef.current?.click()} disabled={uploading}><img src="/icons/toss/picture.svg" alt="" /></button>
          <span className={styles.cmpCount}>{content.length.toLocaleString()}/5,000</span>
        </div>
        <p className={styles.cmpLabel}>태그 · 최대 5개</p>
        <div className={styles.cmpCatList} aria-label="게시글 태그">
          {availableTags.map(tag => <button key={tag} type="button" className={styles.cmpCatItem} aria-pressed={tags.includes(tag)} onClick={() => {
            if (!tags.includes(tag) && tags.length >= 5) { showToast('태그는 최대 5개까지 선택할 수 있습니다.'); return; }
            setTags(current => current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]);
          }}>{tag}</button>)}
        </div>
      </div>
    </div>
    <div className={styles.cmpHint}>
      <Avatar size={26} src={anonymous ? undefined : user?.profileImage} seed={user?.id} />
      <span>{anonymous ? '익명으로 게시돼요' : '함께 나누는 건강한 치아 이야기'}</span>
    </div>
    {error && <p className={styles.cmpMsg} role="alert">{error}</p>}
  </div>;

  if (!sheet) return <div className={styles.cmpPage}>{head}{body}</div>;
  if (!mounted) return null;
  return createPortal(<div className={styles.composeRoot} data-leaving={leaving || undefined}>
    {/* 딤 — 쓰던 내용이 없을 때만 바깥을 눌러 닫는다(실수로 날리지 않게) */}
    <div className={styles.composeDim} aria-hidden="true" onClick={() => { if (!dirty) requestClose(); }} />
    <div className={styles.composeModal} role="dialog" aria-modal="true" aria-label={post ? '게시글 수정' : '새 게시글'}>
      <div className={styles.cmpHandle} aria-hidden="true" />
      {head}{body}
    </div>
  </div>, document.body);
}
