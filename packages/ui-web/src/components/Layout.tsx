import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** xs 4 · sm 8 · md 12 (default) · lg 16 · xl 24. */
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children?: ReactNode;
}

/** Vertical flex stack. */
export function Stack({ gap = 'md', className, children, ...rest }: StackProps) {
  return (
    <div className={cx('cl-stack', gap !== 'md' && `cl-stack--${gap}`, className)} {...rest}>
      {children}
    </div>
  );
}

export interface InlineProps extends HTMLAttributes<HTMLDivElement> {
  /** Don't wrap. */
  nowrap?: boolean;
  children?: ReactNode;
}

/** Horizontal flex row with 8px gaps, wrapping by default. */
export function Inline({ nowrap, className, children, ...rest }: InlineProps) {
  return (
    <div className={cx('cl-inline', nowrap && 'cl-inline--nowrap', className)} {...rest}>
      {children}
    </div>
  );
}

export interface SpreadProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Two ends of a row pushed apart (label left, value right). */
export function Spread({ className, children, ...rest }: SpreadProps) {
  return (
    <div className={cx('cl-spread', className)} {...rest}>
      {children}
    </div>
  );
}

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3 | 4;
  children?: ReactNode;
}

/** Equal-column grid (2, 3 or 4). */
export function Grid({ columns = 2, className, children, ...rest }: GridProps) {
  return (
    <div className={cx(`cl-grid-${columns}`, className)} {...rest}>
      {children}
    </div>
  );
}

export interface ColumnsProps extends HTMLAttributes<HTMLDivElement> {
  /** `main` = 3:2 content/aside; `sidebar` = content + 360px drawer. */
  layout?: 'main' | 'sidebar';
  children?: ReactNode;
}

/** Two-column web layout. */
export function Columns({ layout = 'main', className, children, ...rest }: ColumnsProps) {
  return (
    <div
      className={cx('cl-cols', layout === 'main' ? 'cl-cols--2' : 'cl-cols--sidebar', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export type DividerProps = HTMLAttributes<HTMLHRElement>;

/** 1px hairline. */
export function Divider({ className, ...rest }: DividerProps) {
  return <hr className={cx('cl-divider', className)} {...rest} />;
}
