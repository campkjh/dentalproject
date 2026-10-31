'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import MonoIcon from '@/components/common/MonoIcon';

/* ════════════════════════════════════════════════════════════════
 * 밀어서 버튼 꺼내는 줄 — 프리티풀 채팅 목록(ChatSwipeRow, 당근 어법) 동작을 그대로 옮겼다(261101 사장 지시: 포켓).
 *  · 오른쪽→왼쪽으로 밀면 줄이 손가락을 1:1 로 따라가고, 오른쪽 아래에 깔린 버튼 칸이 드러난다.
 *  · 버튼 자리는 고정. **줄이 그 자리를 완전히 지나간 뒤에야** 작게 나타나 스프링으로 커지고 살짝 넘쳤다 자리 잡는다
 *    (끝 버튼 → 안쪽 버튼 순서). 그리는 크기는 늘 '지금 드러난 공간'을 넘지 않는다 → 되돌릴 때 같이 작아진다.
 *  · 손을 떼면 속도를 이어받아 스프링으로 멈춘다 — 다 연 폭의 42% 를 넘겼거나 휙 튕기면(450px/s) 그 방향으로.
 *    끝을 넘겨 밀면 고무줄처럼 덜 따라온다.
 *  · 움직이는 동안 React 를 다시 그리지 않고 requestAnimationFrame 에서 transform 만 바꾼다.
 *  · 세로 스크롤은 브라우저에(touch-action: pan-y) — 가로로 먼저 8px 움직일 때만 민다. 마우스로 끌어도 된다.
 *  · 열린 줄을 누르면 이동 대신 닫힌다. 다른 곳을 누르거나 스크롤해도 닫힌다(다른 밀기 줄을 누른 탭은 닫기로만 쓴다).
 *  · 한 번에 한 줄만 — 열림 상태는 부모가 쥔다(open / onOpenChange).
 * ════════════════════════════════════════════════════════════════ */

export type SwipeRowAction = {
  key: string;
  label: string;
  /** 토스 mono 아이콘 이름(public/icons/mono) */
  icon?: string;
  bg: string;
  color: string;
  onClick: () => void;
};

// 버튼 칸 — 폭 76 · 사이 8 · 바깥 여백(오른쪽은 화면 여백 16 에 맞춘다)
const BTN = 76;
const GAP = 8;
const PAD_L = 8;
const PAD_R = 16;

// 스프링 — 버튼: 약 0.25초에 제 크기, 끝에서 5% 남짓 넘쳤다 자리(ζ≈0.61) / 줄: 거의 안 넘치고 멈춤 (프리티풀 값 그대로)
const BTN_K = 420;
const BTN_C = 25;
const ROW_K = 380;
const ROW_C = 36;
const FLICK = 450; // px/s — 이보다 빠르게 튕기면 그 방향으로 열고 닫는다
const OPEN_RATIO = 0.42;

export default function SwipeActionRow({
  open,
  onOpenChange,
  actions,
  disabled,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: SwipeRowAction[];
  disabled?: boolean;
  children: ReactNode;
}) {
  const width = PAD_L + actions.length * BTN + (actions.length - 1) * GAP + PAD_R;
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sim = useRef({
    x: 0, // 드러난 폭
    vx: 0,
    target: 0,
    dragging: false,
    btn: actions.map(() => ({ s: 0, v: 0 })),
    raf: 0,
    last: 0,
  });
  const drag = useRef<{ x0: number; y0: number; base: number; dir: 'h' | 'v' | null; samples: { t: number; x: number }[] } | null>(null);
  const moved = useRef(false);
  const openRef = useRef(open);
  const changeRef = useRef(onOpenChange);

  // 버튼 중심이 오른쪽 끝에서 얼마나 떨어져 있나(고정) · 제 자리가 다 드러나는 밀린 폭
  const centerFromRight = (fromRight: number) => PAD_R + fromRight * (BTN + GAP) + BTN / 2;
  const fullFitAt = (fromRight: number) => centerFromRight(fromRight) + BTN / 2;

  const paint = () => {
    const s = sim.current;
    if (contentRef.current) contentRef.current.style.transform = `translate3d(${-s.x}px,0,0)`;
    const opened = s.x >= width - 1;
    const n = s.btn.length;
    s.btn.forEach((b, i) => {
      const el = btnRefs.current[i];
      if (!el) return;
      // 드러난 공간에 온전히 들어가는 최대 크기 — 줄 가장자리가 버튼 중심에서 이만큼 떨어져 있다
      const room = (s.x - centerFromRight(n - 1 - i)) / (BTN / 2);
      const sc = Math.max(0, Math.min(b.s, room));
      el.style.transform = `scale(${sc.toFixed(4)})`;
      el.style.opacity = String(Math.min(1, sc * 4));
      el.style.visibility = sc < 0.01 ? 'hidden' : 'visible';
      el.tabIndex = opened ? 0 : -1;
    });
  };

  const step = (now: number) => {
    const s = sim.current;
    const dt = s.last ? Math.min(0.032, (now - s.last) / 1000) : 1 / 60;
    s.last = now;
    let busy = s.dragging;
    if (!s.dragging) {
      const a = -ROW_K * (s.x - s.target) - ROW_C * s.vx;
      s.vx += a * dt;
      s.x += s.vx * dt;
      // 닫힐 땐 0 에서 딱 멈춘다(오른쪽으로 넘어가 왼쪽 틈이 보이지 않게)
      if (s.target === 0 && s.x < 0) {
        s.x = 0;
        s.vx = 0;
      }
      if (Math.abs(s.x - s.target) < 0.3 && Math.abs(s.vx) < 6) {
        s.x = s.target;
        s.vx = 0;
      } else busy = true;
    }
    const n = s.btn.length;
    s.btn.forEach((b, i) => {
      // 제 자리가 다 드러났을 때만 커지고, 줄이 다시 덮기 시작하면 작아진다
      const goal = s.x >= fullFitAt(n - 1 - i) ? 1 : 0;
      const a = -BTN_K * (b.s - goal) - BTN_C * b.v;
      b.v += a * dt;
      b.s += b.v * dt;
      if (Math.abs(b.s - goal) < 0.002 && Math.abs(b.v) < 0.02) {
        b.s = goal;
        b.v = 0;
      } else busy = true;
    });
    paint();
    if (busy) s.raf = requestAnimationFrame(step);
    else {
      s.raf = 0;
      s.last = 0;
    }
  };

  const kick = () => {
    const s = sim.current;
    if (!s.raf) {
      s.last = 0;
      s.raf = requestAnimationFrame(step);
    }
  };

  const closeNow = () => {
    sim.current.target = 0;
    kick();
    if (openRef.current) changeRef.current(false);
  };

  useEffect(() => {
    changeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    const s = sim.current;
    return () => cancelAnimationFrame(s.raf);
  }, []);

  // 부모가 열고 닫으면(다른 줄을 열었다 · 끄기) 따라간다
  useEffect(() => {
    openRef.current = open;
    const s = sim.current;
    if (s.dragging) return;
    s.target = open ? width : 0;
    kick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, width]);

  // 밀기를 막으면(고르는 중 · 빼는 중) 열린 줄도 닫는다
  useEffect(() => {
    if (disabled && openRef.current) closeNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  // 열린 동안 — 다른 곳을 누르거나 스크롤하면 닫는다
  useEffect(() => {
    if (!open) return;
    let swallowTimer = 0;
    const swallow = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      stopSwallow();
    };
    const stopSwallow = () => {
      document.removeEventListener('click', swallow, true);
      window.clearTimeout(swallowTimer);
    };
    const onDown = (e: PointerEvent) => {
      const root = rootRef.current;
      const t = e.target;
      if (!root || (t instanceof Node && root.contains(t))) return;
      closeNow();
      // 다른 밀기 줄을 누른 탭은 '닫기'로만 쓴다 — 상세로 넘어가거나 체크가 바뀌지 않게
      if (t instanceof Element && t.closest('[data-swipe-row]')) {
        stopSwallow();
        document.addEventListener('click', swallow, true);
        swallowTimer = window.setTimeout(stopSwallow, 700);
      }
    };
    const onScroll = () => closeNow();
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onScroll, { passive: true, once: true });
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onScroll);
      // 닫기 탭 삼키기는 다음 클릭까지 살아 있어야 한다 — 시간이 지나면 저절로 풀린다
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    moved.current = false;
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag.current = { x0: e.clientX, y0: e.clientY, base: sim.current.x, dir: null, samples: [{ t: e.timeStamp, x: e.clientX }] };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x0;
    const my = e.clientY - d.y0;
    if (!d.dir) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      d.dir = Math.abs(mx) > Math.abs(my) ? 'h' : 'v';
      if (d.dir === 'h') {
        moved.current = true;
        sim.current.dragging = true;
        sim.current.vx = 0;
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
        kick();
      }
    }
    if (d.dir !== 'h') return;
    let next = d.base - mx; // 왼쪽으로 밀수록 +
    if (next < 0) next = 0;
    if (next > width) next = width + (next - width) * 0.22; // 끝에서는 고무줄
    sim.current.x = next;
    d.samples.push({ t: e.timeStamp, x: e.clientX });
    if (d.samples.length > 6) d.samples.shift();
  };

  const finish = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.dir !== 'h') return;
    const s = sim.current;
    s.dragging = false;
    // 손 뗄 때 속도(왼쪽이 +) — 최근 100ms 안의 움직임으로
    const lastT = d.samples[d.samples.length - 1]?.t ?? 0;
    const recent = d.samples.filter((p) => lastT - p.t <= 100);
    const a = recent[0];
    const b = recent[recent.length - 1];
    const v = a && b && b.t > a.t ? -((b.x - a.x) / ((b.t - a.t) / 1000)) : 0;
    s.vx = Math.max(-3000, Math.min(3000, v));
    const willOpen = v > FLICK ? true : v < -FLICK ? false : s.x > width * OPEN_RATIO;
    s.target = willOpen ? width : 0;
    kick();
    if (willOpen !== openRef.current) changeRef.current(willOpen);
  };

  return (
    <div ref={rootRef} data-swipe-row="" className="relative overflow-hidden" style={{ WebkitTapHighlightColor: 'transparent' }}>
      {/* 아래에 깔린 버튼 칸 — 오른쪽 끝에 고정 */}
      <div
        className="absolute inset-y-0 right-0 flex items-stretch justify-end py-3"
        style={{ width, paddingLeft: PAD_L, paddingRight: PAD_R, gap: GAP }}
      >
        {actions.map((a, i) => (
          <button
            key={a.key}
            ref={(el) => { btnRefs.current[i] = el; }}
            type="button"
            aria-label={a.label}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              closeNow();
              a.onClick();
            }}
            className="group flex shrink-0"
            style={{ width: BTN, transform: 'scale(0)', opacity: 0, visibility: 'hidden', willChange: 'transform', WebkitTapHighlightColor: 'transparent' }}
          >
            {/* 누르면 쏙 들어갔다 통 튀어 돌아온다 */}
            <span
              className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-[18px] transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] group-active:scale-[0.9] group-active:duration-100"
              style={{ background: a.bg, color: a.color }}
            >
              {a.icon && <MonoIcon name={a.icon} size={22} color={a.color} />}
              <span className="text-[15px] font-bold leading-none tracking-[-0.3px]">{a.label}</span>
            </span>
          </button>
        ))}
      </div>
      <div
        ref={contentRef}
        className="relative select-none bg-white"
        style={{ touchAction: 'pan-y', willChange: 'transform' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        // 마우스로 끌 때 링크·사진이 끌려 나가지 않게
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          // 밀고 뗀 직후의 클릭, 또는 열린 줄을 누른 클릭은 이동하지 않고 닫기만
          if (moved.current || openRef.current || sim.current.x > 1) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
            if (openRef.current || sim.current.x > 1) closeNow();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
