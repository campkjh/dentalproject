'use client';

// 포켓 커뮤니티 탭 한 줄(261101) — 주제 알약 · 시간 → 제목(굵게 2줄) · 본문 1줄 회색 → 좋아요 · 댓글 수, 사진이 있으면 오른쪽 64 썸네일.
//  · 줄을 누르면 커뮤니티 글 상세(/community/[id]) — 커뮤니티 목록에서 여는 것과 같은 주소.
//  · 오른쪽 위 × = 포켓에서 빼기(상품 줄과 같은 자리 · 옆으로 밀리며 접힌다).
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { Post } from '@/types';
import { communityRelativeTime } from '@/lib/community';
import { boardTone, formatCount, postPillName, TossCommentIcon, TossHeartIcon } from '@/components/community/StadyIcons';
import styles from './pocket.module.css';

export default function PocketPostRow({
  post,
  leaving = false,
  onRemove,
  className = '',
  style,
}: {
  post: Post;
  leaving?: boolean;
  onRemove: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const pill = postPillName(post);
  const tone = boardTone(pill);
  const image = post.thumbnailUrl || post.imageUrl;
  const preview = post.content !== post.title ? post.content.replace(/\s+/g, ' ').trim() : '';

  return (
    <li className={`relative py-4 ${leaving ? styles.rowLeave : ''} ${className}`} style={style}>
      <Link href={`/community/${post.id}`} className="flex min-w-0 items-start gap-3 pr-9 transition-opacity active:opacity-70">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-6 shrink-0 items-center rounded-[8px] px-2 text-[12.5px] font-semibold" style={{ background: tone.bg, color: tone.color }}>{pill}</span>
            <span className="truncate text-[13px] text-[#8B95A1]">{post.isAnonymous ? '익명' : post.authorName} · {communityRelativeTime(post)}</span>
          </span>
          <span className="mt-1.5 line-clamp-2 break-words text-[16px] font-semibold leading-[1.4] tracking-[-0.3px] text-[#191F28]">{post.title}</span>
          {preview && <span className="mt-0.5 block truncate text-[14px] leading-[1.5] text-[#6B7684]">{preview}</span>}
          <span className="mt-2 flex items-center gap-3 text-[13px] tabular-nums text-[#8B95A1] [&_svg]:h-4 [&_svg]:w-4">
            <span className="inline-flex items-center gap-1"><TossHeartIcon />{formatCount(post.likeCount)}</span>
            <span className="inline-flex items-center gap-1"><TossCommentIcon />{formatCount(post.commentCount)}</span>
          </span>
        </span>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" decoding="async" className="mt-1 h-16 w-16 shrink-0 rounded-[12px] bg-[#F2F4F6] object-cover" />
        )}
      </Link>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${post.title} 포켓에서 빼기`}
        className="absolute right-0 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[#B0B8C1] transition active:scale-90 active:bg-[#F2F4F6]"
      >
        <X size={18} strokeWidth={2.2} />
      </button>
    </li>
  );
}
