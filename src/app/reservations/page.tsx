'use client';

// 예약내역 = 프리티풀 매칭(/inquiries) 화면 어법 그대로.
//  · 머리 = 제목 ⌄ 거르기(탭 대신, 알림처럼 눌러서 상태를 고른다) + 오른쪽 돋보기. PC 는 26 제목 + 부제, 오른쪽 340 요약 칸.
//  · 칸 = 웨딩숲 글 카드 계층: (진행 중이면) 굴러 바뀌는 진행 문구 → 제목(방문 일시 16 굵게) → 메타(14 회색) → 본문(병원 16.5)
//    → 조건 칩(회색 · 모서리 6) → 회색 둥근 줄(상품 사진 · 이름 15 굵게 · 상태 배지 · 오른쪽 동작).
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
import MatchCardDeck, { RollingText, type DeckCard } from '@/components/reservations/MatchCardDeck';
import { useEntranceWindow, useListEntrance, useTabEntrance } from '@/components/reservations/useTabEntrance';
import styles from '@/components/reservations/match.module.css';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useReservationRealtimeRefresh } from '@/lib/realtime/reservations';
import { useStore } from '@/store';
import { Reservation } from '@/types';
import { resolveProductImageUrl } from '@/lib/images';
import { formatWhen } from '@/lib/reservation-format';
import MonoIcon from '@/components/common/MonoIcon';

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

/** 조건 칩 — 결제 방식 · 담당 의사 · 일정 변경 */
function reservationTags(r: Reservation): string[] {
  const tags: string[] = [];
  tags.push(r.paymentMethod === '앱결제' ? '앱결제' : '현장결제');
  if (r.assignedDoctor) tags.push(`${r.assignedDoctor} ${r.assignedDoctorTitle || '원장'}`.trim());
  if (r.scheduleHistory?.length) tags.push('일정 변경됨');
  return tags;
}

/** 진행 문구(굴러 바뀜) — 실제 상태로만 만든다. 끝난 예약(완료·취소)은 할 일이 없어 문구 없이 */
function reservationHero(r: Reservation): { lines: string[]; sub: string } | null {
  const hospital = r.hospitalName || '병원';
  const when = formatWhen(r.visitDate || r.reservationDate);
  if (r.status === 'pending') {
    return {
      lines: [`${hospital}에서 예약을 확인하고 있어요`, ...(when ? [`${when} 방문으로 요청했어요`] : [])],
      sub: '확정되면 알림으로 바로 알려드릴게요',
    };
  }
  if (r.status === 'confirmed') {
    const change = r.scheduleHistory?.[0]?.content;
    return {
      lines: [`${hospital} 예약이 확정됐어요`, ...(change ? [change] : when ? [`${when}에 만나요`] : [])],
      sub: '방문 당일 늦지 않게 도착해 주세요',
    };
  }
  return null;
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
  const pickFilter = (key: FilterKey) => { setFilter(key); setFilterSwitched(true); };
  const titleEnter = entrance ? styles.enterTitle : '';

  return (
    <div className="min-h-screen bg-white pb-[86px] pc:pb-16">
      {/* 모바일 머리줄 — 프리티풀 탭 머리 표준(왼쪽 16 · 20 굵게 · 오른쪽 돋보기 하나) */}
      <header className="sticky top-0 z-20 bg-white px-4 pb-2 pt-2 pc:hidden">
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
          <LoginRequired />
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
            ) : visible.length === 0 ? (
              <div className="px-6 py-24 text-center text-[13px] text-[#8B95A1]">
                {filter === 'all' ? '예약' : statusLabel[filter]} 상태인 예약이 없어요
              </div>
            ) : (
              <div key={filter} className={filterSwitched ? styles.listSwitch : undefined}>
                {visible.map((r) => {
                  const hero = reservationHero(r);
                  const tags = reservationTags(r);
                  const enter = enterProps(r.id);
                  const productImage = resolveProductImageUrl(r.productImage, r.productId ?? r.id);
                  const createdAt = formatWhen(r.date);
                  return (
                    // 웨딩숲 글 카드(.tcard) 계층 — 제목(16 굵게, 방문 일시)/메타(14 회색)/본문(16.5, 병원)/상품 줄(댓글 계층)
                    <section
                      key={r.id}
                      className={`border-b border-[#F2F4F6] px-4 pb-4 pt-[18px] last:border-b-0 min-[601px]:pb-[18px] min-[601px]:pt-[22px] pc:px-0 ${enter.className ?? ''}`}
                      style={enter.style}
                    >
                      {hero && (
                        // 진행 칸 — 굴러 바뀌는 문구. 박스 없이 화면에 바로, 위아래 간격 촘촘하게
                        <div className="mb-3 text-center">
                          <RollingText items={hero.lines} className="text-[17px] font-bold leading-[1.4] tracking-[-0.3px] text-[#191F28]" />
                          <p className="mt-0.5 text-[14px] tracking-[-0.2px] text-[#8B95A1]">{hero.sub}</p>
                        </div>
                      )}

                      {/* 제목 — 방문 일시 */}
                      <p className="truncate pt-px text-[16px] font-bold tracking-[-0.3px] text-[#191F28] min-[601px]:text-[17px]">{visitTitle(r)}</p>
                      {/* 메타 — 예약일 · 결제 금액(회색 14) */}
                      <p className="mt-1 text-[14px] tracking-[-0.2px] text-[#8B95A1] min-[601px]:text-[15px]">
                        {createdAt ? `${createdAt} 예약 · ` : ''}{r.amount.toLocaleString()}원
                      </p>

                      {/* 본문(16.5) — 병원 */}
                      <p className="mt-3 flex items-center gap-1.5 text-[16.5px] leading-[1.5] tracking-[-0.3px] text-[#191F28] min-[601px]:text-[17.5px]">
                        <MonoIcon name="pin-location" size={18} color="#B0B8C1" />
                        <span className="min-w-0 truncate">{r.hospitalName || '병원 정보 없음'}</span>
                        {r.location && <span className="shrink-0 text-[14px] text-[#8B95A1]">{r.location}</span>}
                      </p>

                      {/* 조건 — 웨딩숲 카테고리 칩(회색 · 모서리 6 · 13) */}
                      {tags.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-x-2 gap-y-1.5">
                          {tags.map((tag) => (
                            <span key={tag} className="rounded-[6px] bg-[#F2F4F6] px-[9px] py-1 text-[13px] font-semibold text-[#6B7684]">{tag}</span>
                          ))}
                        </div>
                      )}

                      {/* 예약한 상품 — 웨딩숲 댓글 줄 계층(사진 40 · 이름 15 굵게 · 상태 배지 · 오른쪽 동작) */}
                      <div className="mt-3.5 flex items-center overflow-hidden rounded-[16px] bg-[#F9FAFB]">
                        <Link
                          href={`/reservations/${r.id}`}
                          className="flex min-w-0 flex-1 items-center gap-2.5 py-3 pl-3.5 pr-2 text-left transition-colors active:bg-[#F2F4F6] pc:hover:bg-[#F2F4F6]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={productImage} alt="" className="h-10 w-10 shrink-0 rounded-[10px] bg-[#F2F3F5] object-cover" loading="lazy" />
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="min-w-0 truncate text-[15px] font-bold tracking-[-0.2px] text-[#333D4B]">{r.productTitle || '시술 상품'}</span>
                              <StatusTag status={r.status} />
                            </span>
                            {r.status === 'cancelled' && r.cancelReason ? (
                              <span className="mt-1 line-clamp-2 break-words text-[14px] leading-[1.45] tracking-[-0.2px] text-[#191F28]">취소 사유 · {r.cancelReason}</span>
                            ) : (
                              <span className="mt-0.5 block truncate text-[13px] tracking-[-0.2px] text-[#8B95A1]">
                                {r.paymentMethod === '앱결제' ? '앱결제' : '현장결제'} {r.amount.toLocaleString()}원
                              </span>
                            )}
                          </span>
                        </Link>
                        {/* 예약 취소 — 아직 병원이 확인 중인 예약만 */}
                        {r.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleCancel(r.id)}
                            className="mr-3 h-9 shrink-0 rounded-full bg-white px-3 text-[13.5px] font-semibold tracking-[-0.2px] text-[#6B7684] transition active:scale-95"
                          >
                            예약 취소
                          </button>
                        )}
                        {/* 리뷰 쓰기 — 시술을 마친 예약만(연파랑 면 · 파랑 굵은 글자) */}
                        {r.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => writeReview(r)}
                            className="mr-3 h-9 shrink-0 rounded-full bg-[#E8F3FF] px-3 text-[13.5px] font-bold tracking-[-0.2px] text-[#3180F7] transition active:scale-95"
                          >
                            리뷰 쓰고 500P
                          </button>
                        )}
                        {(r.status === 'confirmed' || r.status === 'cancelled') && (
                          <Link
                            href={`/reservations/${r.id}`}
                            aria-label="예약 상세"
                            className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#B0B8C1] transition active:scale-90"
                          >
                            <ChevronRight size={20} />
                          </Link>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          {/* PC 오른쪽 요약 — 상태별 개수(누르면 그 상태만) + 다음 행동. self-stretch 가 있어야 sticky 가 붙을 자리가 생긴다 */}
          <aside className="hidden pc:block pc:self-stretch">
            <div className="sticky top-[92px] space-y-4">
              <div className="rounded-[24px] bg-[#F9FAFB] p-5">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/toss/calendar-check.svg" alt="" className="h-5 w-5" />
                  <h2 className="text-[15px] font-bold text-[#191F28]">진행 현황</h2>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#4E5968]">{counts.all}건</span>
                </div>
                <ul className="mt-3 flex flex-col gap-1">
                  {STATUS_ORDER.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => pickFilter(filter === s ? 'all' : s)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] transition-colors ${filter === s ? 'bg-white' : 'hover:bg-white'}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={statusIcon[s]} alt="" className="h-[22px] w-[22px]" />
                        <span className="flex-1 text-left font-medium text-[#191F28]">{statusLabel[s]}</span>
                        <span className="font-semibold tabular-nums text-[#4E5968]">{counts[s]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[24px] bg-[#F9FAFB] p-5">
                <p className="text-[13px] font-bold text-[#191F28]">다음 시술을 찾고 있나요?</p>
                <p className="mt-1 text-[12px] leading-5 text-[#8B95A1]">
                  병원이 예약을 확인하면 알림으로 알려드려요. 포켓에 담아 둔 상품도 바로 예약할 수 있어요.
                </p>
                <Link
                  href="/search"
                  className="mt-4 flex h-11 w-full items-center justify-center rounded-[14px] bg-[#3180F7] text-[14px] font-bold text-white transition-colors hover:bg-[#2272EB] active:scale-[0.98]"
                >
                  시술 더 찾아보기
                </Link>
                <Link
                  href="/wishlist"
                  className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[14px] bg-white text-[13px] font-bold text-[#4E5968] transition-colors hover:bg-[#F2F4F6]"
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
