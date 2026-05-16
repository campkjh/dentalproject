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

type Tone = 'brand' | 'neutral' | 'danger';
type ButtonSize = 's' | 'm' | 'l' | 'xl';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function PartnerTop({
  eyebrow,
  title,
  description,
  action,
  icon,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('partner-top', className)}>
      {icon && <div className="partner-top-resource">{icon}</div>}
      <div className="partner-top-copy">
        {eyebrow && <p className="partner-top-eyebrow">{eyebrow}</p>}
        <div className="partner-top-title-row">
          <h1>{title}</h1>
          {action}
        </div>
        {description && <p>{description}</p>}
      </div>
    </header>
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
