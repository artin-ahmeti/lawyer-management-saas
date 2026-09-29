import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';

export type TextVariant =
  | 'display'
  | 'title-1'
  | 'title-2'
  | 'title-3'
  | 'body'
  | 'body-strong'
  | 'body-sm'
  | 'label'
  | 'caption'
  | 'overline'
  | 'amount-lg'
  | 'amount'
  | 'mono-id'
  | 'mono-timer';

export type TextTone = 'default' | 'muted' | 'faint' | 'accent' | 'success' | 'warning' | 'danger';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** One of the 14 type styles. Titles tighten to −0.02em; amounts and mono are tabular. */
  variant?: TextVariant;
  tone?: TextTone;
  /** Render as this element (default: p for body styles, span otherwise). */
  as?: ElementType;
  /** Balance line breaks in headings. */
  balance?: boolean;
  children?: ReactNode;
}

const TONE: Record<TextTone, string | undefined> = {
  default: undefined,
  muted: 'cl-muted',
  faint: 'cl-faint',
  accent: 'cl-accent',
  success: 'cl-tone-success',
  warning: 'cl-tone-warning',
  danger: 'cl-tone-danger',
};

/**
 * Typography primitive. Every text style in the system is a `variant`;
 * hierarchy comes from size and weight, colour only from `tone`.
 */
export function Text({
  variant = 'body',
  tone = 'default',
  as,
  balance,
  className,
  children,
  ...rest
}: TextProps) {
  const Tag: ElementType =
    as ?? (variant.startsWith('title') || variant === 'display' ? 'h2' : 'span');
  return (
    <Tag
      className={cx(`cl-t-${variant}`, TONE[tone], balance && 'cl-balance', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface AmountProps extends HTMLAttributes<HTMLSpanElement> {
  /** Integer cents (the app's money convention). */
  cents?: number;
  /** Or a preformatted string such as "$8,125.00" or "1.6h". */
  value?: string;
  currency?: string;
  size?: 'md' | 'lg' | 'display';
  tone?: 'default' | 'success' | 'danger' | 'muted';
  /** Dim the cents (default true for money). */
  dimCents?: boolean;
}

/**
 * Money and hours as first-class type: tabular figures, 600 weight, cents in
 * ink-secondary. Pass `cents` (integer) or a preformatted `value`.
 */
export function Amount({
  cents,
  value,
  currency = 'USD',
  size = 'md',
  tone = 'default',
  dimCents = true,
  className,
  ...rest
}: AmountProps) {
  let text = value ?? '';
  if (cents !== undefined) {
    text = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  }
  const m = dimCents ? /^(.*?)(\.\d{2})$/.exec(text) : null;
  const toneClass =
    tone === 'success'
      ? 'cl-tone-success'
      : tone === 'danger'
        ? 'cl-tone-danger'
        : tone === 'muted'
          ? 'cl-muted'
          : undefined;
  return (
    <span
      className={cx(size === 'md' ? 'cl-amount' : `cl-amount--${size}`, toneClass, className)}
      {...rest}
    >
      {m ? (
        <>
          {m[1]}
          <span className="cents">{m[2]}</span>
        </>
      ) : (
        text
      )}
    </span>
  );
}

export interface MonoProps extends HTMLAttributes<HTMLSpanElement> {
  /** Use primary ink instead of secondary. */
  ink?: boolean;
  children?: ReactNode;
}

/** Identifiers in Geist Mono: matter numbers, invoice numbers, UTBMS codes, account suffixes. */
export function Mono({ ink, className, children, ...rest }: MonoProps) {
  return (
    <span className={cx('cl-mono', ink && 'cl-mono--ink', className)} {...rest}>
      {children}
    </span>
  );
}

export interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
}

/** 11px uppercase overline for section eyebrows and table headers. */
export function Eyebrow({ className, children, ...rest }: EyebrowProps) {
  return (
    <span className={cx('cl-eyebrow', className)} {...rest}>
      {children}
    </span>
  );
}
