'use client';

// 토스 말풍선 — 프리티풀 홈 퀵매칭 말풍선(components/home/TossBubble · globals .qm-bubble*) 모양·움직임 그대로, 꼬리만 아래로.
//  · 유리는 꼬리+몸통 한 장(따로 흐리면 만나는 자리에 선이 생긴다) — 위 꼬리 윤곽을 그대로 그려 유리 칸만 위아래로 뒤집는다.
//  · 움직임 = 녹화 실측 팝(꼬리 쪽으로 붙어 있다가 반대로 살짝 넘어가 제자리). 바깥 칸은 transform 만, 투명도는 유리에 직접(뒤 흐림이 먹게).
import { useLayoutEffect, useRef, useState } from 'react';

const TAIL_H = 13;
const RADIUS = 26;

/** 꼬리(위) + 둥근 몸통 윤곽 — 프리티풀 quickMatchBubblePath 와 같은 실측값 */
function bubblePath(w: number, h: number, tailX: number) {
  const t = TAIL_H;
  const r = Math.min(RADIUS, (h - t) / 2);
  const x = Math.min(Math.max(tailX, r + 14), w - r - 14);
  const n = (v: number) => Math.round(v * 100) / 100;
  return [
    `M${n(r)} ${t}`,
    `L${n(x - 14)} ${t}`,
    `C${n(x - 11.4)} ${t} ${n(x - 10.7)} ${n(t - 1.8)} ${n(x - 9.8)} ${n(t - 2.9)}`,
    `L${n(x - 3.9)} ${n(t - 10.2)}`,
    `Q${n(x)} ${n(t - 14.6)} ${n(x + 3.9)} ${n(t - 10.2)}`,
    `L${n(x + 9.8)} ${n(t - 2.9)}`,
    `C${n(x + 10.7)} ${n(t - 1.8)} ${n(x + 11.4)} ${t} ${n(x + 14)} ${t}`,
    `L${n(w - r)} ${t}`,
    `A${n(r)} ${n(r)} 0 0 1 ${n(w)} ${n(t + r)}`,
    `L${n(w)} ${n(h - r)}`,
    `A${n(r)} ${n(r)} 0 0 1 ${n(w - r)} ${n(h)}`,
    `L${n(r)} ${n(h)}`,
    `A${n(r)} ${n(r)} 0 0 1 0 ${n(h - r)}`,
    `L0 ${n(t + r)}`,
    `A${n(r)} ${n(r)} 0 0 1 ${n(r)} ${t}`,
    'Z',
  ].join('');
}

/** 토스 결 아이콘(28) — 시계(진료 전) · 달(휴진·진료 끝) */
export function BubbleClockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="tbClock" x1="4" y1="3" x2="24" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6AA8FF" />
          <stop offset="1" stopColor="#2F6FE8" />
        </linearGradient>
      </defs>
      <circle cx="14" cy="14" r="11.5" fill="url(#tbClock)" />
      <circle cx="14" cy="14" r="8.6" fill="#fff" fillOpacity=".96" />
      <path d="M14 9.2V14l3.2 2.1" stroke="#2F6FE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="14" r="1.3" fill="#2F6FE8" />
    </svg>
  );
}

export function BubbleMoonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="tbMoon" x1="6" y1="3" x2="22" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD86B" />
          <stop offset="1" stopColor="#FFAE1F" />
        </linearGradient>
      </defs>
      <path d="M17.6 3.4a10.8 10.8 0 1 0 7 15.6A9 9 0 0 1 17.6 3.4z" fill="url(#tbMoon)" />
      <circle cx="21.6" cy="6.4" r="1.2" fill="#FFC94A" />
      <circle cx="24.2" cy="10.6" r=".8" fill="#FFC94A" />
    </svg>
  );
}

/** 꼬리가 아래(가운데)를 가리키는 말풍선 — 바닥 버튼 위 안내 등. icon·sub 가 있으면 프리티풀 퀵매칭 말풍선처럼 왼쪽 아이콘 + 제목 두 줄 */
export default function TossBubble({ children, sub, icon, className = '' }: { children: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const clip = size ? `path('${bubblePath(size.w, size.h, size.w / 2)}')` : undefined;

  return (
    <div ref={ref} role="status" className={`toss-bubble${icon ? ' has-icon' : ''} ${className}`}>
      <span className="toss-bubble-shadow" aria-hidden="true" />
      <span className="toss-bubble-glass" aria-hidden="true" style={{ clipPath: clip, WebkitClipPath: clip, visibility: size ? undefined : 'hidden' }} />
      <div className="toss-bubble-body">
        {icon && <span className="toss-bubble-ic">{icon}</span>}
        <p className="toss-bubble-title">{children}</p>
        {sub && <p className="toss-bubble-sub">{sub}</p>}
      </div>
    </div>
  );
}
