'use client';

// 병원 신청 부품 — 프리티풀 pro-register/_components/RegisterKit 어법 그대로(마이닥 파랑 #3180F7).
//  · RegisterShell: 머리(퀵매칭 뒤로 화살표 + 진행 막대 'N / 전체' — 앞 단계 자리에서 지금 단계까지 차오른다) · 제목 아래→위 페이드 ·
//    본문 칸은 오른쪽→왼쪽 순차 슬라이드(globals .qd-body) · 아래 흰 페이드 위 고정 버튼.
//  · RgOption(선택 카드) · RgTile(과 선택 타일) · RgCheck(동그라미 체크) · RgChip(칩) · RgToggle(스위치) · RgField(라벨·도움말·오류) · RgCta(버튼).
//  · 스타일은 register.module.css + globals .qd-input / .qd-cta.
import { useState, type CSSProperties, type ReactNode } from 'react';
import s from './register.module.css';

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

/** 퀵매칭 뒤로 화살표(public/quick-match/icons/back.svg)를 글자색으로 칠한다 — TopBar 와 같은 그림 */
function BackIcon() {
  return (
    <i
      aria-hidden="true"
      className="block h-[26px] w-[26px] bg-[#191F28]"
      style={{
        WebkitMaskImage: 'url(/quick-match/icons/back.svg)',
        maskImage: 'url(/quick-match/icons/back.svg)',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}

/** 진행 막대 — 앞에서 보던 단계 길이에서 이번 단계 길이로 늘어난다(뒤로 가면 줄어든다) */
function RegisterProgress({ step, total }: { step: number; total: number }) {
  // 앞 단계 기억 — 렌더 중 이전 값 갱신(React 권장 '이전 props 저장' 방식)
  const [seen, setSeen] = useState({ cur: step, prev: step - 1 });
  if (seen.cur !== step) setSeen({ cur: step, prev: seen.cur });
  const from = (Math.max(0, seen.cur !== step ? seen.cur : seen.prev) / total) * 100;
  const to = (step / total) * 100;
  return (
    <div className={s.progress} role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label={`전체 ${total}단계 중 ${step}단계`}>
      <span className={s.track}>
        <span key={step} className={s.fill} style={{ '--from': `${from}%`, '--to': `${to}%` } as CSSProperties} />
      </span>
      <span className={s.count}><b>{step}</b> / {total}</span>
    </div>
  );
}

export function RegisterShell({
  step,
  total,
  title,
  sub,
  eyebrow,
  right,
  onBack,
  cta,
  children,
  showBack = true,
}: {
  /** 1~total. 없으면 진행 막대 없이 */
  step?: number;
  total?: number;
  title?: ReactNode;
  sub?: ReactNode;
  /** 제목 위 작은 파란 글씨 */
  eyebrow?: ReactNode;
  /** 머리 오른쪽(중간저장 등) */
  right?: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  /** 아래 고정 칸(버튼) */
  cta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={s.shell}>
      <div className={s.column}>
        <header className={s.header}>
          {showBack && (
            <button type="button" onClick={onBack} aria-label="뒤로 가기" className="qd-back">
              <BackIcon />
            </button>
          )}
          {step && total ? <RegisterProgress step={step} total={total} /> : <div className="flex-1" />}
          {right}
        </header>
        {/* 단계가 바뀌면 key 로 제목·본문 등장 애니메이션을 다시 돌린다 */}
        <div key={step ?? 0} className="flex min-h-0 flex-1 flex-col">
          {title && (
            <div className={s.titleWrap}>
              {eyebrow && <p className={cx(s.eyebrow, 'qd-a-title')}>{eyebrow}</p>}
              <h1 className={cx(s.title, 'qd-a-title')}>{title}</h1>
              {sub && <p className={cx(s.sub, 'qd-a-sub')}>{sub}</p>}
            </div>
          )}
          <div className={cx(s.body, 'qd-body')}>{children}</div>
        </div>
        {cta && <div className={s.ctaWrap}>{cta}</div>}
      </div>
    </div>
  );
}

/** 머리 오른쪽 작은 회색 버튼(중간저장) */
export function RgHeaderButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" className={s.headerBtn} onClick={onClick}>{children}</button>;
}

export function RgCta({ disabled, onClick, children, ghost }: { disabled?: boolean; onClick?: () => void; children: ReactNode; ghost?: boolean }) {
  return (
    <button type="button" className={`qd-cta${ghost ? ' ghost' : ''}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function RgCheck({ on, small }: { on: boolean; small?: boolean }) {
  return (
    <span className={cx(s.chk, small && s.sm, on && s.on)} aria-hidden="true">
      <svg width={small ? 12 : 14} height={small ? 12 : 14} viewBox="0 0 14 14" fill="none">
        <path d="M3 7.2l2.6 2.6L11 4.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** 선택 카드 묶음 — 카드 사이 10 */
export function RgList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cx(s.list, className)}>{children}</div>;
}

/** 선택 카드 — 퀵매칭 선택지(60 · 1.5px · 모서리 16, 고르면 파랑) */
export function RgOption({
  on,
  onClick,
  label,
  hint,
  icon,
  right,
  check = true,
  role = 'checkbox',
}: {
  on: boolean;
  onClick: () => void;
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
  /** 왼쪽 동그라미 체크(없으면 오른쪽 right 만) */
  check?: boolean;
  role?: 'checkbox' | 'radio';
}) {
  return (
    <button type="button" role={role} aria-checked={on} onClick={onClick} className={cx(s.opt, !!(hint || icon) && s.tall, on && s.on)}>
      {check && <RgCheck on={on} />}
      {icon}
      <span className={s.optT}>
        {label}
        {hint && <span className={s.optHint}>{hint}</span>}
      </span>
      {right}
    </button>
  );
}

/** 타일 묶음(3칸) */
export function RgTiles({ children }: { children: ReactNode }) {
  return <div className={s.tiles} role="radiogroup">{children}</div>;
}

/** 과 선택 타일 — 아이콘 44 + 이름, 고르면 파랑 */
export function RgTile({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: ReactNode; label: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} className={cx(s.tile, on && s.on)}>
      <span className={s.tileIcon}>{icon}</span>
      <span className={s.tileT}>{label}</span>
    </button>
  );
}

/** 칩 묶음 */
export function RgChips({ children }: { children: ReactNode }) {
  return <div className={s.chips}>{children}</div>;
}

/** 칩(여러 개 고르기) — 고르면 연파랑 */
export function RgChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cx(s.chip, on && s.on)}>
      {children}
    </button>
  );
}

/** 스위치 — 손잡이가 스프링 결로 미끄러진다 */
export function RgToggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-2.5 text-left disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-[16px] font-semibold tracking-[-0.3px] text-[#191F28]">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] text-[#8B95A1]">{hint}</span>}
      </span>
      <span className={cx(s.switch, checked && s.on)} aria-hidden="true">
        <span className={s.knob} />
      </span>
    </button>
  );
}

/** 입력 묶음 — 라벨 · (입력) · 도움말/오류 */
export function RgField({ label, required, hint, error, children, className = '' }: { label?: ReactNode; required?: boolean; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx(s.section, className)}>
      {label && <span className={s.label}>{label}{required && <span className={s.req} aria-hidden="true">*</span>}</span>}
      {children}
      {error ? <p className={s.error}>{error}</p> : hint ? <p className={s.hint}>{hint}</p> : null}
    </div>
  );
}

/** 회색 안내 상자 */
export function RgNote({ children }: { children: ReactNode }) {
  return <p className={s.note}>{children}</p>;
}

export { s as rgStyles, cx as rgCx };
