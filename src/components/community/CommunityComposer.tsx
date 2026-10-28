'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ChevronRight, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/common/Avatar';
import { useStore } from '@/store';
import { compressImage } from '@/lib/compressImage';
import { communityBoards, communityCategories } from '@/lib/community';
import { communityTags } from '@/lib/mock-data';
import type { Post } from '@/types';
import styles from './community.module.css';

export default function CommunityComposer({ initialBoard = 'question', initialCategory, post, onClose, onPosted, inline = false, active = true }: {
  initialBoard?: Post['boardType']; initialCategory?: string; post?: Post;
  onClose: () => void; onPosted: (postId: string) => void;
  inline?: boolean;
  active?: boolean;
}) {
  const router = useRouter();
  const user = useStore(s => s.user);
  const isDoctor = useStore(s => s.isDoctor);
  const addPost = useStore(s => s.addPost);
  const showToast = useStore(s => s.showToast);
  const [board, setBoard] = useState<Post['boardType']>(post?.boardType || (isDoctor ? initialBoard : 'question'));
  const [content, setContent] = useState(post?.content ?? '');
  const [title, setTitle] = useState(post?.title ?? '');
  const [tags, setTags] = useState(post?.tags ?? (initialCategory && initialCategory !== '전체' ? [initialCategory] : []));
  const [image, setImage] = useState(post?.imageUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const choices = isDoctor ? communityBoards : communityBoards.slice(0, 1);
  const availableTags = board === 'question' ? communityCategories.slice(1) : communityTags;
  const dirty = content !== (post?.content ?? '') || image !== (post?.imageUrl ?? '') || title !== (post?.title ?? '');


  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => { if (active) textarea.current?.focus({ preventScroll: true }); }, [active]);
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(180, element.scrollHeight)}px`;
  }, [content]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

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

  function close() {
    if (submitting || uploading) return;
    if (!dirty || window.confirm('작성 중인 내용을 버릴까요?')) {
      if (!post) { setContent(''); setImage(''); setTags([]); }
      onClose();
    }
  }

  return <div className={inline ? styles.inlineEditor : undefined}>
    <header className={styles.sheetHeader}>
      <button type="button" onClick={close} disabled={submitting || uploading}>취소</button>
      <h2>{post ? '게시글 수정' : '새 게시글'}</h2>
      <button type="button" className={styles.iconButton} aria-label="닫기" title="닫기" onClick={close} disabled={submitting || uploading}><X size={20} /></button>
    </header>
    <div className={styles.composeBody}>
      <div className={styles.composeThread}>
        <div className={styles.composeAvatar}><Avatar size={40} src={board === 'free' ? undefined : user?.profileImage} role={board !== 'free' && isDoctor ? 'doctor' : 'user'} seed={user?.id} /></div>
        <div className={styles.composeMain}>
          <div className={styles.composeName}>
            <strong>{board === 'free' ? '익명' : user?.name || '사용자'}</strong><ChevronRight size={15} color="#b0b8c1" />
            <select aria-label="게시판" value={board} disabled={Boolean(post)} onChange={e => { setBoard(e.target.value as Post['boardType']); setTags([]); }}>
              {choices.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          {post && <input className={styles.composeTitle} aria-label="제목" value={title} maxLength={100} onChange={e => setTitle(e.target.value)} />}
          <textarea ref={textarea} aria-label="게시글 내용" placeholder={board === 'question' ? '궁금한 치아 이야기를 들려주세요.' : '어떤 이야기를 나누고 싶으세요?'} value={content} maxLength={5000} onChange={e => setContent(e.target.value)} />
          {image && <div className={styles.uploadPreview}>
            <img src={image} alt="첨부 이미지" />
            <button type="button" aria-label="첨부 이미지 삭제" title="첨부 이미지 삭제" disabled={uploading} onClick={() => setImage('')}><X size={16} /></button>
          </div>}
          <div className={styles.composeTools}>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
            <button type="button" className={styles.iconButton} title="사진 첨부" aria-label="사진 첨부" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <LoaderCircle size={23} className="animate-spin" /> : <ImagePlus size={23} />}
            </button>
            <span className={styles.composeCount}>{content.length.toLocaleString()}/5,000</span>
          </div>
          <div className={styles.tagPicker} aria-label="게시글 태그">
            {availableTags.map(tag => <button key={tag} type="button" aria-pressed={tags.includes(tag)} onClick={() => {
              if (!tags.includes(tag) && tags.length >= 5) { showToast('태그는 최대 5개까지 선택할 수 있습니다.'); return; }
              setTags(current => current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]);
            }}>{tag}</button>)}
          </div>
        </div>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
    <footer className={styles.composeFooter}>
      <span>{board === 'free' ? '익명으로 게시됩니다.' : '함께 나누는 건강한 치아 이야기'}</span>
      <button type="button" className={styles.submit} onClick={submit} disabled={!content.trim() || submitting || uploading}>{submitting ? '저장 중' : uploading ? '업로드 중' : post ? '저장' : '게시'}</button>
    </footer>
  </div>;
}
