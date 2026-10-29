import Link from 'next/link';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { ChevronRight, Search } from 'lucide-react';
import TopBar from '@/components/common/TopBar';

type Tone = 'brand' | 'neutral' | 'danger';
type ButtonSize = 's' | 'm' | 'l' | 'xl';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

// 하위 화면 머리 — 고객 상세 머리(TopBar = .qd-header 56 줄 + 40 둥근 뒤로 + 아래 큰 제목 24 페이드)와 같은 결.
//  · eyebrow·icon 은 옛 머리(아이콘 칸 + 작은 윗글) 자리라 이제 그리지 않는다(부르는 쪽 호환으로 prop 만 남김).
//  · action(추가·등록 버튼)은 머리 줄 오른쪽에 둔다. 머리가 쪽 끝까지 붙어 있도록 감싸는 칸 없이 그린다(sticky).
export function PartnerTop({
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <TopBar title={title} sub={description} rightContent={action} />
  );
}

type PartnerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: never;
  variant?: 'fill' | 'weak' | 'text';
  tone?: Tone;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

type PartnerLinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: 'fill' | 'weak' | 'text';
  tone?: Tone;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function PartnerButton(props: PartnerButtonProps | PartnerLinkButtonProps) {
  const {
    children,
    className,
    variant = 'fill',
    tone = 'brand',
    size = 'l',
    leftIcon,
    rightIcon,
  } = props;
  const cls = cn('partner-button', `partner-button-${variant}`, `partner-button-${tone}`, `partner-button-${size}`, className);
  const content = (
    <>
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </>
  );

  if ('href' in props && props.href) {
    const {
      href,
      children: _children,
      className: _className,
      variant: _variant,
      tone: _tone,
      size: _size,
      leftIcon: _leftIcon,
      rightIcon: _rightIcon,
      ...linkProps
    } = props;
    return (
      <Link {...linkProps} href={href} className={cls}>
        {content}
      </Link>
    );
  }

  const {
    children: _children,
    className: _className,
    variant: _variant,
    tone: _tone,
    size: _size,
    leftIcon: _leftIcon,
    rightIcon: _rightIcon,
    href: _href,
    ...buttonProps
  } = props as PartnerButtonProps;

  return (
    <button {...buttonProps} className={cls}>
      {content}
    </button>
  );
}

export function PartnerPanel({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section {...props} className={cn('partner-panel', className)}>
      {children}
    </section>
  );
}

export function PartnerField({
  label,
  help,
  children,
  className,
}: {
  label: string;
  help?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('partner-field', className)}>
      <label>{label}</label>
      {children}
      {help && <p>{help}</p>}
    </div>
  );
}

export function PartnerInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('partner-input', className)} />;
}

export function PartnerTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn('partner-input partner-textarea', className)} />;
}

export function PartnerSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn('partner-input', className)}>
      {children}
    </select>
  );
}

export function PartnerSearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn('partner-search-shell', className)}>
      <div className="partner-search">
        <Search size={24} />
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
    </div>
  );
}

export function PartnerStatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: Tone | 'success' | 'warning' | 'info';
}) {
  return <span className={cn('partner-badge', `partner-badge-${tone}`)}>{children}</span>;
}

export function PartnerSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  getLabel = (v) => v,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  getLabel?: (value: T) => string;
}) {
  return (
    <div className="partner-segmented">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={option === value ? 'is-active' : ''}
        >
          {getLabel(option)}
        </button>
      ))}
    </div>
  );
}

export function PartnerListRow({
  icon,
  title,
  description,
  meta,
  href,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  href?: string;
  action?: ReactNode;
  className?: string;
}) {
  const content = (
    <>
      {icon && <div className="partner-list-icon">{icon}</div>}
      <div className="partner-list-copy">
        <div className="partner-list-main">{title}</div>
        {description && <div className="partner-list-sub">{description}</div>}
      </div>
      {meta && <div className="partner-list-meta">{meta}</div>}
      {action ?? (href ? <ChevronRight size={18} className="partner-list-chevron" /> : null)}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn('partner-list-row', className)}>
        {content}
      </Link>
    );
  }

  return <div className={cn('partner-list-row', className)}>{content}</div>;
}

export function PartnerEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="partner-empty">
      {icon && <div className="partner-empty-icon">{icon}</div>}
      <p className="partner-empty-title">{title}</p>
      {description && <p className="partner-empty-desc">{description}</p>}
      {action && <div className="partner-empty-action">{action}</div>}
    </div>
  );
}

export function PartnerStatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="partner-stat">
      <div className="partner-stat-head">
        <span>{label}</span>
        {icon}
      </div>
      <strong className={accent ? 'is-accent' : undefined}>{value}</strong>
      {sub && <p>{sub}</p>}
    </div>
  );
}

export function PartnerBottomCTA({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('partner-bottom-cta', className)}>{children}</div>;
}

export function PartnerModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="partner-modal-backdrop" onClick={onClose}>
      <div className="partner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="partner-modal-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="partner-modal-body">{children}</div>
        {footer && <div className="partner-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
