'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import s from './flow.module.css';

/** 클래스 합치기 — 빈 값은 버린다 */
export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

/** 차례 등장 지연(퀵매칭 stag 와 같은 박자) */
export const stag = (i: number): CSSProperties => ({ animationDelay: `${0.3 + i * 0.07}s` });

/** 예약 → 결제 흐름 전체 단계 수(날짜·시간 / 확인 / 결제) */
export const FLOW_TOTAL = 3;

export type FlowProgress = { at: number; from: number; to: number };

/** 머리 — 뒤로 + 진행 막대('N / 전체'). 막대는 앞 단계 길이에서 이번 단계 길이로 늘어난다 */
export function FlowHeader({ onBack, progress, title }: { onBack: () => void; progress?: FlowProgress; title?: string }) {
  return (
    <header className={s.header}>
      <button type="button" onClick={onBack} aria-label="뒤로">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 5.5 8.5 12l6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {title && <span className={s.headerTitle}>{title}</span>}
      {progress && (
        <div
          className={s.progress}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={FLOW_TOTAL}
          aria-valuenow={progress.at}
          aria-label={`전체 ${FLOW_TOTAL}단계 중 ${progress.at}단계`}
        >
          <span className={s.progressTrack}>
            <span
              className={s.progressFill}
              style={{ '--from': `${(progress.from / FLOW_TOTAL) * 100}%`, '--to': `${(progress.to / FLOW_TOTAL) * 100}%` } as CSSProperties}
            />
          </span>
          <span className={s.progressT}><b>{progress.at}</b> / {FLOW_TOTAL}</span>
        </div>
      )}
    </header>
  );
}

/** 아래 큰 버튼 줄(높이 56 · r17 · 17px) */
export function FlowCta({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <div className={s.ctaWrap}>
      <button type="button" className={s.cta} disabled={disabled} onClick={onClick}>{children}</button>
    </div>
  );
}

export function CheckIcon({ size = 16, width = 2.6 }: { size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const noopSubscribe = () => () => {};

/**
 * 시트 열림·닫힘 — 닫힐 때도 스르르(뚝 금지). 바깥·Esc·안드로이드 뒤로가기 = 시트만 닫기(히스토리 한 칸).
 * close(after) — after 는 닫힘 애니메이션(0.24초)이 끝난 뒤 불린다(없으면 onDismiss).
 */
export function useFlowSheet(onDismiss: () => void) {
  const [out, setOut] = useState(false);
  const outRef = useRef(false);
  const popped = useRef(false);
  const pushed = useRef(false);
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; });

  const close = useCallback((after?: () => void) => {
    if (outRef.current) return;
    outRef.current = true;
    setOut(true);
    if (!popped.current && (window.history.state as { flowSheet?: boolean } | null)?.flowSheet) window.history.back();
    window.setTimeout(() => (after ?? dismissRef.current)(), 240);
  }, []);

  useEffect(() => {
    if (!pushed.current) { window.history.pushState({ ...(window.history.state ?? {}), flowSheet: true }, ''); pushed.current = true; }
    const onPop = () => { popped.current = true; close(); };
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
  }, [close]);

  return { out, close };
}

/** 아래에서 올라오는 시트(넓은 화면은 가운데 카드) — 프리티풀 .ft-sheet 어법. 열림·닫힘은 useFlowSheet */
export function FlowSheet({ label, out, onBackdrop, children }: {
  label: string;
  out: boolean;
  onBackdrop: () => void;
  children: ReactNode;
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <div className={cx(s.scrim, out && s.out)} onClick={onBackdrop}>
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className={s.grab} />
        {children}
      </div>
    </div>,
    document.body,
  );
}
