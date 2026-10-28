'use client';

// 마이 상세 화면 공통 조각 — 프리티풀 마이(퀵매칭 어법) 그대로.
//  · Screen = 흰 바탕 한 칸(모바일 500 · PC 640) · 토스 스위치 · ⋯ 툴팁 메뉴(.pop-menu) · 바텀 시트(.ft-sheet 톤) · 빈 상태 · 로그인 안내.
//  · 스타일은 screens.module.css(전역 CSS 는 건드리지 않는다).
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import s from './screens.module.css';

export { s as screenCss };

/** 화면 한 칸 — 모바일 500 · PC 640(wide = 860, 카드 2열 화면) */
export function Screen({ children, className = '', wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={`mx-auto min-h-screen max-w-[500px] bg-white pb-24 ${wide ? 'pc:max-w-[860px]' : 'pc:max-w-[640px]'} ${className}`} style={{ letterSpacing: '-0.02em' }}>
      {children}
    </div>
  );
}

/** 토스 아이콘(public/icons/toss/*.svg) */
export function TossIcon({ name, size = 24, className = '' }: { name: string; size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/icons/toss/${name}.svg`} alt="" width={size} height={size} className={`shrink-0 ${className}`} style={{ width: size, height: size }} />;
}

/** 토스 스위치 */
export function TossSwitch({ on, onToggle, label, disabled }: { on: boolean; onToggle: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onToggle} className={s.switch}>
      <span className={s.knob} />
    </button>
  );
}

/** 툴팁 메뉴 항목 순차 등장 — globals.css `.pop-menu-item` 과 짝 */
const popItemDelay = (i: number): CSSProperties => ({ animationDelay: `${0.07 + i * 0.035}s` });

export type MoreMenuItem = { icon: string; label: string; danger?: boolean; run: () => void };

/** ⋯ 버튼 + 툴팁 메뉴(작게→정비율 · 항목 오른쪽→왼쪽 촤라락) */
export function MoreMenu({ items, label = '메뉴' }: { items: MoreMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={label}
        aria-expanded={open}
        className="-mr-1.5 -mt-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors active:bg-[#F2F4F6] pc:hover:bg-[#F2F4F6]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#8B95A1" aria-hidden="true">
          <circle cx="5.5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="18.5" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="pop-menu absolute right-0 top-8 z-50" style={{ transformOrigin: 'top right' }} role="menu">
            {items.map((item, i) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`pop-menu-item ${item.danger ? 'danger' : ''}`}
                style={popItemDelay(i)}
                onClick={() => { setOpen(false); item.run(); }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.icon} alt="" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** 바텀 시트 — open 이 false 가 되면 내려가는 애니 뒤에 사라진다. 뒤 화면 스크롤은 잠근다 */
export function Sheet({ open, title, onClose, children }: { open: boolean; title?: ReactNode; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  // 열림 바뀜을 렌더 중에 반영(effect 안 setState 금지 규칙)
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) { setMounted(true); setClosing(false); } else if (mounted) setClosing(true);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!closing) return;
    timer.current = setTimeout(() => { setMounted(false); setClosing(false); }, 240);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [closing]);
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [mounted, onClose]);
  if (!mounted) return null;
  return (
    <div className={`${s.scrim} ${closing ? s.closing : ''}`} onClick={onClose}>
      <div className={s.sheet} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className={s.grab} aria-hidden="true" />
        {title && <h2 className={s.sheetTitle}>{title}</h2>}
        <div className={s.sheetBody}>{children}</div>
      </div>
    </div>
  );
}

/** 빈 상태 — 토스 아이콘 + 굵은 한 줄 + 회색 설명 */
export function EmptyBlock({ icon, title, desc, children }: { icon: string; title: ReactNode; desc?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#F2F4F6]">
        <TossIcon name={icon} size={34} />
      </span>
      <p className="text-[17px] font-bold text-[#191F28]">{title}</p>
      {desc && <p className="mt-1.5 text-[14px] leading-[1.5] text-[#8B95A1]">{desc}</p>}
      {children}
    </div>
  );
}

/** 로그인 안내 — 퀵매칭 톤(파랑 qd-cta) */
export function NeedLogin() {
  return (
    <EmptyBlock icon="account" title="로그인이 필요해요" desc="로그인하면 내 정보와 기록을 볼 수 있어요.">
      <Link href="/login" className="qd-cta mt-7 max-w-[320px]">로그인 / 회원가입</Link>
    </EmptyBlock>
  );
}
