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
      <path
        d="M3 6.5a3 3 0 013-3h12a3 3 0 013 3v7a3 3 0 01-3 3h-6.2L8 21v-4.5H6a3 3 0 01-3-3v-7z"
        fill="#3B82F6"
      />
      <circle cx="9" cy="10" r="1.2" fill="#fff" />
      <circle cx="12" cy="10" r="1.2" fill="#fff" />
      <circle cx="15" cy="10" r="1.2" fill="#fff" />
      <circle cx="19.5" cy="5" r="2.8" fill="#EF4444" stroke="#fff" strokeWidth="0.8" />
    </svg>
  );
}

export function IconTicket({ size = 24 }: IconProps) {
  return (
    <svg {...wrap(size)}>
      <path
        d="M2 9a2 2 0 012-2h16a2 2 0 012 2v1.5a1.5 1.5 0 000 3V15a2 2 0 01-2 2H4a2 2 0 01-2-2v-1.5a1.5 1.5 0 000-3V9z"
        fill="#F97316"
      />
      <line x1="13" y1="8" x2="13" y2="16" stroke="#fff" strokeWidth="1" strokeDasharray="1.3 1.5" opacity="0.75" />
      <circle cx="6.5" cy="10.5" r="1" fill="#fff" />
      <circle cx="9.5" cy="13.5" r="1" fill="#fff" />
      <line x1="10" y1="10" x2="6" y2="14" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M17.5 10.3l.55 1.15 1.25.2-.9.88.22 1.25-1.12-.6-1.12.6.22-1.25-.9-.88 1.25-.2z"
        fill="#FDE68A"
      />
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
      <path
        d="M3 10.5a1.5 1.5 0 011.5-1.5h3l10-3.5v14l-10-3.5h-3A1.5 1.5 0 013 14v-3.5z"
        fill="#EF4444"
      />
      <path d="M7.5 9v6" stroke="#DC2626" strokeWidth="0.9" opacity="0.5" strokeLinecap="round" />
      <rect x="6" y="15" width="2.4" height="4.5" rx="1.1" fill="#EF4444" />
      <rect x="5.3" y="19" width="3.8" height="1.6" rx="0.8" fill="#DC2626" />
      <path d="M20 9.5v5" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M22 7.5v9" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
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
