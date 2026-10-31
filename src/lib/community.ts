import type { Post } from '@/types';

// 의사 전용 게시판(의사끼리) — 고객에게는 목록·상세·댓글 모두 보이지 않는다(API 에서 거름)
export const DOCTOR_ONLY_BOARDS: Post['boardType'][] = ['free', 'dental'];
export const isDoctorOnlyBoard = (board: string | null | undefined) => board === 'free' || board === 'dental';
// 의사 꿀팁 = 고객 커뮤니티(question 게시판)에 의사가 남기는 글. DB 칸을 늘리지 않고 첫 태그로 표시한다.
export const TIP_TAG = '의사꿀팁';
// 예전에 의사 계정이 질문 게시판에 쓴 글(표시 없음)도 꿀팁으로 본다 — 고객 질문 칸·답변 대기에 섞이지 않게
export const isTipPost = (post: Pick<Post, 'boardType' | 'tags' | 'authorTitle'>) => post.boardType === 'question' && (post.tags.includes(TIP_TAG) || post.authorTitle === '의사');

export const communityCategories = ['전체', '임플란트', '교정', '치아미백', '사랑니', '스케일링', '일반진료'];
export const communityBoards = [
  { value: 'question', label: '의사에게 질문', icon: '/icons/community-doctor-board-v2.svg' },
  { value: 'free', label: '자유익명게시판', icon: '/icons/nav-community.svg' },
  { value: 'dental', label: '과별게시판', icon: '/icons/nav-reservation.svg' },
] as const;

export interface CommunityPostRow {
  id: string;
  board_type: Post['boardType'];
  title: string;
  content: string;
  author_id: string;
  is_anonymous?: boolean;
  anonymous_id?: string | null;
  is_secret?: boolean | null;
  created_at?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  image_url?: string | null;
  thumbnail_url?: string | null;
  tags?: string[];
  has_answer?: boolean;
  answer_count?: number;
  author?: { name?: string; is_doctor?: boolean; profile_image?: string } | null;
}

export function communityPostFromRow(p: CommunityPostRow): Post {
  return {
    id: p.id, boardType: p.board_type, title: p.title, content: p.content,
    authorId: p.author_id,
    authorName: p.is_anonymous ? '익명' : p.author?.name || '익명',
    authorTitle: !p.is_anonymous && p.author?.is_doctor ? '의사' : undefined,
    authorProfileImage: p.is_anonymous ? undefined : p.author?.profile_image,
    isAnonymous: p.is_anonymous, anonymousId: p.anonymous_id ?? undefined, isSecret: Boolean(p.is_secret),
    date: p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '',
    createdAt: p.created_at, viewCount: p.view_count ?? 0,
    likeCount: p.like_count ?? 0, commentCount: p.comment_count ?? 0,
    imageUrl: p.image_url?.startsWith('data:') ? undefined : p.image_url || undefined,
    thumbnailUrl: p.thumbnail_url?.startsWith('data:') ? undefined : p.thumbnail_url || undefined,
    tags: p.tags ?? [], hasAnswer: p.has_answer ?? false, answerCount: p.answer_count ?? 0,
  };
}

export function communityRelativeTime(post: Pick<Post, 'createdAt' | 'date'>) {
  const time = new Date(post.createdAt || post.date).getTime();
  if (!Number.isFinite(time)) return post.date;
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}일 전`;
  return new Date(time).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

export function getWeeklyPopularPosts(posts: Post[], now = new Date()) {
  const week = new Date(now);
  week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
  week.setHours(0, 0, 0, 0);
  const answered = posts.filter(p => p.boardType === 'question' && (p.hasAnswer || (p.answerCount ?? 0) > 0));
  const current = answered.filter(p => new Date(p.createdAt || p.date).getTime() >= week.getTime());
  return [...(current.length ? current : answered)]
    .sort((a, b) => b.viewCount - a.viewCount || new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
    .slice(0, 5);
}
