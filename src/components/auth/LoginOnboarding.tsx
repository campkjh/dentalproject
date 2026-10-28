'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';
import { startNativeKakaoLogin } from './kakao-login';
import styles from './onboarding.module.css';

/* ─────────────────────────────────────────────────────────────
 * 로그인 진입 = 전체 화면 온보딩(토스 계열 앱 온보딩 견본).
 *  · 위쪽 대부분 = 큰 일러스트(이미지 안에 글자 없음, 아래 40% 는 흰색으로 빠짐 → 글은 그 흰 자리에),
 *    아래 = 제목 2줄(검정/파랑) + 회색 설명 2줄 + 페이지 점 + 알약 버튼 2개(회원가입/로그인).
 *  · 장은 좌우로 밀어 넘기고 4초마다 자동으로도 넘어간다(동작 줄이기 설정이면 자동 넘김 끔).
 *  · 로그인 = 아래에서 올라오는 시트(카카오/이메일), 회원가입 = /login 의 가입 모드.
 *  · PC(1024↑) = 화면 가운데 폰 비율 카드.
 *  · 닫힘 조건(경로 바뀜·로그인됨)은 AppInteractions 가 그대로 쥔다 — 여기는 그리기와 닫기 애니메이션만.
 * ──────────────────────────────────────────────────────────── */

const SLIDES = [
  {
    src: '/onboarding/01_stethoscope.jpg',
    title: ['믿을 수 있는 병원을', '한눈에 찾아요'],
    desc: ['병원 정보와 의료진을 꼼꼼히 확인하고', '나에게 맞는 곳을 골라 보세요.'],
  },
  {
    src: '/onboarding/02_star_rating.jpg',
    title: ['진짜 후기로', '똑똑하게 고르세요'],
    desc: ['시술받은 분들의 솔직한 후기와', '별점을 한곳에 모아 보여드려요.'],
  },
  {
    src: '/onboarding/03_payment.jpg',
    title: ['예약부터 결제까지', '앱에서 간편하게'],
    desc: ['쿠폰 할인은 바로 적용하고', '카드·계좌이체로 간편하게 결제해요.'],
  },
] as const;

const AUTO_MS = 4000;
const LEAVE_MS = 260;
const SWIPE_PX = 48;

const noopSubscribe = () => () => {};

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

/** 지금 경로(+쿼리) — 로그인 뒤 여기로 돌아온다 */
function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

export default function LoginOnboarding({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { signInWithOAuth } = useSession();
  const showToast = useStore((s) => s.showToast);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const reduced = usePrefersReducedMotion();

  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [sheet, setSheet] = useState<'closed' | 'open' | 'leaving'>('closed');
  const [kakaoPending, setKakaoPending] = useState(false);

  const cardRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number; t: number; axis: 'x' | 'y' | null } | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  const close = useCallback(() => {
    if (closeTimer.current) return;
    setLeaving(true);
    closeTimer.current = setTimeout(() => closeRef.current(), reduced ? 0 : LEAVE_MS);
  }, [reduced]);

  const closeSheet = useCallback(() => {
    if (sheetTimer.current) return;
    setSheet('leaving');
    sheetTimer.current = setTimeout(() => { sheetTimer.current = null; setSheet('closed'); }, reduced ? 0 : 220);
  }, [reduced]);

  // body 스크롤 잠금 + 열릴 때 카드에 초점, 닫히면 원래 자리로 초점을 돌려준다
  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    cardRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [mounted]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (sheetTimer.current) clearTimeout(sheetTimer.current);
  }, []);

  // Esc = 시트가 떠 있으면 시트만, 아니면 온보딩 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (sheet === 'open') closeSheet();
      else close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, close, closeSheet]);

  // 자동 넘김 — 미는 중·시트 열림·닫히는 중·동작 줄이기면 멈춤. index 가 바뀔 때마다 4초를 새로 잰다
  useEffect(() => {
    if (reduced || drag !== null || sheet !== 'closed' || leaving) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), AUTO_MS);
    return () => window.clearTimeout(id);
  }, [index, reduced, drag, sheet, leaving]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), axis: null };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      p.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (p.axis === 'x') e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (p.axis !== 'x') return;
    // 처음·마지막 장 바깥으로는 고무줄처럼 덜 끌린다
    const edge = (index === 0 && dx > 0) || (index === SLIDES.length - 1 && dx < 0);
    setDrag(edge ? dx / 3 : dx);
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    pointer.current = null;
    if (p.axis === 'x') {
      const dx = e.clientX - p.x;
      const fast = Math.abs(dx) / Math.max(1, performance.now() - p.t) > 0.45;
      if (dx <= -SWIPE_PX || (fast && dx < -16)) setIndex((i) => Math.min(SLIDES.length - 1, i + 1));
      else if (dx >= SWIPE_PX || (fast && dx > 16)) setIndex((i) => Math.max(0, i - 1));
    }
    setDrag(null);
  };

  const goSignup = () => {
    router.push(`/login?mode=signup&next=${encodeURIComponent(currentPath())}`);
  };
  const goEmailLogin = () => {
    router.push(`/login?next=${encodeURIComponent(currentPath())}`);
  };
  const startKakao = () => {
    if (kakaoPending) return;
    setKakaoPending(true);
    const native = startNativeKakaoLogin((message) => {
      showToast(message);
      setKakaoPending(false);
    });
    if (native) return;
    // OAuth 인증 페이지로 넘어간다 — 실패했을 때만 상태 복구
    void signInWithOAuth('kakao').catch(() => {
      showToast('로그인을 시작하지 못했습니다.');
      setKakaoPending(false);
    });
  };

  if (!mounted) return null;

  const trackStyle = {
    transform: `translate3d(calc(${-index * 100}% + ${drag ?? 0}px), 0, 0)`,
    transition: drag !== null || reduced ? 'none' : undefined,
  };

  return createPortal(
    <div
      className={styles.root}
      data-leaving={leaving || undefined}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <section
        ref={cardRef}
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-label="마이닥 시작하기"
        tabIndex={-1}
      >
        <div
          className={styles.stage}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          aria-roledescription="carousel"
        >
          <div className={styles.track} style={trackStyle}>
            {SLIDES.map((slide, i) => (
              <div
                key={slide.src}
                className={styles.slide}
                role="group"
                aria-roledescription="slide"
                aria-label={`${SLIDES.length}장 중 ${i + 1}번째`}
                aria-hidden={i !== index}
              >
                <img src={slide.src} alt="" className={styles.art} draggable={false} decoding="async" />
                <div className={styles.copy} data-active={i === index || undefined}>
                  <h2 className={styles.title}>
                    <span>{slide.title[0]}</span>
                    <span className={styles.titleBlue}>{slide.title[1]}</span>
                  </h2>
                  <p className={styles.desc}>
                    <span>{slide.desc[0]}</span>
                    <span>{slide.desc[1]}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="button" className={styles.close} aria-label="닫기" onClick={close}>
          <X size={26} strokeWidth={2} />
        </button>

        <div className={styles.dots} role="tablist" aria-label="소개 넘기기">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1}번째 소개 보기`}
              className={styles.dot}
              data-active={i === index || undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={goSignup}>회원가입</button>
          <button type="button" className={styles.secondary} onClick={() => setSheet('open')}>로그인</button>
        </div>

        {sheet !== 'closed' && (
          <div
            className={styles.sheetBackdrop}
            data-leaving={sheet === 'leaving' || undefined}
            onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}
          >
            <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="로그인 방법 고르기">
              <span className={styles.sheetHandle} aria-hidden="true" />
              <h3 className={styles.sheetTitle}>어떻게 로그인할까요?</h3>
              <p className={styles.sheetSub}>로그인하면 예약 내역과 후기를 이어서 볼 수 있어요.</p>
              <button type="button" className={styles.kakao} onClick={startKakao} disabled={kakaoPending}>
                <KakaoIcon />
                {kakaoPending ? '카카오로 이동 중…' : '카카오로 시작하기'}
              </button>
              <button type="button" className={styles.email} onClick={goEmailLogin}>이메일로 로그인</button>
              <button type="button" className={styles.sheetCancel} onClick={closeSheet}>닫기</button>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 256 256" aria-hidden="true">
      <path
        fill="#191600"
        d="M128 36C70.562 36 24 72.713 24 118c0 29.279 19.466 54.97 48.748 69.477-1.593 5.494-10.237 35.34-10.583 37.685 0 0-.207 1.762.934 2.434s2.483.15 2.483.15c3.272-.457 37.876-24.755 43.863-28.964 6.064.856 12.297 1.302 18.652 1.302 57.438 0 104-36.713 104-82S185.438 36 128 36z"
      />
    </svg>
  );
}
