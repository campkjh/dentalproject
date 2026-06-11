'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

type DropdownOption<T extends string | number> = {
  value: T;
  label: string;
};

type DropdownOrigin = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const originClass: Record<DropdownOrigin, string> = {
  'top-left': '',
  'top-right': 'admin-dropdown-origin-right',
  'bottom-left': 'admin-dropdown-origin-bottom',
  'bottom-right': 'admin-dropdown-origin-bottom-right',
};

const positionStyle: Record<DropdownOrigin, React.CSSProperties> = {
  'top-left': { top: 'calc(100% + 6px)', left: 0 },
  'top-right': { top: 'calc(100% + 6px)', right: 0 },
  'bottom-left': { bottom: 'calc(100% + 6px)', left: 0 },
  'bottom-right': { bottom: 'calc(100% + 6px)', right: 0 },
};

export function Dropdown<T extends string | number>({
  title,
  value,
  onChange,
  options,
  trigger,
  origin = 'top-left',
  width,
}: {
  title?: string;
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  trigger?: ReactNode;
  origin?: DropdownOrigin;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const active = options.find((o) => o.value === value);

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="admin-chip inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold border border-[#E5E8EB] bg-white text-[#4E5968] hover:bg-[#F9FAFB]"
      >
        {trigger ?? <span>{active?.label ?? '선택'}</span>}
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <>
          <div className="admin-dropdown-backdrop" onClick={() => setOpen(false)} />
          <div
            className={`admin-dropdown ${originClass[origin]}`}
            style={{ ...positionStyle[origin], minWidth: width ?? 200 }}
          >
            {title && <div className="admin-dropdown-title">{title}</div>}
            {options.map((opt) => {
              const isActive = opt.value === value;
              return (
                <div
                  key={String(opt.value)}
                  role="button"
                  tabIndex={0}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`admin-dropdown-item ${isActive ? 'admin-dropdown-item-active' : ''}`}
                >
                  <span
                    className="flex-shrink-0 w-[18px] flex items-center justify-center"
                    style={{ visibility: isActive ? 'visible' : 'hidden' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5L6.5 12L13 4" stroke="#3182F6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>{opt.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
