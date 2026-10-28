'use client';

// 상세 화면 본문 부품 — 프리티풀 my/_components/detail-ui(퀵매칭 어법) 그대로.
//  · 머리는 공통 TopBar(56 머리 줄 + 24 큰 제목). 본문은 <QdBody> 로 감싸면 직계 칸이 오른쪽→왼쪽으로 순차 슬라이드.
//  · 스타일은 globals.css 의 .qd-* (카드 .qd-card · 버튼 .qd-cta · 입력 .qd-input).
import Link from 'next/link';

/** 카드 — 퀵매칭 선택 카드처럼 1.5px 테두리 · 모서리 16 */
export const MY_CARD = 'qd-card';

/** 카드 묶음 위에 붙는 제목 */
export function MySectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`px-1 pb-2.5 text-[15px] font-semibold text-[#333D4B] ${className}`}>{children}</p>;
}

/** 본문 — 직계 칸이 오른쪽→왼쪽으로 순차 슬라이드(퀵매칭 stag) */
export function QdBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`qd-body ${className}`}>{children}</div>;
}

/** 퀵매칭 선택 카드 묶음 — 카드 사이 10px */
export function QdList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-2.5 ${className}`}>{children}</div>;
}

function QdChevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M9 6l6 6-6 6" stroke="#B0B8C1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 퀵매칭 선택 카드 한 줄 — 아이콘 칸(44 · 모서리 12) · 제목 17 · 회색 힌트 13 · 오른쪽 꺾쇠 */
export function QdRow({
  icon,
  title,
  hint,
  right,
  href,
  external,
  onClick,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  hint?: React.ReactNode;
  right?: React.ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      {icon && <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#F2F4F6]">{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="truncate text-[17px] font-semibold text-[#333D4B]">{title}</span>
        {hint && <span className="truncate text-[13px] text-[#8B95A1]">{hint}</span>}
      </span>
      {right ?? <QdChevron />}
    </>
  );
  const cls = 'qd-card flex min-h-[60px] w-full items-center gap-3.5 px-[18px] py-3.5 text-left transition-colors active:bg-[#F8F9FA] pc:hover:bg-[#FAFBFC]';
  if (href) {
    if (external || /^(https?:|tel:|mailto:)/.test(href)) {
      return (
        <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {inner}
        </a>
      );
    }
    return <Link href={href} className={cls}>{inner}</Link>;
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
