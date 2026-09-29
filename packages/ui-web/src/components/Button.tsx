import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';
import type { IconName } from '../icons';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'tertiary'
  | 'ghost'
  | 'destructive'
  | 'destructive-solid'
  | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary (one per view) · secondary (tonal companion) · outline · tertiary (accent text) · ghost (dismiss) · destructive (tonal) · destructive-solid (confirm step only). */
  variant?: ButtonVariant;
  /** sm 36 · md 44 (mobile default) · lg 52 (sheet/form call to action). Web density maps md→36, lg→44. */
  size?: ButtonSize;
  /** Leading icon. */
  icon?: IconName;
  /** Trailing icon. */
  iconRight?: IconName;
  /** Square icon-only button; pass `aria-label`. */
  iconOnly?: boolean;
  /** Full width. */
  block?: boolean;
  /** Pill shape. */
  round?: boolean;
  /** Replaces the label with a spinner and blocks input. */
  loading?: boolean;
  children?: ReactNode;
}

/**
 * The button. Labels are verbs that name the outcome ("Send invoice",
 * "Bill 0.2h", "Text pay link"); money in a label always shows cents. One
 * primary per view; secondary is the default companion.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  iconOnly,
  block,
  round,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'cl-btn',
        `cl-btn--${variant}`,
        size !== 'md' && `cl-btn--${size}`,
        iconOnly && 'cl-btn--icon',
        block && 'cl-btn--block',
        round && 'cl-btn--round',
        loading && 'is-loading',
        className,
      )}
      {...rest}
    >
      {loading ? <span className="cl-spinner" /> : null}
      {icon ? <Icon name={icon} /> : null}
      {children !== undefined && children !== null ? <span>{children}</span> : null}
      {iconRight ? <Icon name={iconRight} /> : null}
    </button>
  );
}

export interface ButtonRowProps {
  /** Buttons share the row equally. */
  children?: ReactNode;
  className?: string;
}

/** Equal-width button row for sheet and screen footers. */
export function ButtonRow({ children, className }: ButtonRowProps) {
  return <div className={cx('cl-btn-row', className)}>{children}</div>;
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Accessible name — required. */
  label: string;
  /** Unread count shown as a red badge. */
  badge?: number | string;
  /** No surface or border (nav bars). */
  plain?: boolean;
  /** 32px instead of 40px. */
  size?: 'sm' | 'md';
}

/** Round 40px icon button for header actions, with an optional count badge. */
export function IconButton({
  icon,
  label,
  badge,
  plain,
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        'cl-iconbtn',
        plain && 'cl-iconbtn--plain',
        size === 'sm' && 'cl-iconbtn--sm',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 'sm' : 'md'} />
      {badge !== undefined && badge !== '' ? <span className="cl-badge">{badge}</span> : null}
    </button>
  );
}

export interface CaptureButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

/** The 56px round accent Capture action: the only raised, filled, round control in the app. Opens the Capture sheet. */
export function CaptureButton({
  label = 'Capture',
  className,
  type = 'button',
  ...rest
}: CaptureButtonProps) {
  return (
    <button type={type} aria-label={label} className={cx('cl-capture-btn', className)} {...rest}>
      <Icon name="plus" />
    </button>
  );
}
