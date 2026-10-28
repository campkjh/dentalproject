'use client';

import React, { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
 * 어드민 공용 조각 — 프리티풀 어드민 2.0 어법(.adm-* , 스타일은 app/admin/admin.css).
 *  · 머리(제목·설명)는 레이아웃이 그린다 → PageHeader 는 오른쪽 버튼만 머리 자리(#adm-head-act)로 포털.
 *  · 상태 거르기 = 라디오(FilterChips 도 라디오로 그린다), 시간 거르기만 칩(TimeChips).
 *  · 거르기 + 표 = 흰 카드 하나(AdminListCard).
 * ──────────────────────────────────────────────────────────── */

type Tone = 'gray' | 'blue' | 'red' | 'green' | 'orange' | 'purple';

// 버튼 색 → .adm-btn 변형
const btnTone: Record<Tone, string> = {
  gray: '',
  blue: 'weak',
  red: 'danger',
  green: 'ok',
  orange: 'warn',
  purple: 'purple',
};

// ---------- 작은 버튼(표 칸 안) ----------
export function PillButton({
  children, onClick, tone = 'gray', disabled,
}: { children: React.ReactNode; onClick?: () => void; tone?: Tone; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`adm-btn sm ${btnTone[tone]}`}>
      {children}
    </button>
  );
}

// ---------- 상태 뱃지 ----------
export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`adm-badge ${tone === 'gray' ? '' : tone}`}>{children}</span>;
}

// ---------- 페이지 머리 ----------
/** 제목·설명은 레이아웃이 그린다(어드민 2.0 '머리·탭은 레이아웃이'). 여기선 오른쪽 버튼만 머리 오른쪽 자리로 보낸다.
 *  title/subtitle 은 예전 호출부 호환용으로 받기만 한다. */
export function PageHeader({
  right,
}: { title?: string; subtitle?: string; right?: React.ReactNode }) {
  return <HeadActions>{right}</HeadActions>;
}

/** 머리 오른쪽(#adm-head-act)에 버튼을 꽂는다 — 레이아웃이 먼저 그려 둔 칸이라 마운트 뒤 찾는다 */
export function HeadActions({ children }: { children?: React.ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => { setSlot(document.getElementById('adm-head-act')); }, []);
  if (!children || !slot) return null;
  return createPortal(children, slot);
}

// ---------- 카드 ----------
export function SectionCard({
  title, sub, action, children, flush = true,
}: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; flush?: boolean }) {
  return (
    <section className={`adm-card ${flush ? 'flush' : ''}`}>
      <div className="adm-card-head">
        <div>
          <h2 className="adm-card-title">{title}</h2>
          {sub && <p className="adm-card-sub">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ---------- 숫자(KPI) — 박스 없이 회색 바탕 위 ----------
// 예전 강조색 → 토스 결 색
const accentTone: Record<string, string> = {
  '#3182F6': '#3182F6',
  '#1AB554': '#03B26C',
  '#E54848': '#F04452',
  '#F59E0B': '#F46A00',
};
export function StatCard({
  label, value, suffix, accent, sub,
}: { label: string; value: string | number; suffix?: string; accent?: string; sub?: string }) {
  const color = accent && accent !== '#191F28' ? accentTone[accent] ?? accent : undefined;
  return (
    <div className="adm-stat">
      <p className="adm-stat-label">{label}</p>
      <p className="adm-stat-value" style={color ? { color } : undefined}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <small>{suffix}</small>}
      </p>
      {sub && <p className="adm-stat-sub">{sub}</p>}
    </div>
  );
}

/** 숫자 줄 — StatCard 를 n칸으로(좁으면 2칸) */
export function StatRow({ cols = 4, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div
      className="adm-stats grid grid-cols-2 md:grid-cols-[repeat(var(--n),minmax(0,1fr))]"
      style={{ ['--n' as string]: cols } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// ---------- 라디오 묶음(상태 거르기) ----------
export function RadioGroup<T extends string>({
  value, onChange, options, ariaLabel = '거르기',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: ReactNode }[];
  ariaLabel?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  // ←→ 로 옮겨 고르기(포커스는 고른 것 하나만)
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = Math.max(0, options.findIndex((o) => o.value === value));
    const next = options[(i + step + options.length) % options.length];
    onChange(next.value);
    requestAnimationFrame(() => boxRef.current?.querySelector<HTMLButtonElement>(`[data-v="${next.value}"]`)?.focus());
  };
  return (
    <div ref={boxRef} className="adm-radios" role="radiogroup" aria-label={ariaLabel} onKeyDown={onKey}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-v={o.value}
            className="adm-radio"
            onClick={() => { if (!on) onChange(o.value); }}
          >
            <span className="adm-radio-dot" aria-hidden="true" />
            {o.label}
            {o.count != null && <span className="adm-radio-count">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** 예전 이름 — 상태 거르기는 라디오로 그린다(어드민 2.0 규칙) */
export function FilterChips<T extends string>(props: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: ReactNode }[];
  ariaLabel?: string;
}) {
  return <RadioGroup {...props} />;
}

// ---------- 칩(시간 거르기 전용) ----------
export function TimeChips<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="adm-chips">
      {options.map((o) => (
        <button key={o.value} type="button" className={`adm-chip ${o.value === value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- 검색칸 ----------
export function SearchInput({
  value, onChange, placeholder, width = 280, onSubmit,
}: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number; onSubmit?: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const clear = () => { onChange(''); onSubmit?.(''); };
  return (
    <label className="adm-sf" style={{ width }}>
      <svg className="adm-sf-ic" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M21.8488 20.151L17.2418 15.544C18.3268 14.106 18.9778 12.324 18.9778 10.388C18.9778 5.652 15.1238 1.799 10.3888 1.799C5.6528 1.8 1.7998 5.653 1.7998 10.389C1.7998 15.124 5.6528 18.978 10.3888 18.978C12.3238 18.978 14.1068 18.327 15.5448 17.242L20.1518 21.849C20.3858 22.083 20.6928 22.2 20.9998 22.2C21.3068 22.2 21.6138 22.083 21.8488 21.848C22.3168 21.38 22.3168 20.62 21.8488 20.151ZM4.1998 10.389C4.1998 6.976 6.9758 4.2 10.3888 4.2C13.8008 4.2 16.5768 6.976 16.5768 10.388C16.5768 13.8 13.8008 16.576 10.3888 16.576C6.9758 16.577 4.1998 13.801 4.1998 10.389Z"
          fill="currentColor"
        />
      </svg>
      <input
        type="search"
        enterKeyHint="search"
        className="adm-sf-input"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit?.(e.currentTarget.value);
          else if (e.key === 'Escape' && value) { e.preventDefault(); clear(); }
        }}
      />
      {value && !focused && (
        <button
          type="button"
          className="adm-sf-clear"
          aria-label="검색어 지우기"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.preventDefault(); clear(); }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="11" fill="currentColor" />
            <path d="M7.5 7.5l7 7M14.5 7.5l-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </label>
  );
}

// ---------- 목록 카드(거르기 + 표 = 흰 카드 하나) ----------
export function AdminListCard({
  filter, children, className = '',
}: { filter?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`adm-listcard ${className}`}>
      {filter ? <div className="adm-filter">{filter}</div> : null}
      {children}
    </div>
  );
}

/** 거르기 한 줄 */
export function Toolbar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`adm-toolbar ${className}`}>{children}</div>;
}

/** '총 N건' */
export function Count({ n, unit = '건' }: { n: number; unit?: string }) {
  return <span className="adm-count">총 <b>{n.toLocaleString()}</b>{unit}</span>;
}

/** 표 아래 줄 — 'N건 중 M건' + 무한 스크롤 표지 */
export function TableFoot({
  total, shown, sentinelRef,
}: { total: number; shown: number; sentinelRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div className="adm-table-foot">
      전체 <b>{total.toLocaleString()}</b>건 중 <b>{Math.min(shown, total).toLocaleString()}</b>건 표시
      {shown < total && sentinelRef && <div ref={sentinelRef} className="adm-more">스크롤하면 더 불러와요</div>}
    </div>
  );
}

/** 불러오는 중 — 줄 모양 반짝이 */
export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="adm-loading" aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="adm-skel" style={{ opacity: 1 - i * 0.14 }} />)}
    </div>
  );
}

// ---------- 빈 칸 ----------
export function EmptyState({
  icon, title, hint,
}: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="adm-empty">
      {icon && <div className="adm-empty-ic">{icon}</div>}
      <p className="adm-empty-title">{title}</p>
      {hint && <p className="adm-empty-hint">{hint}</p>}
    </div>
  );
}

// ---------- 버튼 ----------
export function PrimaryCTA({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="adm-btn primary">
      {children}
    </button>
  );
}

export function SecondaryCTA({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="adm-btn">
      {children}
    </button>
  );
}

// ---------- 스위치 ----------
export function Switch({
  checked, onChange, disabled, label, ariaLabel,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: ReactNode; ariaLabel?: string }) {
  const btn = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || (typeof label === 'string' ? label : '켜고 끄기')}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`adm-switch ${checked ? 'on' : ''}`}
    >
      <span className="adm-switch-knob" />
    </button>
  );
  if (!label) return btn;
  return <span className="adm-switch-row">{btn}{label}</span>;
}

// ---------- 모달 ----------
/** 가운데 흰 창(딤 + 아래→위 스르르). side = 오른쪽 서랍. 바깥·Esc 로 닫힌다(busy 면 안 닫힘).
 *  body 포털 — 본문 등장 애니(transform)가 fixed 기준을 바꾸지 않게. 변수가 필요해 뿌리에 .admin-shell 을 다시 깐다 */
export function AdminModal({
  onClose, title, sub, icon, width = 440, side = false, busy = false, children, actions,
}: {
  onClose: () => void;
  title?: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  width?: number;
  side?: boolean;
  busy?: boolean;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);
  if (!mounted) return null;
  const close = () => { if (!busy) onClose(); };
  return createPortal(
    <div className={`admin-shell adm-modal-root ${side ? 'side' : ''}`} role="dialog" aria-modal="true">
      <button type="button" className="adm-modal-dim" aria-label="닫기" onClick={close} />
      <div className="adm-modal" style={side ? undefined : { width: `min(${width}px, 100%)` }}>
        {(title || icon) && (
          <div className="adm-modal-head">
            <div className="flex min-w-0 items-center gap-3">
              {icon}
              <div className="min-w-0">
                {title && <h3 className="adm-modal-title">{title}</h3>}
                {sub && <p className="adm-modal-sub">{sub}</p>}
              </div>
            </div>
            <button type="button" className="adm-modal-x" aria-label="닫기" onClick={close}>
              <X size={20} />
            </button>
          </div>
        )}
        {children}
        {actions && <div className="adm-modal-actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------- 표 머리(예전 호환) ----------
export function TableHead({ cols, template }: { cols: { label: string; align?: 'left' | 'right' }[]; template?: string }) {
  return (
    <div className="grid gap-4 adm-ghead" style={template ? { gridTemplateColumns: template } : undefined}>
      {cols.map((c, i) => (
        <div key={i} className={c.align === 'right' ? 'text-right' : ''}>{c.label}</div>
      ))}
    </div>
  );
}
