'use client';

// 아래에서 올라오는 시트를 위쪽(손잡이 줄)에서 잡아 아래로 끌어 닫기 — 앱 전체에 한 번만 단다.
//  · 대상: role="dialog" 시트 중 위쪽에 손잡이(class 에 grab/handle)가 보이는 것. 넓은 화면(손잡이 숨김)·가운데 모달은 건드리지 않는다.
//  · 잡는 곳: 손잡이 + 시트 위쪽 56px(제목 줄). 버튼·입력칸은 그대로 눌린다.
//  · 90px 넘게 끌거나 빠르게 튕기면 시트 바깥 막(scrim)을 눌러 닫는다 — 시트마다 이미 있는 '바깥 눌러 닫기'를 그대로 쓴다.
//  · <dialog> 커뮤니티 모달은 자체 손잡이 처리가 있어 제외.
import { useEffect } from 'react';
import { haptic } from '@/lib/haptics';

const GRAB_SELECTOR = '[class*="grab"], [class*="Handle"], [class*="handle"]';
const TOP_ZONE = 56;
const CLOSE_DISTANCE = 90;
const CLOSE_VELOCITY = 0.6; // px/ms

function findGrab(sheet: HTMLElement) {
  const children = Array.from(sheet.children).slice(0, 3) as HTMLElement[];
  for (const child of children) {
    const grab = child.matches(GRAB_SELECTOR) ? child : (child.querySelector(GRAB_SELECTOR) as HTMLElement | null);
    if (!grab) continue;
    const rect = grab.getBoundingClientRect();
    // 손잡이가 숨겨진(넓은 화면) 시트는 끌지 않는다
    if (rect.width > 0 && rect.height > 0 && rect.width <= 80 && getComputedStyle(grab).visibility !== 'hidden') return grab;
  }
  return null;
}

export default function SheetDragClose() {
  useEffect(() => {
    let drag: {
      sheet: HTMLElement;
      startY: number;
      lastY: number;
      lastT: number;
      velocity: number;
      dy: number;
      pointerId: number;
      moved: boolean;
    } | null = null;

    const blockScroll = (e: TouchEvent) => { if (drag?.moved) e.preventDefault(); };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target || target.closest('button, a, input, textarea, select, label, [contenteditable="true"], iframe')) return;
      if (target.closest('dialog')) return;
      const sheet = target.closest('[role="dialog"]') as HTMLElement | null;
      if (!sheet) return;
      const grab = findGrab(sheet);
      if (!grab) return;
      const rect = sheet.getBoundingClientRect();
      const zoneBottom = Math.max(grab.getBoundingClientRect().bottom + 20, rect.top + TOP_ZONE);
      if (e.clientY > zoneBottom) return;
      drag = { sheet, startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, velocity: 0, dy: 0, pointerId: e.pointerId, moved: false };
    };

    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dy = Math.max(0, e.clientY - drag.startY);
      if (!drag.moved && dy < 6) return;
      if (!drag.moved) {
        drag.moved = true;
        drag.sheet.style.transition = 'none';
        drag.sheet.style.willChange = 'transform';
      }
      const dt = Math.max(1, e.timeStamp - drag.lastT);
      drag.velocity = (e.clientY - drag.lastY) / dt;
      drag.lastY = e.clientY;
      drag.lastT = e.timeStamp;
      drag.dy = dy;
      drag.sheet.style.transform = `translateY(${dy}px)`;
    };

    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const { sheet, dy, velocity, moved } = drag;
      drag = null;
      if (!moved) return;
      const shouldClose = dy > CLOSE_DISTANCE || (dy > 30 && velocity > CLOSE_VELOCITY);
      sheet.style.willChange = '';
      if (shouldClose) {
        haptic('light');
        sheet.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)';
        sheet.style.transform = 'translateY(110%)';
        // 시트 바깥 막을 눌러 닫는다(막이 없거나 닫히지 않으면 제자리로)
        const scrim = sheet.parentElement;
        window.setTimeout(() => {
          scrim?.click();
          window.setTimeout(() => {
            if (sheet.isConnected) {
              sheet.style.transform = '';
              sheet.style.transition = '';
            }
          }, 450);
        }, 120);
        // 끌고 놓은 그 손가락이 막 '클릭'으로 다시 들어가지 않게
        return;
      }
      sheet.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)';
      sheet.style.transform = '';
      window.setTimeout(() => { if (sheet.isConnected) sheet.style.transition = ''; }, 260);
    };

    // 끈 뒤에 생기는 click 이 시트 안 무언가를 누르지 않게
    let suppressClick = false;
    const onUpCapture = () => { suppressClick = Boolean(drag?.moved); };
    const onClickCapture = (e: MouseEvent) => {
      if (suppressClick && e.isTrusted) { e.stopPropagation(); e.preventDefault(); }
      suppressClick = false;
    };

    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUpCapture, true);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('touchmove', blockScroll, { passive: false });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUpCapture, true);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('touchmove', blockScroll);
    };
  }, []);

  return null;
}
