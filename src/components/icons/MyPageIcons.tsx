type IconProps = { size?: number };

const wrap = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
});

export function IconProfile({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <circle cx="12" cy="8.5" r="4" fill="#D1D5DB" />
      <path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5v1h-17v-1z" fill="#D1D5DB" />
    </svg>
  );
}

export function IconCalendar({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" fill="#E5E7EB" />
      <rect x="3" y="5" width="18" height="5" rx="2.5" fill="#C8CEDA" />
      <rect x="7" y="3" width="1.8" height="4" rx="0.9" fill="#8E95A4" />
      <rect x="15.2" y="3" width="1.8" height="4" rx="0.9" fill="#8E95A4" />
      <path d="M8.5 14.5l2.2 2.2 4.8-4.8" stroke="#EF4444" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMail({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" fill="#3B82F6" />
      <path d="M3.5 7.5l8.5 6 8.5-6" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTicket({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path
        d="M2 8.5a2 2 0 012-2h16a2 2 0 012 2v1.8a1.7 1.7 0 000 3.4v1.8a2 2 0 01-2 2H4a2 2 0 01-2-2v-1.8a1.7 1.7 0 000-3.4V8.5z"
        fill="#A78BFA"
      />
      <line x1="14" y1="7" x2="14" y2="17" stroke="#fff" strokeWidth="1" strokeDasharray="1.5 1.5" />
      <circle cx="8" cy="12" r="0.8" fill="#fff" />
    </svg>
  );
}

export function IconCoin({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <circle cx="12" cy="12" r="9" fill="#FBBF24" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.6" />
      <text x="12" y="16" textAnchor="middle" fontWeight="800" fontSize="11" fill="#92400E" fontFamily="system-ui">
        ₩
      </text>
    </svg>
  );
}

export function IconLogout({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <circle cx="12" cy="12" r="10" fill="#9CA3AF" />
      <path d="M13.5 8.5l3.5 3.5-3.5 3.5M17 12H8.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCard({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" fill="#8037FF" />
      <rect x="2.5" y="9" width="19" height="3" fill="#5E20CC" />
      <rect x="5.5" y="14.5" width="6" height="1.8" rx="0.5" fill="#fff" opacity="0.9" />
    </svg>
  );
}

export function IconHeart({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path
        d="M12 20.5s-7-4.5-7-10.5a4.2 4.2 0 017.1-3A4.2 4.2 0 0119 10c0 6-7 10.5-7 10.5z"
        fill="#EF4444"
      />
    </svg>
  );
}

export function IconStar({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path
        d="M12 2.5l3 6.2 6.8 1-5 4.8 1.2 6.7L12 18l-6 3.2 1.2-6.7-5-4.8 6.8-1L12 2.5z"
        fill="#FBBF24"
      />
    </svg>
  );
}

export function IconHelp({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <circle cx="12" cy="12" r="10" fill="#FBBF24" />
      <path d="M9 9.5a3 3 0 116 0c0 1.5-1.5 2-2.3 2.5-.5.3-.7.7-.7 1.3v.2" stroke="#fff" strokeWidth="1.9" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.1" fill="#fff" />
    </svg>
  );
}

export function IconDoc({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path d="M5 3.5a2 2 0 012-2h7l6 6v13a2 2 0 01-2 2H7a2 2 0 01-2-2v-17z" fill="#E5E7EB" />
      <path d="M14 1.5v4a2 2 0 002 2h4" fill="#C8CEDA" />
      <line x1="8.5" y1="12.5" x2="15.5" y2="12.5" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8.5" y1="15.5" x2="15.5" y2="15.5" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8.5" y1="18.5" x2="13" y2="18.5" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconHeadset({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path d="M4 14a8 8 0 0116 0" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      <rect x="2.5" y="13" width="4.5" height="7" rx="1.8" fill="#3B82F6" />
      <rect x="17" y="13" width="4.5" height="7" rx="1.8" fill="#3B82F6" />
      <path d="M19 20v.5a3 3 0 01-3 3h-1.5" stroke="#3B82F6" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="13.3" cy="23.5" r="1.3" fill="#3B82F6" />
    </svg>
  );
}

export function IconMegaphone({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path d="M3 10v4a1 1 0 001 1h1l8 4V5L5 9H4a1 1 0 00-1 1z" fill="#EF4444" />
      <rect x="13" y="7.5" width="6.5" height="9" rx="1.2" fill="#F87171" />
      <rect x="15.2" y="10" width="2.2" height="4.5" rx="0.6" fill="#fff" opacity="0.55" />
      <path d="M6 18l1.3 3.5H9L8 18" fill="#EF4444" />
    </svg>
  );
}

export function IconHospital({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <rect x="3" y="9" width="18" height="12.5" rx="1.5" fill="#E5E7EB" />
      <path d="M2.5 9.5L12 2.5l9.5 7z" fill="#3B82F6" />
      <rect x="10.5" y="12" width="3" height="7" rx="0.5" fill="#fff" />
      <rect x="11" y="13" width="2" height="5" fill="#EF4444" />
      <rect x="10.2" y="14.5" width="3.6" height="2" fill="#EF4444" />
    </svg>
  );
}
