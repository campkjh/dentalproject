'use client';

// 당겨서 새로고침(261101) — 흰 동그라미 안 마이닥 로고가 '채워진다'. 흐린 회색 로고 안으로 보라 물이 아래서부터 차오르고
// 물 윗면엔 작은 물결이 흐른다(로고 모양 마스크 안의 물 칸).
//  · 당기는 만큼 차오르고, 문턱을 넘으면 꽉 차며 톡 튄다. 놓으면 새로고침.
//  · 진동(261102) = '두두드드득' — 당기는 동안 톱니 틱이 점점 촘촘하고 세게(RATCHET), 문턱에서 '득'(medium). 되돌리면 약하게 거꾸로.
//  · 새로고침 중 = 비웠다 다시 차오르기를 되풀이. 받아 오기가 끝나면(busy 꺼짐, 최소 한 바퀴 1.15초) 꽉 채운 뒤 작아지며 사라진다.
//  · 많이 당길수록 덜 따라오는 고무줄 느낌(1 − e^(−x/160)).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './app-ui.module.css';
import { haptic } from '@/lib/haptics';

const THRESHOLD = 72;
const MAX_PULL = 120;
const MIN_SPIN = 1150;
// 톱니 틱 자리(문턱 대비 비율) — 고무줄 때문에 비율이 아니라 손가락 거리로 맞췄다:
// 손가락 33px 에서 시작해 틱 사이가 24→8px 로 좁아지다 문턱(147px)에서 '득'(두 두 드 드 드드득)
const RATCHET = [0.31, 0.5, 0.63, 0.74, 0.82, 0.88, 0.925, 0.965];

type Phase = 'idle' | 'pulling' | 'refreshing' | 'done';

export default function PullToRefresh({ onRefresh, busy = false, disabled = false }: {
  onRefresh: () => void;
  /** 받아 오는 중(끝나면 사라지는 움직임이 시작된다) */
  busy?: boolean;
  /** 시트·모달이 떠 있을 땐 당기기를 막는다 */
  disabled?: boolean;
}) {
  const [pull, setPull] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [armed, setArmed] = useState(false);
  const callback = useRef(onRefresh);
  const busyRef = useRef(busy);
  const phaseRef = useRef<Phase>('idle');
  const startedAt = useRef(0);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { callback.current = onRefresh; }, [onRefresh]);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => () => clearTimeout(doneTimer.current), []);

  // 받아 오기가 끝나면(최소 시간은 채우고) 사라진다 — 8초가 넘어도 정리
  useEffect(() => {
    if (phase !== 'refreshing') return;
    const finish = () => {
      phaseRef.current = 'done';
      setPhase('done');
      doneTimer.current = setTimeout(() => {
        phaseRef.current = 'idle';
        setPhase('idle');
        setPull(0);
        setArmed(false);
      }, 420);
    };
    const safety = setTimeout(finish, 8000);
    if (busy) return () => clearTimeout(safety);
    const wait = setTimeout(finish, Math.max(0, MIN_SPIN - (Date.now() - startedAt.current)));
    return () => { clearTimeout(safety); clearTimeout(wait); };
  }, [busy, phase]);

  useEffect(() => {
    if (disabled) return;
    let start: { x: number; y: number } | null = null;
    let distance = 0;
    let passed = false;
    let notch = 0;
    const atTop = () => window.scrollY <= 0;
    const go = (next: Phase) => { phaseRef.current = next; setPhase(next); };
    const reset = () => { start = null; distance = 0; passed = false; notch = 0; setPull(0); setArmed(false); if (phaseRef.current === 'pulling') go('idle'); };
    const begin = (event: TouchEvent) => {
      const blocked = phaseRef.current === 'refreshing' || phaseRef.current === 'done' || busyRef.current;
      if (blocked || event.touches.length !== 1 || !atTop() || document.querySelector('dialog[open]') || (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable=true]'))) { start = null; return; }
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      distance = 0;
      passed = false;
      notch = 0;
    };
    const move = (event: TouchEvent) => {
      if (!start || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if ((distance === 0 && Math.abs(dx) > Math.abs(dy)) || !atTop()) { reset(); return; }
      const raw = Math.max(0, dy);
      distance = MAX_PULL * (1 - Math.exp(-raw / 160));
      if (raw > 0 && phaseRef.current === 'idle') go('pulling');
      setPull(distance);
      // 톱니 — 지난 틱 수가 바뀌면 한 번 '드'(당길수록 세게), 되돌리면 약하게
      const p = distance / THRESHOLD;
      let next = 0;
      while (next < RATCHET.length && p >= RATCHET[next]) next++;
      if (next !== notch && !passed) {
        haptic(next > notch ? 'rigid' : 'soft', { intensity: next > notch ? 0.3 + (next / RATCHET.length) * 0.5 : 0.3 });
      }
      notch = next;
      if (!passed && distance >= THRESHOLD) {
        passed = true;
        setArmed(true);
        haptic('medium');
      } else if (passed && distance < THRESHOLD) {
        passed = false;
        setArmed(false);
      }
      if (dy > 0 && event.cancelable) event.preventDefault();
    };
    const finish = () => {
      if (!start) return;
      start = null;
      if (distance < THRESHOLD) { reset(); return; }
      distance = 0;
      startedAt.current = Date.now();
      go('refreshing');
      callback.current();
    };
    window.addEventListener('touchstart', begin, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', finish, { passive: true });
    window.addEventListener('touchcancel', reset, { passive: true });
    return () => {
      window.removeEventListener('touchstart', begin);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', finish);
      window.removeEventListener('touchcancel', reset);
    };
  }, [disabled]);

  if (phase === 'idle' || typeof document === 'undefined') return null;

  const progress = Math.min(1, pull / THRESHOLD);
  const settled = phase === 'refreshing' || phase === 'done';
  // 당기는 동안은 손가락을 따라오고(조금 위에서 내려온다), 새로고침 중엔 한 자리에 머문다
  const y = settled ? 22 : pull * 0.85 - 40;
  const label = phase === 'refreshing' || phase === 'done' ? '새로고침 중' : armed ? '놓으면 새로고침' : '당겨서 새로고침';

  return createPortal(
    <div
      className={styles.ptr}
      data-phase={phase}
      data-armed={armed || undefined}
      style={{ transform: `translate3d(0, ${y}px, 0)`, opacity: settled ? 1 : Math.min(1, progress * 1.6) }}
      role="status"
      aria-label={label}
    >
      <span className={styles.ptrMark} style={settled ? undefined : { transform: `scale(${0.8 + 0.2 * progress})` }}>
        {/* 빈 로고(흐린 회색) 위에 로고 모양으로 오린 물 칸 — 높이 = 차오른 만큼 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/brand-logo-mark.png" alt="" className={styles.ptrEmpty} />
        <span className={styles.ptrFill} aria-hidden="true">
          <span className={styles.ptrLiquid} style={settled ? undefined : { height: `${Math.round(progress * 100)}%` }} />
        </span>
      </span>
    </div>,
    document.body,
  );
}
