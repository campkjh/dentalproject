'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';

/* ─────────────────────────────────────────────────────────────
 * 목록 줄 끌어서 순서 바꾸기(261101, 어드민 카테고리 노출 순서).
 *  · 손잡이를 누르고 끌면 그 줄이 손가락을 따라오고, 지나치는 줄들이 스르르 비켜 준다.
 *  · 놓으면 그 자리로 미끄러져 들어간 뒤 onCommit(새 순서) — 저장은 부르는 쪽이 한다.
 *  · 줄 움직임은 CSS `translate` 속성으로 준다(.adm-grow 등장 애니메이션이 transform 을 쥐고 있어서 transform 을 쓰면 안 먹는다).
 *  · 한 번 만지면 줄 등장 애니메이션을 끈다 — 순서가 바뀌어 DOM 에서 옮겨진 줄은 애니메이션이 처음부터 다시 돌아 깜빡인다.
 *  · 본문 칸(.adm-main) 위·아래 끝에 가까이 끌면 저절로 스크롤된다. 키보드는 손잡이에서 ↑·↓ 로 한 칸씩.
 * ──────────────────────────────────────────────────────────── */

type DragState = { id: string; from: number; over: number; dy: number; h: number; dropping: boolean };

type Session = {
  startY: number;
  lastY: number;
  /** 지금 놓으면 들어갈 자리(놓을 때 상태 대신 이걸 읽는다 — 상태 갱신 함수 안에서 타이머를 걸면 개발 모드에서 두 번 돈다) */
  over: number;
  startScroll: number;
  scroller: HTMLElement | null;
  tops: number[];
  heights: number[];
  raf: number;
  cleanup: () => void;
};

const DROP_MS = 200;
const EDGE = 64;

export function useDragSort<T extends { id: string }>(items: T[], onCommit: (next: T[]) => void) {
  const rowsRef = useRef(new Map<string, HTMLElement>());
  const sessionRef = useRef<Session | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [settling, setSettling] = useState(false);
  const [touched, setTouched] = useState(false);

  // 화면을 떠나면 끌기 정리
  useEffect(() => () => sessionRef.current?.cleanup(), []);

  const rowRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) rowsRef.current.set(id, el);
      else rowsRef.current.delete(id);
    },
    []
  );

  const commit = useCallback(
    (from: number, over: number) => {
      const next = items.slice();
      const [moved] = next.splice(from, 1);
      next.splice(over, 0, moved);
      // 줄 순서가 바뀌는 그 순간엔 움직임을 끄고(제자리로 미끄러지는 헛움직임 방지) 다음 틀에서 되돌린다
      setSettling(true);
      setDrag(null);
      onCommit(next);
      requestAnimationFrame(() => requestAnimationFrame(() => setSettling(false)));
    },
    [items, onCommit]
  );

  const onPointerDown = useCallback(
    (index: number) => (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || sessionRef.current || items.length < 2) return;
      e.preventDefault();
      setTouched(true);
      const tops: number[] = [];
      const heights: number[] = [];
      for (const it of items) {
        const r = rowsRef.current.get(it.id)?.getBoundingClientRect();
        tops.push(r?.top ?? 0);
        heights.push(r?.height ?? 0);
      }
      const rowEl = rowsRef.current.get(items[index].id);
      const scroller = (rowEl?.closest('.adm-main') as HTMLElement | null) ?? null;
      const from = index;
      const h = heights[from];
      const last = items.length - 1;
      const minDy = tops[0] - tops[from];
      const maxDy = tops[last] + heights[last] - (tops[from] + h);

      const update = () => {
        const s = sessionRef.current;
        if (!s) return;
        const scrollDelta = (s.scroller?.scrollTop ?? 0) - s.startScroll;
        const dy = Math.max(minDy, Math.min(maxDy, s.lastY - s.startY + scrollDelta));
        const center = tops[from] + h / 2 + dy;
        let over = from;
        for (let i = from - 1; i >= 0; i--) if (center < tops[i] + heights[i] / 2) over = i;
        for (let i = from + 1; i <= last; i++) if (center > tops[i] + heights[i] / 2) over = i;
        s.over = over;
        setDrag({ id: items[from].id, from, over, dy, h, dropping: false });
      };

      // 끝에 가까이 끌면 본문 칸 저절로 스크롤(가까울수록 빠르게)
      const tick = () => {
        const s = sessionRef.current;
        if (!s) return;
        if (s.scroller) {
          const box = s.scroller.getBoundingClientRect();
          let step = 0;
          if (s.lastY < box.top + EDGE) step = -Math.ceil(((box.top + EDGE - s.lastY) / EDGE) * 14);
          else if (s.lastY > box.bottom - EDGE) step = Math.ceil(((s.lastY - (box.bottom - EDGE)) / EDGE) * 14);
          if (step) {
            const before = s.scroller.scrollTop;
            s.scroller.scrollTop = before + step;
            if (s.scroller.scrollTop !== before) update();
          }
        }
        s.raf = requestAnimationFrame(tick);
      };

      const onMove = (ev: globalThis.PointerEvent) => {
        const s = sessionRef.current;
        if (!s) return;
        s.lastY = ev.clientY;
        update();
      };

      const end = () => {
        const s = sessionRef.current;
        if (!s) return;
        const over = s.over;
        s.cleanup();
        // 들어갈 자리까지 미끄러뜨린 뒤 순서를 확정한다
        const target = over > from ? tops[over] + heights[over] - (tops[from] + h) : over < from ? tops[over] - tops[from] : 0;
        setDrag({ id: items[from].id, from, over, dy: target, h, dropping: true });
        window.setTimeout(() => {
          if (over === from) setDrag(null);
          else commit(from, over);
        }, DROP_MS);
      };

      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);

      sessionRef.current = {
        startY: e.clientY,
        lastY: e.clientY,
        over: from,
        startScroll: scroller?.scrollTop ?? 0,
        scroller,
        tops,
        heights,
        raf: 0,
        cleanup: () => {
          const s = sessionRef.current;
          if (s) cancelAnimationFrame(s.raf);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', end);
          window.removeEventListener('pointercancel', end);
          document.body.style.cursor = prevCursor;
          document.body.style.userSelect = prevSelect;
          sessionRef.current = null;
        },
      };
      sessionRef.current.raf = requestAnimationFrame(tick);
      setDrag({ id: items[from].id, from, over: from, dy: 0, h, dropping: false });
    },
    [items, commit]
  );

  const onKeyDown = useCallback(
    (index: number) => (e: KeyboardEvent<HTMLElement>) => {
      if (drag) return;
      const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : -1;
      if (to < 0 || to >= items.length) return;
      e.preventDefault();
      setTouched(true);
      commit(index, to);
    },
    [drag, items.length, commit]
  );

  const handleProps = (index: number) => ({
    onPointerDown: onPointerDown(index),
    onKeyDown: onKeyDown(index),
    'aria-roledescription': '순서 바꾸기 손잡이',
  });

  const rowStyle = (id: string, index: number): CSSProperties | undefined => {
    const base: CSSProperties | undefined = touched ? { animation: 'none' } : undefined;
    if (settling) return { ...base, transition: 'none' };
    if (!drag) return base;
    if (id === drag.id) {
      return {
        ...base,
        translate: `0 ${drag.dy}px`,
        position: 'relative',
        zIndex: 3,
        transition: drag.dropping ? `translate ${DROP_MS}ms var(--adm-ease), box-shadow .2s ease, scale .2s ease` : 'box-shadow .2s ease, scale .2s ease',
      };
    }
    let shift = 0;
    if (drag.from < drag.over && index > drag.from && index <= drag.over) shift = -drag.h;
    else if (drag.over < drag.from && index >= drag.over && index < drag.from) shift = drag.h;
    return { ...base, translate: `0 ${shift}px`, transition: 'translate .22s var(--adm-ease)' };
  };

  const rowClass = (id: string) => (drag?.id === id ? (drag.dropping ? 'adm-sort-row dropping' : 'adm-sort-row lifted') : 'adm-sort-row');

  return { rowRef, handleProps, rowStyle, rowClass, dragging: !!drag };
}
