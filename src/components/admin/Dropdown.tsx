'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

type DropdownOption<T extends string | number> = {
  value: T;
  label: string;
};

type DropdownOrigin = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// 메뉴가 커져 나오는 기준점 = 연 자리 쪽(툴팁 메뉴 어법)
const originClass: Record<DropdownOrigin, string> = {
  'top-left': '',
  'top-right': 'o-tr',
  'bottom-left': 'o-bl',
  'bottom-right': 'o-br',
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
        className={`adm-sortbtn ${open ? 'on' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger ?? <span>{active?.label ?? '선택'}</span>}
        <ChevronDown size={18} className="adm-sortbtn-chev" />
      </button>

      {open && (
        <>
          <div className="adm-pop-catch" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className={`adm-pop-menu ${originClass[origin]}`}
            style={{ ...positionStyle[origin], minWidth: width ?? 196 }}
          >
            {title && <div className="adm-pop-title">{title}</div>}
            {options.map((opt, i) => {
              const isActive = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`adm-pop-item ${isActive ? 'on' : ''}`}
                  // 항목은 위에서부터 차례로 오른쪽→왼쪽 촤라락
                  style={{ animationDelay: `${60 + i * 30}ms` }}
                >
                  <span>{opt.label}</span>
                  {isActive && (
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8.5L6.5 12L13 4" stroke="#3182F6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
