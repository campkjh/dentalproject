type IconProps = { size?: number };

const wrap = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
});

/* ===== Reservations ===== */

export function IconClock({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <circle cx="12" cy="12" r="9" fill="#FBBF24" />
      <path d="M12 7v5l3.2 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function IconCheckCircle({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <circle cx="12" cy="12" r="9" fill="#10B981" />
      <path d="M7.8 12l2.8 2.8L16.3 9.3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function IconXCircle({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <circle cx="12" cy="12" r="9" fill="#9CA3AF" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconPending({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <circle cx="12" cy="12" r="9" fill="#F59E0B" />
      <path d="M12 7v5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.2" fill="#fff" />
    </svg>
  );
}

export function IconMapPin({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path
        d="M12 2.5c-4.4 0-7.8 3.4-7.8 7.8 0 5.5 7.8 11.2 7.8 11.2s7.8-5.7 7.8-11.2c0-4.4-3.4-7.8-7.8-7.8z"
        fill="#EF4444"
      />
      <circle cx="12" cy="10" r="2.8" fill="#fff" />
    </svg>
  );
}

export function IconCalendarMini({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <rect x="3" y="6" width="18" height="15" rx="2.5" fill="#A78BFA" />
      <rect x="3" y="6" width="18" height="4.5" rx="2.5" fill="#7C3AED" />
      <circle cx="8" cy="16" r="1.2" fill="#fff" />
      <circle cx="12" cy="16" r="1.2" fill="#fff" />
      <circle cx="16" cy="16" r="1.2" fill="#fff" />
    </svg>
  );
}

/* ===== Community ===== */

export function IconStethoscope({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path
        d="M5 3v5.5a4.5 4.5 0 009 0V3"
        fill="none"
        stroke="#7C3AED"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="5" cy="3" r="1.3" fill="#7C3AED" />
      <circle cx="14" cy="3" r="1.3" fill="#7C3AED" />
      <path
        d="M9.5 13v3.5a4 4 0 004 4 4 4 0 004-4V14"
        fill="none"
        stroke="#7C3AED"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="12.5" r="2.8" fill="#A78BFA" />
      <circle cx="17.5" cy="12.5" r="1.1" fill="#fff" />
    </svg>
  );
}

export function IconPencil({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path d="M3 17.3L14.5 5.8l3.9 3.9L6.9 21.2H3v-3.9z" fill="#FBBF24" />
      <path d="M14.5 5.8l1.9-1.9a2 2 0 012.8 0l1.1 1.1a2 2 0 010 2.8L18.4 9.7z" fill="#F59E0B" />
      <rect x="3" y="19.5" width="4.2" height="1.8" rx="0.3" fill="#374151" />
    </svg>
  );
}

export function IconSearch({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="#3B82F6" strokeWidth="2.2" />
      <line x1="15" y1="15" x2="20" y2="20" stroke="#3B82F6" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="3" fill="#DBEAFE" />
    </svg>
  );
}

export function IconArrowUp({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <circle cx="12" cy="12" r="10" fill="#7C3AED" />
      <path d="M12 7.5v9M7.5 12L12 7.5l4.5 4.5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconEye({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"
        fill="#93C5FD"
      />
      <circle cx="12" cy="12" r="3.5" fill="#1E40AF" />
      <circle cx="13" cy="11" r="1" fill="#fff" />
    </svg>
  );
}

export function IconChat({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path
        d="M3.5 6.5a3 3 0 013-3h11a3 3 0 013 3v6.5a3 3 0 01-3 3h-6L8 20v-4h-1.5a3 3 0 01-3-3v-6.5z"
        fill="#A78BFA"
      />
      <circle cx="9" cy="10" r="1" fill="#fff" />
      <circle cx="12" cy="10" r="1" fill="#fff" />
      <circle cx="15" cy="10" r="1" fill="#fff" />
    </svg>
  );
}
