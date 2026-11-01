// 리뷰어 프로필(261101) — 리뷰 카드의 프사·이름을 누르면 /user/[id] 로 가서 그 사람이 쓴 리뷰 전부 + 팔로우.
// 자료는 /api/users/[id](프로필·리뷰·숫자), /api/users/[id]/follow(팔로우 넣고 빼기), /api/users/[id]/follows(팔로워·팔로잉 목록).
// 밖으로 내보내는 건 리뷰 카드에 이미 보이던 것(이름·별점·본문·사진·시술)뿐 — 전화·이메일 같은 건 싣지 않는다.

export type ReviewerReview = {
  id: string;
  rating: number;
  content: string;
  date: string;
  treatmentName: string;
  treatmentDate: string;
  totalCost: number;
  beforeImage?: string;
  afterImage?: string;
  doctorName?: string;
  product: { id: string; title: string; imageUrl: string | null } | null;
  hospitalName: string | null;
};

export type ReviewerProfile = {
  user: { id: string; name: string; isDoctor: boolean; joinedAt: string | null };
  stats: { reviewCount: number; avgRating: number; followerCount: number; followingCount: number };
  reviews: ReviewerReview[];
  isMe: boolean;
  isFollowing: boolean;
  /** 팔로우 표(0022)가 아직 없으면 false — 버튼을 숨긴다 */
  followReady: boolean;
};

export type FollowUser = { id: string; name: string; reviewCount: number; isFollowing: boolean; isMe: boolean };

export function reviewerHref(userId: string) {
  return `/user/${encodeURIComponent(userId)}`;
}

/** 리뷰 카드와 같은 이름 — 비어 있으면 '익명' */
export function reviewerName(name?: string | null) {
  return name && name.trim() ? name.trim() : '익명';
}

export const isMissingTable = (code?: string) => code === '42P01' || code === 'PGRST205';
