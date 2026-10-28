'use client';

import { useState, useEffect, useRef, useMemo, type CSSProperties, type RefObject } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import type { Notification } from '@/types';

/* ════════════════════════════════════════════════════════════════
 * 알림 — 프리티풀 알림 화면(토스 알림) 그대로 이식.
 *  · 위: ‹ 뒤로 … 톱니바퀴(알림 설정 /mypage/notifications). 그 아래 큰 제목 '알림 ⌄' — 누르면 종류 거르기 · 모두 읽음.
 *  · 새 알림은 맨 위 연한 파랑 바탕(#F2F6FC), 그 아래 '지난 알림'.
 *  · 한 줄 = 둥근 아이콘 칸 · 제목(진하게) · 본문(회색, 3줄까지) · 오른쪽 날짜 + 같은 곳에서 여럿 오면 'N건'.
 *    같은 종류·같은 곳·같은 제목은 한 줄로 묶는다(토스 'N건').
 *  · 등장: 제목 아래→위 페이드, 줄은 오른쪽→왼쪽 순차 슬라이드.
 * ⚠ 마이닥엔 알림 삭제 API 가 없어 '밀어서 삭제'·'전체 삭제'는 뺐다(화면만 지우는 가짜 동작 금지).
 *   삭제 API 가 생기면 프리티풀 원본(freetiful NotificationsView)의 밀기 핸들러를 그대로 붙이면 된다.
 * ⚠ 스토어 알림엔 생성 시각이 없고 날짜(ko-KR 문자열)만 있어 '방금 전·N분 전' 대신 오늘·어제·M월 D일로 보인다.
 *  · variant='drawer' 면 ‹ 뒤로 = 서랍 닫기, 알림을 눌러 이동하면 서랍을 닫고 이동, 스크롤은 서랍 칸 기준.
 * ════════════════════════════════════════════════════════════════ */

type NotifKind = 'booking' | 'payment' | 'review' | 'notice' | 'event';

interface Item extends Notification {
  kind: NotifKind;
  /** 스토어 순서(서버가 최신순으로 준다) — 정렬 기준 */
  order: number;
}

type Group = { key: string; head: Item; items: Item[]; unread: boolean };

// 토스 컬러 아이콘(public/icons/toss) — 종류마다 색이 달라야 한눈에 갈린다
const KIND_ICON: Record<NotifKind, string> = {
  booking: 'calendar-check',
  payment: 'coin',
  review: 'star',
  notice: 'loudspeaker',
  event: 'gift',
};

// '알림 ⌄' 메뉴 — 토스처럼 컬러 아이콘 + 이름 한 줄씩
const FILTERS: { k: string; label: string; title: string; icon: string; kinds: NotifKind[] | null }[] = [
  { k: 'all', label: '전체', title: '알림', icon: 'list', kinds: null },
  { k: 'booking', label: '예약', title: '예약 알림', icon: 'calendar-check', kinds: ['booking'] },
  { k: 'payment', label: '결제 · 포인트', title: '결제 알림', icon: 'coin', kinds: ['payment'] },
  { k: 'review', label: '후기', title: '후기 알림', icon: 'star', kinds: ['review'] },
  { k: 'notice', label: '공지 · 이벤트', title: '공지 · 이벤트', icon: 'loudspeaker', kinds: ['notice', 'event'] },
];

const UNREAD_BG = '#F2F6FC';

/** 툴팁 메뉴 항목 순차 등장 — globals.css `.pop-menu-item` 과 짝(프리티풀 lib/pop-menu 와 같은 값) */
const popItemDelay = (i: number): CSSProperties => ({ animationDelay: `${0.07 + i * 0.035}s` });

const NT_CSS = `
@keyframes ntFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ntSlideIn { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: translateX(0); } }
.nt-a-title { animation: ntFadeUp .5s cubic-bezier(.22,.61,.36,1) both; }
.nt-a-sub { animation: ntFadeUp .5s cubic-bezier(.22,.61,.36,1) .18s both; }
/* fill backwards — 끝나면 빠져서 눌림 효과가 산다 */
.nt-a-item { animation: ntSlideIn .46s cubic-bezier(.22,.61,.36,1) backwards; }
.nt-a-divider { animation: ntSlideIn .42s cubic-bezier(.22,.61,.36,1) backwards; }
@media (prefers-reduced-motion: reduce) { .nt-a-title, .nt-a-sub, .nt-a-item, .nt-a-divider { animation: none !important; } }
`;

/** 종류 추정 — DB type(event/important/info…)은 중요도라 종류가 안 갈려서 제목·링크로 고른다 */
function kindOf(n: Notification): NotifKind {
  const t = `${n.title} ${n.content}`;
  const link = n.link || '';
  if (/후기|리뷰/.test(n.title) || link.includes('/reviews')) return 'review';
  if (/입금|결제|환불|포인트|적립/.test(n.title) || link.includes('/points') || link.includes('/payments')) return 'payment';
  if (/예약|스케줄|일정/.test(t) || /\/reservations|\/appointments/.test(link)) return 'booking';
  if (n.type === 'event') return 'event';
  return 'notice';
}

/** 'YYYY. M. D.'(ko-KR) → 오늘 · 어제 · M월 D일(올해가 아니면 YY년 M월 D일) */
function dayLabel(date: string): string {
  const m = date.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return date;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((today - new Date(y, mo - 1, d).getTime()) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return y === now.getFullYear() ? `${mo}월 ${d}일` : `${String(y).slice(-2)}년 ${mo}월 ${d}일`;
}

/** 같은 종류·같은 곳·같은 제목은 한 줄로(최신이 머리) */
function groupNotifs(list: Item[], prefix: string): Group[] {
  const map = new Map<string, Group>();
  const out: Group[] = [];
  for (const n of list) {
    const key = `${prefix}${n.kind}|${n.link || ''}|${n.title}`;
    const g = map.get(key);
    if (g) g.items.push(n);
    else {
      const ng: Group = { key, head: n, items: [n], unread: !n.isRead };
      map.set(key, ng);
      out.push(ng);
    }
  }
  return out;
}

export default function NotificationsView({
  variant = 'page',
  onBack,
  onNavigate,
  scrollRootRef,
}: {
  variant?: 'page' | 'drawer';
  /** 없으면 브라우저 뒤로(페이지) */
  onBack?: () => void;
  /** 알림·알림 설정을 눌러 다른 화면으로 갈 때(서랍 닫기) */
  onNavigate?: () => void;
  /** 서랍 안 스크롤 칸 — 위 바 그라데이션 기준 */
  scrollRootRef?: RefObject<HTMLElement | null>;
}) {
  const drawer = variant === 'drawer';
  const router = useRouter();
  const user = useStore((s) => s.user);
  const meHydrated = useStore((s) => s.meHydrated);
  const notifications = useStore((s) => s.notifications);
  const markNotificationRead = useStore((s) => s.markNotificationRead);
  const showToast = useStore((s) => s.showToast);

  const items = useMemo<Item[]>(
    () => notifications.map((n, i) => ({ ...n, kind: kindOf(n), order: i })),
    [notifications],
  );

  const [filter, setFilter] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const current = FILTERS.find((f) => f.k === filter) || FILTERS[0];

  // 위 고정 바 — 스크롤 내리면 아래로 흰 그라데이션
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const root = drawer ? scrollRootRef?.current : null;
    const target: HTMLElement | Window = root || window;
    const onScroll = () => setScrolled((root ? root.scrollTop : window.scrollY) > 4);
    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [drawer, scrollRootRef]);

  const { unreadGroups, readGroups } = useMemo(() => {
    const visible = items
      .filter((n) => !current.kinds || current.kinds.includes(n.kind))
      .sort((a, b) => a.order - b.order);
    return {
      unreadGroups: groupNotifs(visible.filter((n) => !n.isRead), 'u:'),
      readGroups: groupNotifs(visible.filter((n) => n.isRead), 'r:'),
    };
  }, [items, current]);

  // 읽음 저장 — AppInteractions 와 같은 방식: 먼저 읽음 표시 → POST, 실패하면 되돌리고 토스트(여러 건이어도 토스트는 한 번)
  const toastedRef = useRef(false);
  const persistRead = (ids: string[]) => {
    if (!ids.length) return;
    ids.forEach((id) => markNotificationRead(id));
    toastedRef.current = false;
    ids.forEach((id) => {
      void fetch(`/api/notifications/${id}/read`, { method: 'POST' })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok || !data.ok) throw new Error('알림 상태를 저장하지 못했습니다.');
        })
        .catch(() => {
          useStore.setState((state) => ({
            notifications: state.notifications.map((item) => (item.id === id ? { ...item, isRead: false } : item)),
          }));
          if (!toastedRef.current) {
            toastedRef.current = true;
            showToast('알림 상태를 저장하지 못했습니다.');
          }
        });
    });
  };

  const markAllRead = () => {
    setMenuOpen(false);
    persistRead(notifications.filter((n) => !n.isRead).map((n) => n.id));
  };

  const openGroup = (g: Group) => {
    persistRead(g.items.filter((n) => !n.isRead).map((n) => n.id));
    // 링크가 없으면 상세(본문 전체)로 — 줄에선 3줄까지만 보인다
    const href = g.head.link || `/notifications/${g.head.id}`;
    onNavigate?.();
    router.push(href);
  };

  let order = 0;
  const renderGroup = (g: Group) => {
    const n = g.head;
    const count = g.items.length;
    const delay = `${0.3 + Math.min(order++, 12) * 0.06}s`;
    return (
      <div key={g.key} className="relative overflow-hidden" style={{ backgroundColor: g.unread ? UNREAD_BG : '#FFFFFF' }}>
        <button
          type="button"
          onClick={() => openGroup(g)}
          className="nt-a-item flex w-full gap-3 px-5 py-3.5 text-left transition-colors active:bg-black/[0.03]"
          style={{ animationDelay: delay }}
        >
          <span className={`mt-[2px] flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${g.unread ? 'bg-white' : 'bg-[#F2F4F6]'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- public 정적 SVG, 컬러 그대로 */}
            <img src={`/icons/toss/${KIND_ICON[n.kind]}.svg`} alt="" draggable={false} className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold leading-[1.45] text-[#333D4B]">{n.title || '알림'}</span>
            {n.content && (
              <span className={`mt-0.5 line-clamp-3 whitespace-pre-line text-[16px] leading-[1.5] ${g.unread ? 'text-[#4E5968]' : 'text-[#6B7684]'}`}>
                {n.content}
              </span>
            )}
          </span>
          <span className="flex shrink-0 flex-col items-end gap-2 pt-[3px]">
            <span className="text-[13px] leading-none text-[#B0B8C1]">{dayLabel(n.date)}</span>
            {count > 1 && (
              <span className="rounded-[6px] bg-[#E8F3FF] px-1.5 py-[2px] text-[14px] font-semibold leading-[1.3] text-[#3182F6]">{count}건</span>
            )}
          </span>
        </button>
      </div>
    );
  };

  const empty = unreadGroups.length === 0 && readGroups.length === 0;
  // 로그인했는데 아직 /api/me 를 받는 중이면 빈 화면 문구가 번쩍이지 않게 비워 둔다
  const loading = !!user && !meHydrated;
  const showEmpty = !loading && (empty || !user);

  return (
    <div className={drawer ? 'min-h-full bg-white pb-10' : 'min-h-screen bg-white pb-16 lg:mx-auto lg:max-w-[680px] lg:pb-12 lg:pt-6'} style={{ letterSpacing: '-0.02em' }}>
      <style dangerouslySetInnerHTML={{ __html: NT_CSS }} />

      {/* 위 바 — ‹ 뒤로 … 알림 설정 */}
      <header
        className={drawer ? 'sticky top-0 z-30 bg-white' : 'sticky top-0 z-30 bg-white lg:static'}
        style={drawer ? undefined : { paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-[52px] items-center justify-between px-2">
          <button
            type="button"
            onClick={() => (onBack ? onBack() : window.history.length > 1 ? router.back() : router.replace('/'))}
            aria-label={drawer ? '알림 닫기' : '뒤로'}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-[#F2F4F6]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" stroke="#191F28" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* 알림 설정 — 톱니바퀴(토스 mono 아이콘, 뒤로 화살표와 같은 무게로 칠한다) */}
          <Link
            href="/mypage/notifications"
            onClick={() => onNavigate?.()}
            aria-label="알림 설정"
            title="알림 설정"
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-[#F2F4F6]"
          >
            <span
              aria-hidden="true"
              className="block h-6 w-6 bg-[#333D4B]"
              style={{ WebkitMaskImage: 'url(/icons/toss/setting-mono.svg)', maskImage: 'url(/icons/toss/setting-mono.svg)', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }}
            />
          </Link>
        </div>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-white to-white/0 transition-opacity duration-300 ${drawer ? '' : 'lg:hidden'} ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </header>

      {/* 큰 제목 '알림 ⌄' — 종류 거르기 · 모두 읽음 */}
      <div className="relative px-5 pb-3 pt-1">
        <h1 className="nt-a-title">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="flex items-center gap-1.5 rounded-[10px] text-[26px] font-bold tracking-[-0.02em] text-[#191F28] active:opacity-70"
          >
            {current.title}
            <svg
              width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              className="mt-[3px] transition-transform duration-200"
              style={{ transform: menuOpen ? 'rotate(180deg)' : 'none' }}
            >
              <path d="M6 9l6 6 6-6" stroke="#8B95A1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </h1>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            {/* 토스 '알림 ⌄' 메뉴 — 작게 시작해 정비율로 커지고(제목 쪽에서), 항목은 오른쪽→왼쪽으로 촤라락 (globals .pop-menu) */}
            <div className="pop-menu absolute left-2 top-full z-50 w-max min-w-[184px] overflow-hidden py-2" style={{ transformOrigin: '32px 0', borderRadius: 24 }} role="menu">
              {FILTERS.map((f, i) => {
                const on = filter === f.k;
                return (
                  <button
                    key={f.k}
                    type="button"
                    role="menuitemradio"
                    aria-checked={on}
                    onClick={() => { setFilter(f.k); setMenuOpen(false); }}
                    className="pop-menu-item"
                    style={popItemDelay(i)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/icons/toss/${f.icon}.svg`} alt="" />
                    <span className={on ? 'font-semibold text-[#191F28]' : 'text-[#333D4B]'}>{f.label}</span>
                  </button>
                );
              })}
              {user && (
                <>
                  <div className="nt-a-divider mx-5 my-1.5 h-px bg-[#F2F4F6]" style={popItemDelay(FILTERS.length)} />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={markAllRead}
                    className="pop-menu-item"
                    style={popItemDelay(FILTERS.length + 1)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/toss/check-circle.svg" alt="" />
                    <span>모두 읽음</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {loading ? null : showEmpty ? (
        <div className="nt-a-sub flex flex-col items-center px-5 pt-24 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#F2F4F6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/toss/alarm.svg" alt="" className="h-9 w-9" />
          </span>
          <p className="mt-4 text-[17px] font-semibold text-[#333D4B]">
            {!user ? '로그인하면 알림을 볼 수 있어요' : filter === 'all' ? '새로운 알림이 없어요' : `${current.label} 알림이 없어요`}
          </p>
          <p className="mt-1.5 text-[14px] text-[#8B95A1]">새 소식이 오면 여기에서 알려 드릴게요</p>
        </div>
      ) : (
        <>
          {/* 새 알림 — 연한 파랑 바탕 */}
          {unreadGroups.length > 0 && <div className="pt-1">{unreadGroups.map(renderGroup)}</div>}

          {readGroups.length > 0 && (
            <>
              <h2
                className={`nt-a-item px-5 pb-1 text-[17px] font-bold text-[#191F28] ${unreadGroups.length > 0 ? 'pt-8' : 'pt-3'}`}
                style={{ animationDelay: `${0.3 + Math.min(order++, 12) * 0.06}s` }}
              >
                지난 알림
              </h2>
              <div>{readGroups.map(renderGroup)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
