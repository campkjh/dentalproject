'use client';

// 예약내역 — 상품 상세·예약 상세(261031 쿠팡 견본) 톤(261101).
//  · 머리 = 제목 ⌄ 거르기(눌러서 상태를 고른다 — 토스 팝 메뉴) + 오른쪽 돋보기. PC 는 26 제목 + 부제, 오른쪽 340 요약 칸.
//  · 모바일 머리 아래 = 회색 면 상태별 개수 4칸(누르면 그 상태만, 다시 누르면 전체).
//  · 칸 = 테두리 없이 회색 띠로 나눈다: 상태 배지 + 한 줄 안내 → 상품 줄(사진 60 · 이름 17 굵게 · 병원 14 회색)
//    → 회색 면 정보 줄(방문 일시 · 결제 · 담당 · 취소 사유) → 같은 폭 행동 버튼(확인중=예약 취소, 완료=리뷰 쓰기).
//  · 첫 진입 = 퀵매칭 등장(제목↑ · 칸 ←), 뒤로가기·30초 안 재진입은 생략. 거르기를 바꾸면 목록 통째 살짝 올라온다.
//  · 기존 기능 유지: 실시간 새로고침 · 예약 취소 확인창/토스트 · 리뷰 쓰기 이동 · 로그인 필요.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import LoginRequired from '@/components/common/LoginRequired';
import { HeaderSearchIcon } from '@/components/icons/HeaderIcons';
import { PocketIcon } from '@/components/icons/PocketIcon';
import TitleFilterMenu, { type TitleFilterOption } from '@/components/reservations/TitleFilterMenu';
import MatchCardDeck, { type DeckCard } from '@/components/reservations/MatchCardDeck';
import { useEntranceWindow, useListEntrance, useTabEntrance } from '@/components/reservations/useTabEntrance';
import styles from '@/components/reservations/match.module.css';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useReservationRealtimeRefresh } from '@/lib/realtime/reservations';
import { useStore } from '@/store';
import { Reservation } from '@/types';
import { resolveProductImageUrl } from '@/lib/images';
import { formatWhen } from '@/lib/reservation-format';
import MonoIcon from '@/components/common/MonoIcon';
import { haptic } from '@/lib/haptics';

type Status = Reservation['status'];
type FilterKey = Status | 'all';

const STATUS_ORDER: Status[] = ['pending', 'confirmed', 'completed', 'cancelled'];

const statusLabel: Record<Status, string> = {
  pending: '예약확인중',
  confirmed: '예약확정',
  completed: '시술완료',
  cancelled: '취소',
};

/** 상태 아이콘(public/icons/status-*.svg) — 거르기 메뉴·PC 진행 현황 */
const statusIcon: Record<Status, string> = {
  pending: '/icons/status-pending.svg',
  confirmed: '/icons/status-confirmed.svg',
  completed: '/icons/status-completed.svg',
  cancelled: '/icons/status-cancelled.svg',
};

// 웨딩숲 배지 색(프리티풀 매칭 getStatusTone)과 같은 값 — 확인중=회색 · 확정=파랑 · 완료=초록 · 취소=빨강
function statusTone(status: Status) {
  if (status === 'completed') return 'bg-[#E6F7EE] text-[#03A94D]';
  if (status === 'confirmed') return 'bg-[#E8F3FF] text-[#3180F7]';
  if (status === 'cancelled') return 'bg-[#FFEEEF] text-[#F04452]';
  return 'bg-[#F2F4F6] text-[#6B7684]';
}

/** 상태 배지 — 웨딩숲 배지 모양(h24 · 모서리 6 · 13.5) */
function StatusTag({ status }: { status: Status }) {
  return (
    <span className={`inline-flex h-6 shrink-0 items-center rounded-[6px] px-[7px] text-[13.5px] font-semibold tracking-[-0.2px] ${statusTone(status)}`}>
      {statusLabel[status]}
    </span>
  );
}

/** 칸 제목 = 방문 일시(프리티풀 매칭의 '행사 일시' 자리) */
function visitTitle(r: Reservation) {
  return formatWhen(r.visitDate || r.reservationDate) || '방문일 미정';
}

/** 상태 한 줄 안내 — 예약 상세와 같은 문구(실제 상태로만) */
function statusGuide(r: Reservation) {
  if (r.status === 'pending') return `${r.hospitalName || '병원'}에서 예약을 확인하고 있어요`;
  if (r.status === 'confirmed') return r.scheduleHistory?.[0]?.content || '예약이 확정됐어요. 늦지 않게 방문해 주세요';
  if (r.status === 'completed') return '시술을 마쳤어요. 후기를 남기면 500P를 드려요';
  return '취소된 예약이에요';
}

const Band = () => <div className="h-2.5 bg-[#F2F4F6] pc:rounded-full" />;

/** 같은 줄 행동 버튼(같은 폭) — 회색 면 · 15 */
const ACTION_BTN =
  'flex h-12 flex-1 items-center justify-center rounded-[14px] bg-[#F2F4F6] text-[15px] font-semibold tracking-[-0.2px] transition-all active:scale-[0.98] active:bg-[#E5E8EB]';

function ReservationCard({ r, onCancel, onReview }: { r: Reservation; onCancel: (id: string) => void; onReview: (r: Reservation) => void }) {
  const productImage = resolveProductImageUrl(r.productImage, r.productId ?? r.id);
  const rows: { label: string; value: React.ReactNode; clamp?: boolean }[] = [
    { label: '방문 일시', value: visitTitle(r) },
    {
      label: '결제',
      value: (
        <>
          {r.paymentMethod === '앱결제' ? '앱결제' : '현장결제'} · <span className="font-semibold tabular-nums text-[#1E3A78]">{r.amount.toLocaleString()}원</span>
        </>
      ),
    },
    ...(r.assignedDoctor ? [{ label: '담당', value: `${r.assignedDoctor} ${r.assignedDoctorTitle || '원장'}` }] : []),
    ...(r.status === 'cancelled' && r.cancelReason ? [{ label: '취소 사유', value: r.cancelReason, clamp: true }] : []),
  ];

  return (
    <section className="px-5 py-6 pc:px-0">
      <Link
        href={`/reservations/${r.id}`}
        className="-mx-2 block rounded-[18px] px-2 py-1.5 transition-colors active:bg-[#F9FAFB] pc:hover:bg-[#F9FAFB]"
      >
        {/* 상태 배지 + 한 줄 안내 */}
        <div className="flex items-center gap-2">
          <StatusTag status={r.status} />
          <span className="min-w-0 flex-1 truncate text-[14.5px] tracking-[-0.2px] text-[#4E5968]">{statusGuide(r)}</span>
          <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
        </div>

        {/* 예약한 상품 — 사진 60 · 이름 17 굵게 · 병원 14 회색 */}
        <div className="mt-3.5 flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImage} alt="" loading="lazy" className="h-[60px] w-[60px] shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold tracking-[-0.3px] text-[#191F28]">{r.productTitle || '시술 상품'}</span>
            <span className="mt-0.5 block truncate text-[14px] tracking-[-0.2px] text-[#8B95A1]">
              {r.hospitalName || '병원 정보 없음'}{r.location ? ` · ${r.location}` : ''}
            </span>
          </span>
        </div>

        {/* 정보 줄 — 회색 면(테두리 없음) · 라벨 회색 · 값 진한 회색 */}
        <dl className="mt-4 rounded-[14px] bg-[#F2F4F6] px-4 py-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start py-1.5">
              <dt className="w-[72px] shrink-0 text-[15px] leading-[1.45] tracking-[-0.2px] text-[#8B95A1]">{row.label}</dt>
              <dd className={`min-w-0 flex-1 text-[15px] leading-[1.45] tracking-[-0.2px] text-[#333D4B] ${row.clamp ? 'line-clamp-2 break-words' : 'truncate'}`}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </Link>

      {/* 행동 — 확인 중이면 예약 취소, 시술을 마쳤으면 리뷰 쓰기(같은 줄 버튼은 같은 폭) */}
      {(r.status === 'pending' || r.status === 'completed') && (
        <div className="mt-3 flex gap-2">
          {r.status === 'pending' && (
            <button type="button" onClick={() => onCancel(r.id)} className={`${ACTION_BTN} text-[#F04452]`}>
              예약 취소
            </button>
          )}
          <Link href={`/reservations/${r.id}`} className={`${ACTION_BTN} text-[#333D4B]`}>
            예약 상세
          </Link>
          {r.status === 'completed' && (
            <button
              type="button"
              onClick={() => onReview(r)}
              className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-[#EFF5FE] text-[15px] font-bold tracking-[-0.2px] text-[#2F6FE4] transition-all active:scale-[0.98] active:bg-[#E2ECFD]"
            >
              리뷰 쓰고 500P
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default function ReservationsPage() {
  const router = useRouter();
  const { authUser } = useSession();
  const { isLoggedIn, reservations, products, showConfirm, showAlert, showToast, updateReservationStatus, hydrateMe } = useStore();
  const [filter, setFilter] = useState<FilterKey>('all');
  // 목록 통째 올라오는 효과는 거르기를 바꿨을 때만(첫 진입은 칸별 등장이 대신한다)
  const [filterSwitched, setFilterSwitched] = useState(false);

  useReservationRealtimeRefresh({
    enabled: Boolean(isLoggedIn && authUser?.id),
    userId: authUser?.id,
    onChange: hydrateMe,
  });

  const counts = useMemo(() => {
    const base: Record<FilterKey, number> = { all: reservations.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    reservations.forEach((r) => { base[r.status] = (base[r.status] || 0) + 1; });
    return base;
  }, [reservations]);

  const visible = useMemo(
    () => (filter === 'all' ? reservations : reservations.filter((r) => r.status === filter)),
    [reservations, filter],
  );

  // 예약이 하나도 없을 때 — 인기 상품 카드 덱(프리티풀 매칭의 '인기 사회자 덱' 자리)
  const emptyDeck = useMemo<DeckCard[]>(
    () => [...products]
      .sort((a, b) => (b.likeCount ?? 0) + (b.reviewCount ?? 0) - ((a.likeCount ?? 0) + (a.reviewCount ?? 0)))
      .map((p) => ({ id: p.id, name: p.title, image: resolveProductImageUrl(p.imageUrl, p.id) }))
      .filter((c) => !!c.image)
      .slice(0, 7),
    [products],
  );

  // 처음 들어올 때 퀵매칭 등장(제목↑ · 칸 ←) — 뒤로가기·30초 안 재진입은 생략
  const entrance = useTabEntrance('reservations');
  const enterProps = useListEntrance(visible.map((r) => r.id), entrance);
  const enterWindow = useEntranceWindow(entrance);

  // 스크롤하면 머리줄 아래로 흰 그라데이션(프리티풀 채팅·매칭과 같은 결)
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCancel = (id: string) => {
    showConfirm(
      '예약 취소',
      '예약을 취소하시겠습니까?\n결제한 금액은 함께 취소돼요.',
      async () => {
        // 결제 취소까지 몇 초 걸리므로 처리 중임을 바로 알린다
        showToast('예약을 취소하고 있어요…');
        const { error } = await updateReservationStatus(id, 'cancelled');
        if (error) showAlert('예약을 취소하지 못했어요', error);
        else showAlert('예약이 취소되었습니다', '앱에서 결제한 금액은 결제수단에 따라 영업일 기준 3~5일 안에 환불돼요.');
      },
      { confirmText: '예약 취소', cancelText: '닫기' }
    );
  };

  const writeReview = (r: Reservation) => {
    router.push(`/mypage/reviews/write?productId=${r.productId ?? ''}&reservationId=${r.id}`);
  };

  // 제목 '예약내역 ⌄' — 눌러서 진행 상태를 고른다(프리티풀 매칭 — 탭 대신). 개수는 메뉴 줄 오른쪽
  const options: TitleFilterOption<FilterKey>[] = [
    // eslint-disable-next-line @next/next/no-img-element
    { key: 'all', label: '전체', title: '예약내역', icon: <img src="/icons/toss/list.svg" alt="" className="h-6 w-6" />, count: counts.all },
    ...STATUS_ORDER.map((s) => ({
      key: s,
      label: statusLabel[s],
      title: statusLabel[s],
      // eslint-disable-next-line @next/next/no-img-element
      icon: <img src={statusIcon[s]} alt="" className="h-6 w-6" />,
      count: counts[s],
    })),
  ];
  const pickFilter = (key: FilterKey) => { if (key !== filter) haptic('selection'); setFilter(key); setFilterSwitched(true); };
  const titleEnter = entrance ? styles.enterTitle : '';

  return (
    <div className="min-h-screen bg-white pb-[86px] pc:pb-16">
      {/* 모바일 머리줄 — 프리티풀 탭 머리 표준(왼쪽 16 · 20 굵게 · 오른쪽 돋보기 하나) */}
      <header className="sticky top-0 z-20 bg-white px-4 pb-2 pt-[calc(8px+env(safe-area-inset-top))] pc:hidden">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-white via-white/70 to-white/0 transition-opacity duration-300 ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div className="flex h-14 items-center justify-between">
          {isLoggedIn ? (
            <TitleFilterMenu<FilterKey> value={filter} onChange={pickFilter} options={options} enterClassName={titleEnter} />
          ) : (
            <h1 className="text-[20px] font-bold leading-none text-[#191F28]">예약내역</h1>
          )}
          <Link
            href="/search"
            aria-label="시술 검색"
            className="-mr-1.5 flex h-11 w-11 items-center justify-center transition-transform active:scale-90"
          >
            <HeaderSearchIcon />
          </Link>
        </div>
      </header>

      {!isLoggedIn ? (
        <>
          <h1 className="hidden pb-4 pt-10 text-[26px] font-bold leading-tight tracking-[-0.5px] text-[#191F28] pc:block">예약내역</h1>
          <LoginRequired title="로그인하고 예약내역을 확인하세요" sub="예약한 시술과 병원별 진행 상태를 한눈에 볼 수 있어요" />
        </>
      ) : (
        <div className="grid items-start gap-8 pc:grid-cols-[minmax(0,1fr)_340px] pc:pt-10">
          <div className="min-w-0">
            {/* PC 제목 — 전체 헤더 아래 큰 제목(26) + 부제(모바일 머리는 pc:hidden) */}
            <div className="mb-5 hidden pc:block">
              <TitleFilterMenu<FilterKey> value={filter} onChange={pickFilter} options={options} titleClassName="text-[26px]" enterClassName={titleEnter} />
              <p className={`mt-1 text-[14px] text-[#8B95A1] ${entrance ? styles.enterSub : ''}`}>예약한 시술과 병원별 진행 상태를 한눈에 확인하세요</p>
            </div>

            {reservations.length === 0 ? (
              // 예약 기록이 없을 때 — 카드 덱(인기 상품) 위 · 권유 · 버튼, 화면 가운데쯤(프리티풀 매칭 빈 화면)
              <div className="flex min-h-[calc(100dvh-220px)] flex-col items-center justify-center px-6 py-10 text-center pc:min-h-[60vh]">
                {/* 덱 자리는 미리 잡아 둔다(사진이 오기 전후로 글이 튀지 않게) */}
                <div className={`flex h-[118px] items-center justify-center ${enterWindow ? styles.enterTitle : ''}`} style={{ animationDelay: '.1s' }}>
                  {emptyDeck.length > 0 && <MatchCardDeck cards={emptyDeck} />}
                </div>
                <p className={`mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28] ${enterWindow ? styles.enterTitle : ''}`} style={{ animationDelay: '.22s' }}>
                  아직 예약한 시술이 없어요
                </p>
                <p className={`mt-1.5 text-[15px] leading-[1.6] tracking-[-0.2px] text-[#8B95A1] ${enterWindow ? styles.enterSub : ''}`} style={{ animationDelay: '.3s' }}>
                  마음에 드는 시술을 찾아 바로 예약해 보세요
                </p>
                {/* 프리티풀 시안('팔로우' 버튼) — 연파랑 면 · 파랑 굵은 글자 · 모서리 높이의 1/4 */}
                <Link
                  href="/"
                  className={`mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold tracking-[-0.3px] text-[#3180F7] transition active:scale-[0.97] active:bg-[#DCEBFF] ${enterWindow ? styles.enterSub : ''}`}
                  style={{ animationDelay: '.38s' }}
                >
                  시술 둘러보기
                </Link>
              </div>
            ) : (
              <>
                {/* 모바일 상태별 개수 — 회색 면 4칸. 누르면 그 상태만, 다시 누르면 전체 */}
                <div className="px-5 pb-5 pt-1 pc:hidden">
                  <div className="grid grid-cols-4 rounded-[16px] bg-[#F2F4F6] py-3.5">
                    {STATUS_ORDER.map((s) => {
                      const on = filter === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={on}
                          onClick={() => pickFilter(on ? 'all' : s)}
                          className="flex flex-col items-center gap-0.5 transition-transform active:scale-95"
                        >
                          <span className={`text-[20px] font-bold tabular-nums tracking-[-0.4px] transition-colors ${on ? 'text-[#2F6FE4]' : counts[s] ? 'text-[#191F28]' : 'text-[#B0B8C1]'}`}>
                            {counts[s]}
                          </span>
                          <span className={`text-[13px] font-semibold tracking-[-0.2px] transition-colors ${on ? 'text-[#2F6FE4]' : 'text-[#8B95A1]'}`}>{statusLabel[s]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="pc:hidden"><Band /></div>

                {visible.length === 0 ? (
                  // 고른 상태에 예약이 없을 때 — 회색 둥근 칸 아이콘 · 19 굵은 제목 · 15 회색 부제
                  <div className="flex flex-col items-center px-6 py-20 text-center">
                    <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
                      <MonoIcon name="calendar-x" size={34} color="#B0B8C1" />
                    </span>
                    <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">
                      {filter === 'all' ? '예약' : statusLabel[filter]} 상태인 예약이 없어요
                    </p>
                    <button
                      type="button"
                      onClick={() => pickFilter('all')}
                      className="mt-1.5 text-[15px] tracking-[-0.2px] text-[#3180F7] active:opacity-70"
                    >
                      전체 예약 보기
                    </button>
                  </div>
                ) : (
                  <div key={filter} className={filterSwitched ? styles.listSwitch : undefined}>
                    {visible.map((r, i) => {
                      const enter = enterProps(r.id);
                      return (
                        <div key={r.id} className={enter.className} style={enter.style}>
                          {i > 0 && <Band />}
                          <ReservationCard r={r} onCancel={handleCancel} onReview={writeReview} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* PC 오른쪽 요약 — 상태별 개수(누르면 그 상태만) + 다음 행동. self-stretch 가 있어야 sticky 가 붙을 자리가 생긴다 */}
          <aside className="hidden pc:block pc:self-stretch">
            <div className="sticky top-[92px] space-y-4">
              <div className="rounded-[20px] bg-[#F2F4F6] p-5">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/toss/calendar-check.svg" alt="" className="h-5 w-5" />
                  <h2 className="text-[17px] font-bold text-[#191F28]">진행 현황</h2>
                  <span className="ml-auto rounded-[6px] bg-white px-2 py-0.5 text-[13px] font-semibold tabular-nums text-[#4E5968]">{counts.all}건</span>
                </div>
                <ul className="mt-3 flex flex-col gap-1">
                  {STATUS_ORDER.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => pickFilter(filter === s ? 'all' : s)}
                        className={`flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2.5 text-[15px] transition-colors ${filter === s ? 'bg-white' : 'hover:bg-white/70'}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={statusIcon[s]} alt="" className="h-[22px] w-[22px]" />
                        <span className={`flex-1 text-left ${filter === s ? 'font-semibold text-[#191F28]' : 'text-[#333D4B]'}`}>{statusLabel[s]}</span>
                        <span className={`font-semibold tabular-nums ${filter === s ? 'text-[#2F6FE4]' : 'text-[#8B95A1]'}`}>{counts[s]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[20px] bg-[#F2F4F6] p-5">
                <p className="text-[17px] font-bold text-[#191F28]">다음 시술을 찾고 있나요?</p>
                <p className="mt-1.5 text-[14px] leading-[1.55] text-[#6B7684]">
                  병원이 예약을 확인하면 알림으로 알려드려요. 포켓에 담아 둔 상품도 바로 예약할 수 있어요.
                </p>
                <Link
                  href="/search"
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-[14px] bg-[#4A82EE] text-[15px] font-bold text-white transition-all hover:bg-[#3F76E2] active:scale-[0.98]"
                >
                  시술 더 찾아보기
                </Link>
                <Link
                  href="/wishlist"
                  className="mt-2 flex h-12 w-full items-center justify-center gap-1.5 rounded-[14px] bg-white text-[15px] font-semibold text-[#4E5968] transition-all hover:bg-[#F9FAFB] active:scale-[0.98]"
                >
                  <PocketIcon size={17} />
                  포켓 보기
                </Link>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
