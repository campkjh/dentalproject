'use client';

// 스타디 커뮤니티와 같은 토스식 선 아이콘·이모지 줄 — 색은 currentColor 로 옆 글자색을 따른다.
import type { Post } from '@/types';

export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, '')}만`;
  return n.toLocaleString();
}

export function TossHeartIcon({ filled }: { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
    <path d="M12 20.2s-7.6-4.5-7.6-10.1A4.35 4.35 0 0 1 12 7.4a4.35 4.35 0 0 1 7.6 2.7c0 5.6-7.6 10.1-7.6 10.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>;
}
export function TossCommentIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
    <path d="M12 4.3c4.4 0 7.9 3.2 7.9 7.2s-3.5 7.2-7.9 7.2c-1 0-2-.2-2.9-.5L5 19.6l1.1-3.3C4.9 15 4.1 13.3 4.1 11.5c0-4 3.5-7.2 7.9-7.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>;
}
export function TossShareIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
    <circle cx="17.5" cy="5.8" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="6.5" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="17.5" cy="18.2" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    <path d="m8.6 10.8 6.8-3.8M8.6 13.2l6.8 3.8" stroke="currentColor" strokeWidth="1.8" />
  </svg>;
}
export function ReplyArrowIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
    <path d="M5 4.5v6.2a3.3 3.3 0 0 0 3.3 3.3H19m0 0-3.6-3.6M19 14l-3.6 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
export function SortArrowsIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <path d="M8 19V5m0 0L4.8 8.2M8 5l3.2 3.2M16 5v14m0 0-3.2-3.2M16 19l3.2-3.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
export function SendUpIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
    <path d="M12 19V5m0 0-6 6m6-6 6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
export function DotsIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <circle cx="4" cy="10" r="1.7" fill="currentColor" /><circle cx="10" cy="10" r="1.7" fill="currentColor" /><circle cx="16" cy="10" r="1.7" fill="currentColor" />
  </svg>;
}
export function SearchIcon({ size = 21 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" /><path d="M16 16L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}
export function CloseIcon({ size = 15, stroke = 2.6 }: { size?: number; stroke?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>;
}
export function BackIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
// 주간 인기글 카드 수치용 채움 아이콘(15px)
export function HeartFillIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M10.9038 21.2884C11.5698 21.7284 12.4288 21.7284 13.0938 21.2884C15.2088 19.8924 19.8138 16.5554 21.7978 12.8214C24.4128 7.89542 21.3418 2.98242 17.2818 2.98242C14.9678 2.98242 13.5758 4.19142 12.8058 5.23042C12.4818 5.67542 11.8588 5.77442 11.4128 5.45042C11.3278 5.38942 11.2538 5.31442 11.1928 5.23042C10.4228 4.19142 9.03076 2.98242 6.71676 2.98242C2.65676 2.98242 -0.414244 7.89542 2.20176 12.8214C4.18376 16.5554 8.79076 19.8924 10.9038 21.2884Z" fill="currentColor" /></svg>;
}
export function CommentFillIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12.0001 2C6.42809 2 1.91309 6.131 1.91309 11.126C1.91309 13.528 2.97009 15.737 4.69909 17.37L3.83409 21.405C3.73809 21.789 4.12209 22.077 4.50609 21.981L9.02109 19.868C9.98209 20.156 10.9421 20.252 11.9991 20.252C17.5711 20.252 22.0861 16.121 22.0861 11.126C22.0861 6.131 17.5721 2 12.0001 2Z" fill="currentColor" /></svg>;
}
export function EyeFillIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M12.1251 9.22461C10.5251 9.22461 9.2251 10.5246 9.2251 12.1246C9.2251 13.7246 10.5251 15.0246 12.1251 15.0246C13.7251 15.0246 15.0251 13.7246 15.0251 12.1246C15.0251 10.5246 13.7251 9.22461 12.1251 9.22461Z" fill="currentColor" /><path fillRule="evenodd" clipRule="evenodd" d="M12.125 17.1248C9.325 17.1248 7.125 14.8248 7.125 12.1248C7.125 9.4248 9.425 7.1248 12.125 7.1248C14.825 7.1248 17.125 9.4248 17.125 12.1248C17.125 14.8248 14.925 17.1248 12.125 17.1248ZM23.125 10.8248C20.525 6.8248 16.425 4.4248 12.125 4.4248C7.825 4.4248 3.725 6.8248 1.125 10.8248C0.625 11.6248 0.625 12.6248 1.125 13.4248C3.725 17.4248 7.825 19.8248 12.125 19.8248C16.425 19.8248 20.525 17.4248 23.125 13.4248C23.725 12.6248 23.725 11.6248 23.125 10.8248Z" fill="currentColor" /></svg>;
}

// 질문 게시판 글 제목 앞 Q 배지 — 의사 답변이 달리면 파란 Q, 아니면 회색 Q(스타디 QBadge).
export function QBadge({ answered, size = 18 }: { answered: boolean; size?: number }) {
  return <img src={answered ? '/icons/stady/quiz-q-answered.svg' : '/icons/stady/quiz-q-gray.svg'} alt={answered ? '답변완료' : '미답변'} width={size} height={size} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5, marginTop: -3 }} />;
}

// 댓글 입력창 위 이모지 줄 — 누르면 이모지 글자를 넘긴다(입력칸 포커스 유지).
const EMOJI_ITEMS = [
  { icon: 'heart-red', emoji: '❤️', label: '하트' },
  { icon: 'emoji-cry', emoji: '😢', label: '눈물' },
  { icon: 'emoji-grin', emoji: '😁', label: '웃음' },
  { icon: 'emoji-ok', emoji: '👌', label: '오케이' },
  { icon: 'emoji-fire', emoji: '🔥', label: '불' },
  { icon: 'emoji-cold', emoji: '🥶', label: '얼음' },
];
export function EmojiBar({ onPick, className, buttonClassName }: { onPick: (emoji: string) => void; className?: string; buttonClassName?: string }) {
  return <div className={className}>{EMOJI_ITEMS.map(item => <button key={item.icon} type="button" className={buttonClassName} aria-label={`${item.label} 이모지 넣기`} onMouseDown={e => e.preventDefault()} onClick={() => onPick(item.emoji)}>
    <img src={`/icons/stady/${item.icon}.svg`} alt="" width={30} height={30} style={{ display: 'block' }} />
  </button>)}</div>;
}

// 게시판·카테고리별 알약 색(스타디 boardTone): 정해진 이름은 고정색, 나머지는 이름으로 팔레트에서 늘 같은 색.
export interface BoardTone { bg: string; color: string; ink: string }
const mk = (from: string, to: string, color: string, inkA: string): BoardTone => ({
  bg: `linear-gradient(135deg, ${from}, ${to})`, color,
  ink: `linear-gradient(90deg, ${inkA} 0%, #111827 100%)`,
});
const TONE_BLUE = mk('#5a90f3', '#5087f0', '#fff', '#2f6fe8');
const TONE_GRAY = mk('#b7bdc3', '#adb4bb', '#4e5968', '#6b7684');
const TONE_RED = mk('#e6767b', '#e56e73', '#fff', '#d9434b');
const TONE_ORANGE = mk('#f3b14e', '#f3af49', '#fff', '#e8830a');
const TONE_YELLOW = mk('#f8d575', '#f7d372', '#6b5300', '#c28f00');
const TONE_GREEN = mk('#77d4a5', '#74d2a2', '#fff', '#1fa36a');
const TONES: Record<string, BoardTone> = {
  임플란트: TONE_BLUE, 교정: TONE_GREEN, 치아미백: TONE_YELLOW, 사랑니: TONE_ORANGE, 스케일링: TONE_GRAY, 일반진료: TONE_RED,
  질문: TONE_ORANGE, 자유: TONE_BLUE, 치과: TONE_GREEN,
};
const FALLBACK = [TONE_YELLOW, TONE_GRAY, TONE_GREEN, TONE_BLUE];
export function boardTone(name: string): BoardTone {
  if (TONES[name]) return TONES[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}
// 카드 아바타에 겹치는 알약 글자 — 첫 태그, 없으면 게시판 짧은 이름
export function postPillName(post: Pick<Post, 'tags' | 'boardType'>) {
  if (post.tags[0] === '의사꿀팁') return '의사 꿀팁';
  return post.tags[0] || (post.boardType === 'question' ? '질문' : post.boardType === 'free' ? '자유' : '치과');
}

// 카테고리 탭 아이콘(스타디 탭 레일의 컬러 일러스트 방식 — 꺼진 탭은 회색조로 눌러 둔다)
export const categoryIcons: Record<string, string> = {
  전체: '/icons/stady/cg-all-on.svg', 임플란트: '/icons/stady/cat-implant.svg', 교정: '/icons/stady/cat-ortho.svg',
  치아미백: '/icons/stady/cat-whitening.svg', 사랑니: '/icons/stady/cat-wisdom.svg', 스케일링: '/icons/stady/cat-scaling.svg',
  일반진료: '/icons/stady/cat-general.svg',
};
