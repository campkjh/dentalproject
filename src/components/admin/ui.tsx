'use client';

import React from 'react';

// ---------- Pill Button ----------
type PillTone = 'gray' | 'blue' | 'red' | 'green' | 'orange' | 'purple';
const pillStyles: Record<PillTone, string> = {
  gray: 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]',
  blue: 'bg-[#E5F1FF] text-[#3182F6] hover:bg-[#D6E8FF]',
  red: 'bg-[#FEECEC] text-[#E54848] hover:bg-[#FCDCDC]',
  green: 'bg-[#E8F8EE] text-[#1AB554] hover:bg-[#D6F1DF]',
  orange: 'bg-[#FFF4E5] text-[#F59E0B] hover:bg-[#FFE9CC]',
  purple: 'bg-[#F2EAFF] text-[#7B61FF] hover:bg-[#E8DCFF]',
};

export function PillButton({
  children, onClick, tone = 'gray', disabled,
}: { children: React.ReactNode; onClick?: () => void; tone?: PillTone; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center h-[28px] px-[10px] rounded-md text-[12px] font-semibold transition-colors disabled:opacity-50 ${pillStyles[tone]}`}
    >
      {children}
    </button>
  );
}

// ---------- Status badge ----------
export function StatusBadge({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  const bg: Record<PillTone, { bg: string; color: string }> = {
    gray: { bg: '#F2F4F6', color: '#8B95A1' },
    blue: { bg: '#E5F1FF', color: '#3182F6' },
    red: { bg: '#FEECEC', color: '#E54848' },
    green: { bg: '#E8F8EE', color: '#1AB554' },
    orange: { bg: '#FFF4E5', color: '#F59E0B' },
    purple: { bg: '#F2EAFF', color: '#7B61FF' },
  };
  return (
    <span
      className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold"
      style={{ background: bg[tone].bg, color: bg[tone].color }}
    >
      {children}
    </span>
  );
}

// ---------- Page Header ----------
export function PageHeader({
  title, subtitle, right,
}: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-[#191F28]">{title}</h1>
        {subtitle && <p className="text-[13px] text-[#8B95A1] mt-1.5">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

// ---------- Section Card ----------
export function SectionCard({
  title, action, children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-3 px-1">
        <h2 className="text-[17px] font-bold text-[#191F28] tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">{children}</div>
    </section>
  );
}

// ---------- Stat Card (KPI) ----------
export function StatCard({
  label, value, suffix, accent = '#191F28', sub,
}: { label: string; value: string | number; suffix?: string; accent?: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E8EB] px-5 py-4">
      <p className="text-[12px] font-medium text-[#8B95A1]">{label}</p>
      <p className="text-[24px] font-bold tracking-tight mt-1" style={{ color: accent }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className="text-[13px] font-medium text-[#8B95A1] ml-1">{suffix}</span>}
      </p>
      {sub && <p className="text-[12px] text-[#8B95A1] mt-0.5">{sub}</p>}
    </div>
  );
}

// ---------- Filter Chips (toggle row) ----------
export function FilterChips<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors border"
            style={
              active
                ? { background: '#191F28', color: '#FFFFFF', borderColor: '#191F28' }
                : { background: '#FFFFFF', color: '#4E5968', borderColor: '#E5E8EB' }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Search Input (Toss-card aesthetic) ----------
export function SearchInput({
  value, onChange, placeholder, width = 320,
}: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number }) {
  const [focused, setFocused] = React.useState(false);
  const hasValue = value.length > 0;
  return (
    <div
      className="relative flex items-center transition-all"
      style={{
        width,
        height: 44,
        background: '#FFFFFF',
        borderRadius: 14,
        boxShadow: focused
          ? '0 0 0 3px rgba(49, 130, 246, 0.14), 0 4px 16px -4px rgba(15, 23, 42, 0.08)'
          : '0 0 0 1px #E5E8EB, 0 1px 2px rgba(15, 23, 42, 0.02)',
      }}
    >
      <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={focused ? '#3182F6' : '#8B95A1'} strokeWidth="1.6">
          <circle cx="7" cy="7" r="5.5" />
          <path d="M11 11l3 3" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full h-full pl-11 pr-10 bg-transparent text-[14px] text-[#191F28] placeholder:text-[#B0B8C1] focus:outline-none font-medium"
      />
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#E5E8EB] hover:bg-[#C9CDD2] flex items-center justify-center transition-colors"
          aria-label="검색어 지우기"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1 1L8 8M8 1L1 8" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---------- Empty State ----------
export function EmptyState({
  icon, title, hint,
}: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="px-5 py-16 text-center">
      {icon && (
        <div className="w-12 h-12 mx-auto bg-[#F2F4F6] rounded-full flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <p className="text-[14px] font-semibold text-[#4E5968]">{title}</p>
      {hint && <p className="text-[12px] text-[#8B95A1] mt-1">{hint}</p>}
    </div>
  );
}

// ---------- Primary CTA ----------
export function PrimaryCTA({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center h-10 px-4 bg-[#3182F6] text-white rounded-[10px] text-[13px] font-semibold hover:bg-[#1B64DA] disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  );
}

// ---------- Secondary CTA ----------
export function SecondaryCTA({
  children, onClick,
}: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center h-10 px-3.5 bg-white border border-[#E5E8EB] rounded-[10px] text-[13px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB]"
    >
      {children}
    </button>
  );
}

// ---------- Table column header ----------
export function TableHead({ cols }: { cols: { label: string; align?: 'left' | 'right' }[] }) {
  return (
    <div
      className="grid gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider"
      style={{ gridTemplateColumns: '' /* set by parent */ }}
    >
      {cols.map((c, i) => (
        <div key={i} className={c.align === 'right' ? 'text-right' : ''}>{c.label}</div>
      ))}
    </div>
  );
}
