'use client';

/* ─────────────────────────────────────────────────────────────
 * 주소 검색 시트(261102) — 다음 우편번호 검색을 우리 시트 안에 끼워 넣는다(embed).
 *  · 예전엔 .open() 새 창이라 앱 웹뷰에서 흰 화면만 떴다 → 같은 페이지 안 iframe 이라 앱·웹 모두 된다.
 *  · 겉(딤·아래서 올라오는 시트·머리·닫기)은 마이 시트(.ft-sheet) 톤, 안쪽 검색 화면은 theme 로 앱 색을 입혔다.
 *  · 뒤로가기(안드 뒤로 버튼 포함) = 닫기. 주소를 고르면 onSelect 후 내려간다.
 *  · 부르는 쪽은 열 때만 그린다: {open && <AddressSearchSheet … onClose={() => setOpen(false)} />}
 * ──────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { haptic } from '@/lib/haptics';
import { loadDaumPostcode, type DaumPostcodeData, type DaumPostcodeTheme } from '@/lib/daum-postcode';
import s from './address-search.module.css';

// 검색 화면 색 — 흰 바탕 · 회색 검색칸 · 파랑 강조(우편번호·검색어 일치)
const THEME: DaumPostcodeTheme = {
  bgColor: '#FFFFFF',
  searchBgColor: '#F2F4F6',
  contentBgColor: '#FFFFFF',
  pageBgColor: '#F9FAFB',
  textColor: '#333D4B',
  queryTextColor: '#191F28',
  postcodeTextColor: '#2F6FE4',
  emphTextColor: '#2F6FE4',
  outlineColor: '#F2F4F6',
};

const LEAVE_MS = 240;

// Navigation API(크롬·안드 웹뷰·최신 사파리) — 열기 전 기록 칸으로 곧장 건너뛸 때만 쓴다
type NavWindow = Window & {
  navigation?: { currentEntry?: { key: string } | null; traverseTo: (key: string) => { finished: Promise<unknown> } };
};

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function AddressSearchSheet({
  onSelect,
  onClose,
  initialQuery,
}: {
  onSelect: (data: DaumPostcodeData) => void;
  onClose: () => void;
  /** 열자마자 이 말로 찾아 둔다(이미 넣은 주소 다시 고를 때) */
  initialQuery?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const leavingRef = useRef(false);
  const backKey = useRef<string | null>(null);
  const selectRef = useRef(onSelect);
  const closeRef = useRef(onClose);
  useEffect(() => {
    selectRef.current = onSelect;
    closeRef.current = onClose;
  }, [onSelect, onClose]);

  // 내려가는 움직임 뒤에 닫는다. 뒤로가기로 닫힌 게 아니면 열 때 쌓은 기록도 걷는다 —
  // 다음 iframe 안 검색도 기록을 쌓아서 history.back() 한 번은 그 검색만 되돌린다(시트가 안 닫히던 원인).
  // 그래서 iframe 을 먼저 떼고, 되면 열기 전 칸으로 곧장 건너뛴다(안 되면 한 칸만 — 빈 뒤로 한 번이 남을 수 있다)
  const close = (viaHistory = false) => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    window.setTimeout(() => {
      if (!viaHistory) {
        boxRef.current?.replaceChildren();
        if (window.history.state?.mdAddressSearch) {
          const nav = (window as NavWindow).navigation;
          if (nav && backKey.current) nav.traverseTo(backKey.current).finished.catch(() => undefined);
          else window.history.back();
        }
      }
      closeRef.current();
    }, LEAVE_MS);
  };
  const goBack = () => close();

  // 뒤로 = 닫기 · 뒤 화면 스크롤 잠금 · Esc
  useEffect(() => {
    // 개발 모드에선 효과가 두 번 돌아도 기록은 한 칸만
    if (!window.history.state?.mdAddressSearch) {
      backKey.current = (window as NavWindow).navigation?.currentEntry?.key ?? null;
      window.history.pushState({ mdAddressSearch: true }, '');
    }
    const onPop = () => close(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  // 다음 검색 화면 끼워 넣기(다시 시도하면 새로)
  useEffect(() => {
    let alive = true;
    loadDaumPostcode()
      .then(() => {
        const box = boxRef.current;
        if (!alive || !box || !window.daum) return;
        box.replaceChildren();
        new window.daum.Postcode({
          width: '100%',
          height: '100%',
          theme: THEME,
          animation: true,
          focusInput: true,
          hideMapBtn: true,
          hideEngBtn: true,
          useBannerLink: false,
          maxSuggestItems: 8,
          oncomplete: (data) => {
            if (!alive) return;
            haptic('light');
            selectRef.current(data);
            goBack();
          },
        }).embed(box, { q: initialQuery?.trim() || undefined, autoClose: false });
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`${s.scrim}${leaving ? ` ${s.leaving}` : ''}`} onClick={goBack}>
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label="주소 검색" onClick={(e) => e.stopPropagation()}>
        <div className={s.grab} aria-hidden="true" />
        <div className={s.head}>
          <h2 className={s.title}>주소 검색</h2>
          <button type="button" className={s.close} onClick={goBack} aria-label="닫기">
            <CloseIcon />
          </button>
        </div>
        <p className={s.sub}>도로명, 건물명, 지번으로 찾을 수 있어요</p>

        <div className={s.frame}>
          {/* 검색 화면이 뜨기 전 자리 — iframe 이 그려지면 위에 덮인다 */}
          <div className={s.skeleton} aria-hidden="true">
            <span className={s.skSearch} />
            <span className={s.skLine} style={{ width: '62%' }} />
            <span className={s.skLine} style={{ width: '84%' }} />
            <span className={s.skLine} style={{ width: '48%' }} />
          </div>
          {failed ? (
            <div className={s.error} role="alert">
              <p className={s.errorTitle}>주소 검색을 불러오지 못했어요</p>
              <p className={s.errorDesc}>인터넷 연결을 확인하고 다시 시도해 주세요.</p>
              <button type="button" className={s.retry} onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>
                다시 시도
              </button>
            </div>
          ) : (
            <div ref={boxRef} className={s.embed} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
