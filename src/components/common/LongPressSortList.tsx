'use client';

// 꾹 눌러서 끌어 순서 바꾸기 — 세로 목록용(병원 대문사진·상품 이미지 등).
//  · 350ms 꾹 누르면 들어 올림(진동) → 위아래로 끌면 다른 칸이 비켜 준다 → 놓으면 onReorder.
//  · 꾹 누르기 전에 움직이면 그냥 스크롤(목록 스크롤을 막지 않는다). 들어 올린 동안만 스크롤을 막는다.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { haptic } from '@/lib/haptics';

const HOLD_MS = 350;
const MOVE_TOLERANCE = 8;

type Drag = { from: number; to: number; dy: number; rects: DOMRect[] };

export default function LongPressSortList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
  gap = 10,
  disabled = false,
}: {
  items: T[];
  getKey: (item: T, index: number) => string;
  onReorder: (next: T[]) => void;
  renderItem: (item: T, index: number, state: { dragging: boolean }) => ReactNode;
  gap?: number;
  disabled?: boolean;
}) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const press = useRef<{ index: number; x: number; y: number; timer: number; pointerId: number } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  // 포인터 처리기에서 최신 drag 를 읽는다(바꿀 때 상태와 같이 넣는다)
  const dragRef = useRef<Drag | null>(null);
  const updateDrag = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  // 들어 올린 동안만 화면 스크롤을 막는다(iOS 는 passive:false 로 막아야 한다)
  useEffect(() => {
    if (!drag) return;
    const block = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', block, { passive: false });
    return () => document.removeEventListener('touchmove', block);
  }, [drag]);

  const clearPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const targetIndex = (from: number, dy: number, rects: DOMRect[]) => {
    const center = rects[from].top + rects[from].height / 2 + dy;
    let to = from;
    rects.forEach((r, i) => {
      const mid = r.top + r.height / 2;
      if (i < from && center < mid) to = Math.min(to, i);
      if (i > from && center > mid) to = Math.max(to, i);
    });
    return to;
  };

  const onPointerDown = (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || items.length < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // 칸 안의 버튼(삭제 등)을 누를 때는 끌지 않는다
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    clearPress();
    const pointerId = e.pointerId;
    const el = e.currentTarget;
    press.current = {
      index,
      x: e.clientX,
      y: e.clientY,
      pointerId,
      timer: window.setTimeout(() => {
        const rects = itemRefs.current.slice(0, items.length).map((node) => node?.getBoundingClientRect() ?? new DOMRect());
        try { el.setPointerCapture(pointerId); } catch {}
        haptic('medium');
        updateDrag({ from: index, to: index, dy: 0, rects });
      }, HOLD_MS),
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p) return;
    const current = dragRef.current;
    if (!current) {
      if (Math.abs(e.clientX - p.x) > MOVE_TOLERANCE || Math.abs(e.clientY - p.y) > MOVE_TOLERANCE) clearPress();
      return;
    }
    const dy = e.clientY - p.y;
    const to = targetIndex(current.from, dy, current.rects);
    if (to !== current.to) haptic('selection');
    updateDrag({ ...current, dy, to });
  };

  const finish = () => {
    const current = dragRef.current;
    clearPress();
    updateDrag(null);
    if (!current || current.to === current.from) return;
    const next = [...items];
    const [moved] = next.splice(current.from, 1);
    next.splice(current.to, 0, moved);
    haptic('light');
    onReorder(next);
  };

  const shiftOf = (i: number) => {
    if (!drag || i === drag.from) return 0;
    const h = drag.rects[drag.from].height + gap;
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -h;
    if (drag.from > drag.to && i < drag.from && i >= drag.to) return h;
    return 0;
  };

  return (
    <div className="flex flex-col" style={{ gap }}>
      {items.map((item, i) => {
        const dragging = drag?.from === i;
        return (
          <div
            key={getKey(item, i)}
            ref={(node) => { itemRefs.current[i] = node; }}
            onPointerDown={onPointerDown(i)}
            onPointerMove={onPointerMove}
            onPointerUp={finish}
            onPointerCancel={finish}
            onContextMenu={(e) => e.preventDefault()}
            className="relative select-none"
            style={{
              WebkitTouchCallout: 'none',
              transform: `translateY(${dragging ? drag.dy : shiftOf(i)}px) scale(${dragging ? 1.02 : 1})`,
              transition: dragging ? 'none' : 'transform .2s cubic-bezier(.2,.8,.2,1)',
              zIndex: dragging ? 5 : undefined,
              boxShadow: dragging ? '0 12px 28px rgba(0,0,0,.18)' : undefined,
              borderRadius: 16,
            }}
          >
            {renderItem(item, i, { dragging })}
          </div>
        );
      })}
    </div>
  );
}
