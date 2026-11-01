'use client';

// 리뷰어 프로필(261101) — 리뷰 카드의 프사·이름을 누르면 온다.
//  · 머리 = 프사 72 · 이름 · 평균 별점 → 회색 숫자 칸 3개(리뷰 · 팔로워 · 팔로잉, 뒤 둘은 누르면 그 탭) → 팔로우 큰 버튼.
//  · 탭 = 리뷰 · 팔로워 · 팔로잉(회색 트랙 위 흰 알약). 리뷰 = 그 사람이 쓴 리뷰 전부(상품 머리 + 별점·본문·사진).
//  · 팔로우는 낙관적으로 바로 바꾸고, 실패하면 되돌린다. 비로그인은 로그인 시트를 띄운다.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, ChevronRight } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import Avatar from '@/components/common/Avatar';
import MonoIcon from '@/components/common/MonoIcon';
import { StarRating, ReviewStars } from '@/components/detail/DetailKit';
import { useStore } from '@/store';
import { resolveProductImageUrl } from '@/lib/images';
import { reviewerHref, type FollowUser, type ReviewerProfile, type ReviewerReview } from '@/lib/reviewer';

type Tab = 'reviews' | 'followers' | 'following';
const TABS: { key: Tab; label: string }[] = [
  { key: 'reviews', label: '리뷰' },
  { key: 'followers', label: '팔로워' },
  { key: 'following', label: '팔로잉' },
];

const askLogin = () => window.dispatchEvent(new Event('dental:login'));

export default function ReviewerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const showToast = useStore((s) => s.showToast);
  const [data, setData] = useState<ReviewerProfile | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('reviews');
  const [lists, setLists] = useState<Partial<Record<Exclude<Tab, 'reviews'>, FollowUser[]>>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as ReviewerProfile;
      })
      .then((body) => { if (!cancelled) setData(body); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [id, isLoggedIn]);

  // 팔로워·팔로잉 목록 — 그 탭을 처음 열 때 받아 온다(팔로우를 바꾸면 다시)
  const loadList = useCallback((key: Exclude<Tab, 'reviews'>) => {
    fetch(`/api/users/${encodeURIComponent(id)}/follows?type=${key}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((body) => setLists((prev) => ({ ...prev, [key]: (body.users ?? []) as FollowUser[] })))
      .catch(() => setLists((prev) => ({ ...prev, [key]: [] })));
  }, [id]);

  const openTab = (key: Tab) => {
    setTab(key);
    if (key !== 'reviews' && !lists[key]) loadList(key);
  };

  const toggleFollow = async () => {
    if (!data || busy) return;
    if (!isLoggedIn) { askLogin(); return; }
    const next = !data.isFollowing;
    const prev = data;
    setBusy(true);
    setData({ ...data, isFollowing: next, stats: { ...data.stats, followerCount: Math.max(0, data.stats.followerCount + (next ? 1 : -1)) } });
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}/follow`, { method: next ? 'POST' : 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '잠시 후 다시 시도해 주세요.');
      setData((cur) => (cur ? { ...cur, isFollowing: body.following, stats: { ...cur.stats, followerCount: body.followerCount } } : cur));
      showToast(next ? `${prev.user.name}님을 팔로우했어요` : '팔로우를 끊었어요');
      if (lists.followers) loadList('followers');
    } catch (error) {
      setData(prev);
      showToast(error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  // 목록 줄의 작은 팔로우 버튼 — 그 줄만 바꾼다
  const toggleRow = async (key: Exclude<Tab, 'reviews'>, row: FollowUser) => {
    if (!isLoggedIn) { askLogin(); return; }
    const next = !row.isFollowing;
    const patch = (value: boolean) => setLists((prev) => ({
      ...prev,
      [key]: prev[key]?.map((u) => (u.id === row.id ? { ...u, isFollowing: value } : u)),
    }));
    patch(next);
    const res = await fetch(`/api/users/${encodeURIComponent(row.id)}/follow`, { method: next ? 'POST' : 'DELETE' }).catch(() => null);
    if (!res?.ok) {
      patch(!next);
      showToast('잠시 후 다시 시도해 주세요.');
      return;
    }
    // 내 프로필이면 팔로잉 수도 같이 맞는다
    if (data?.isMe) {
      setData((cur) => (cur ? { ...cur, stats: { ...cur.stats, followingCount: Math.max(0, cur.stats.followingCount + (next ? 1 : -1)) } } : cur));
    }
  };

  if (failed) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar />
        <div className="flex flex-col items-center px-6 py-20 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
            <MonoIcon name="user" size={34} color="#B0B8C1" />
          </span>
          <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">프로필을 찾을 수 없어요</p>
          <p className="mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]">탈퇴했거나 잘못된 주소예요</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar />
        <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
      </div>
    );
  }

  const { user, stats } = data;
  const tabIndex = TABS.findIndex((t) => t.key === tab);
  const counts: Record<Tab, number> = { reviews: stats.reviewCount, followers: stats.followerCount, following: stats.followingCount };

  return (
    <div className="min-h-screen bg-white pb-16 page-enter">
      <TopBar />

      {/* ─── 머리 — 프사 · 이름 · 평균 별점 ─── */}
      <div className="px-5 pt-1">
        <div className="qd-a-item flex items-center gap-4">
          <Avatar seed={user.id} size={72} alt="" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[24px] font-bold tracking-[-0.6px] text-[#191F28]">{user.name}</p>
            {stats.reviewCount > 0 ? (
              <div className="mt-1 flex items-center gap-1.5">
                <StarRating value={stats.avgRating} size={16} />
                <span className="text-[15px] font-bold tabular-nums text-[#333D4B]">{stats.avgRating.toFixed(1)}</span>
                <span className="text-[14px] text-[#8B95A1]">평균 별점</span>
              </div>
            ) : (
              <p className="mt-1 text-[15px] text-[#8B95A1]">아직 남긴 리뷰가 없어요</p>
            )}
          </div>
        </div>

        {/* 숫자 줄 — 칸 없이 글자만(261101 사장). 누르면 그 탭으로 */}
        <div className="qd-a-item mt-4 flex items-center gap-5" style={{ animationDelay: '.05s' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => openTab(t.key)}
              className="flex items-baseline gap-1 py-1 text-[15px] text-[#6B7684] transition-opacity active:opacity-60"
            >
              {t.label}
              <span className="text-[17px] font-bold tabular-nums tracking-[-0.3px] text-[#191F28]">{counts[t.key].toLocaleString()}</span>
            </button>
          ))}
        </div>

        {/* 팔로우 — 내 프로필이거나 팔로우 표가 아직 없으면 숨긴다 */}
        {!data.isMe && data.followReady && (
          <button
            type="button"
            onClick={toggleFollow}
            disabled={busy}
            aria-pressed={data.isFollowing}
            className={`qd-a-item mt-3 flex h-14 w-full items-center justify-center gap-1.5 rounded-[18px] text-[17px] font-bold transition-all active:scale-[0.98] ${
              data.isFollowing ? 'bg-[#F2F4F6] text-[#4E5968]' : 'bg-[#4A82EE] text-white'
            }`}
            style={{ animationDelay: '.1s' }}
          >
            {data.isFollowing && <Check size={20} strokeWidth={2.4} />}
            {data.isFollowing ? '팔로잉' : '팔로우'}
          </button>
        )}
      </div>

      {/* ─── 탭 ─── */}
      <div className="sticky top-[56px] z-10 mt-6 bg-white px-5 pb-1 pt-1">
        <div className="relative flex gap-1 rounded-2xl bg-[#F2F3F5] p-1">
          <span
            aria-hidden
            className="absolute bottom-1 top-1 rounded-[13px] bg-white shadow-[0_1px_4px_rgba(25,31,40,0.08)] transition-all duration-500"
            style={{
              left: `calc(4px + ${tabIndex} * (100% - 8px) / 3)`,
              width: 'calc((100% - 8px) / 3)',
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => openTab(t.key)}
                aria-pressed={active}
                className={`relative flex flex-1 items-center justify-center gap-1 rounded-[13px] py-2.5 text-[14px] transition-colors duration-300 ${active ? 'font-bold text-[#191F28]' : 'font-semibold text-[#8B95A1]'}`}
              >
                {t.label}
                {counts[t.key] > 0 && <span className={active ? 'text-[#3180F7]' : ''}>{counts[t.key]}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'reviews' ? (
        <div key="reviews" className="list-fade-slide px-5">
          {data.reviews.length === 0 ? (
            <Empty icon="chat-bubble" title="아직 남긴 리뷰가 없어요" />
          ) : (
            data.reviews.map((r, i) => <ReviewItem key={r.id} review={r} first={i === 0} index={i} />)
          )}
        </div>
      ) : (
        <div key={tab} className="list-fade-slide px-5 pt-2">
          {!lists[tab] ? (
            <p className="py-16 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
          ) : lists[tab]!.length === 0 ? (
            <Empty icon="user" title={tab === 'followers' ? '아직 팔로워가 없어요' : '아직 팔로우한 사람이 없어요'} />
          ) : (
            lists[tab]!.map((u, i) => (
              <div key={u.id} className="qd-a-item flex items-center gap-3 py-2.5" style={{ animationDelay: `${Math.min(i, 8) * 0.03}s` }}>
                <Link href={reviewerHref(u.id)} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70">
                  <Avatar seed={u.id} size={44} alt="" className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold text-[#191F28]">{u.name}</span>
                    <span className="mt-0.5 block text-[14px] text-[#8B95A1]">리뷰 {u.reviewCount}개</span>
                  </span>
                </Link>
                {!u.isMe && (
                  <button
                    type="button"
                    onClick={() => toggleRow(tab, u)}
                    className={`h-8 shrink-0 rounded-[8px] px-3 text-[14px] font-semibold transition-transform active:scale-95 ${
                      u.isFollowing ? 'bg-[#F2F4F6] text-[#6B7684]' : 'bg-[#EFF5FE] text-[#2F6FE4]'
                    }`}
                  >
                    {u.isFollowing ? '팔로잉' : '팔로우'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** 리뷰 한 장 — 상품 머리(누르면 상품) → 별점·날짜 → 본문 → 전·후 사진 → 시술 정보 */
function ReviewItem({ review, first, index }: { review: ReviewerReview; first: boolean; index: number }) {
  const photos = [
    ...(review.beforeImage ? [{ src: review.beforeImage, label: '전' }] : []),
    ...(review.afterImage ? [{ src: review.afterImage, label: '후' }] : []),
  ];
  const meta = [
    review.treatmentDate ? `${review.treatmentDate} 시술` : '',
    review.totalCost ? `총 ${review.totalCost.toLocaleString()}원` : '',
    review.doctorName ? `${review.doctorName} 원장` : '',
  ].filter(Boolean).join(' · ');
  const title = review.product?.title || review.treatmentName || '시술 후기';
  const head = (
    <>
      <span className="h-[48px] w-[48px] shrink-0 overflow-hidden rounded-[12px] bg-[#F2F4F6]">
        {review.product && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveProductImageUrl(review.product.imageUrl ?? undefined, review.product.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        {review.hospitalName && <span className="truncate text-[13px] text-[#8B95A1]">{review.hospitalName}</span>}
        <span className="line-clamp-1 text-[16px] font-semibold leading-snug text-[#191F28]">{title}</span>
      </span>
    </>
  );
  return (
    <article className={`qd-a-item py-5 ${first ? '' : 'border-t border-[#F2F4F6]'}`} style={{ animationDelay: `${Math.min(index, 6) * 0.04}s` }}>
      {review.product ? (
        <Link href={`/product/${review.product.id}`} className="flex items-center gap-3 rounded-[14px] bg-[#F9FAFB] p-2.5 pr-3 active:bg-[#F2F4F6]">
          {head}
          <ChevronRight size={18} className="shrink-0 text-[#B0B8C1]" />
        </Link>
      ) : (
        <div className="flex items-center gap-3 rounded-[14px] bg-[#F9FAFB] p-2.5 pr-3">{head}</div>
      )}
      <div className="mt-3 flex items-center gap-2">
        {review.rating > 0 && <ReviewStars value={review.rating} size={14} />}
        <span className="text-[13.5px] text-[#8B95A1]">{review.date}</span>
      </div>
      {review.content && (
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[16px] leading-[1.6] tracking-[-0.2px] text-[#191F28] [overflow-wrap:anywhere]">{review.content}</p>
      )}
      {photos.length > 0 && (
        <div className="mt-2.5 flex gap-1.5">
          {photos.map((p) => (
            <span key={p.src} className="relative h-[96px] w-[96px] shrink-0 overflow-hidden rounded-[12px] bg-[#F2F4F6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.label} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              <span className="absolute left-1 top-1 rounded-[6px] bg-black/50 px-1.5 text-[11px] font-semibold leading-[18px] text-white">{p.label}</span>
            </span>
          ))}
        </div>
      )}
      {meta && <p className="mt-2 text-[13px] tracking-[-0.2px] text-[#6B7684]">{meta}</p>}
    </article>
  );
}

function Empty({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#F2F4F6]">
        <MonoIcon name={icon} size={30} color="#B0B8C1" />
      </span>
      <p className="mt-4 text-[17px] font-bold tracking-[-0.3px] text-[#333D4B]">{title}</p>
    </div>
  );
}
