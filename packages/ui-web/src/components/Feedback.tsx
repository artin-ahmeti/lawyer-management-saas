import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';
import type { IconName } from '../icons';

export type BannerTone =
  'neutral' | 'warning' | 'danger' | 'success' | 'info' | 'accent' | 'outline';

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** warning (deadline ≤7d) · danger (trust anomaly, missed) · success · info (sync) · accent (opportunity: missed-call text-back) · outline (must be present, not alarming: AI disclosure, ethical walls). */
  tone?: BannerTone;
  icon?: IconName;
  title: ReactNode;
  text?: ReactNode;
  /** Up to two small buttons. */
  actions?: ReactNode;
  /** One line, no actions. */
  compact?: boolean;
  /** Show a dismiss ×. */
  dismissible?: boolean;
  onDismiss?: () => void;
  /** Right-side element on compact banners (a pill, a chevron). */
  trailing?: ReactNode;
}

/** Inline, contextual message at the top of the content it concerns. Never a global strip; never more than two stacked. */
export function Banner({
  tone = 'neutral',
  icon,
  title,
  text,
  actions,
  compact,
  dismissible,
  onDismiss,
  trailing,
  className,
  ...rest
}: BannerProps) {
  return (
    <div
      className={cx(
        'cl-banner',
        tone !== 'neutral' && `cl-banner--${tone}`,
        compact && 'cl-banner--compact',
        className,
      )}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : null}
      <div className="cl-banner__body">
        <div className="cl-banner__title">{title}</div>
        {text ? <div className="cl-banner__text">{text}</div> : null}
        {actions ? <div className="cl-banner__actions">{actions}</div> : null}
      </div>
      {trailing}
      {dismissible ? (
        <button type="button" className="cl-banner__close" aria-label="Dismiss" onClick={onDismiss}>
          <Icon name="x" size="sm" />
        </button>
      ) : null}
    </div>
  );
}

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  message: ReactNode;
  tone?: 'success' | 'danger';
  /** Inline action label (Undo). */
  action?: ReactNode;
  onAction?: () => void;
}

/** One-line confirmation on the inverse surface with an optional Undo. Errors that need a decision use Dialog or Banner. */
export function Toast({
  message,
  tone = 'success',
  action,
  onAction,
  className,
  ...rest
}: ToastProps) {
  return (
    <div
      role="status"
      className={cx('cl-toast', tone === 'danger' && 'cl-toast--danger', className)}
      {...rest}
    >
      <Icon name={tone === 'danger' ? 'alert' : 'check'} />
      {message}
      {action ? (
        <button type="button" className="cl-toast__action" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

export interface DialogProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Ask the question with the amount or object in it: "Send invoice for $8,125.00?" */
  title: ReactNode;
  /** What happens next and anything irreversible. */
  text?: ReactNode;
  /** A ghost dismiss and one primary (or destructive-solid) verb. */
  actions?: ReactNode;
  children?: ReactNode;
}

/** Confirmation dialog: the consequence in the body, the verb on the button. Wrap in `Scrim center` to show it over a screen. */
export function Dialog({ title, text, actions, className, children, ...rest }: DialogProps) {
  return (
    <div role="dialog" aria-modal="true" className={cx('cl-dialog', className)} {...rest}>
      <div className="cl-dialog__title">{title}</div>
      {text ? <div className="cl-dialog__text">{text}</div> : null}
      {children}
      {actions ? <div className="cl-dialog__actions">{actions}</div> : null}
    </div>
  );
}

export interface SheetProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  /** Right side of the title row (close button, pill). */
  headerRight?: ReactNode;
  /** Hide the grabber. */
  noGrabber?: boolean;
  children?: ReactNode;
}

/** Bottom sheet: every create and edit flow on mobile. Grabber, title row, content, one `lg` primary button at the bottom. */
export function Sheet({ title, headerRight, noGrabber, className, children, ...rest }: SheetProps) {
  return (
    <div role="dialog" className={cx('cl-sheet', className)} {...rest}>
      {!noGrabber ? <div className="cl-sheet__grab" /> : null}
      {title || headerRight ? (
        <div className="cl-sheet__head">
          {title ? <h2 className="cl-sheet__title">{title}</h2> : <span />}
          {headerRight}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export interface ScrimProps extends HTMLAttributes<HTMLDivElement> {
  /** Centre the child (dialogs) instead of docking it to the bottom (sheets). */
  center?: boolean;
  children?: ReactNode;
}

/** Dimmed overlay that positions a Sheet (bottom) or Dialog (centre) over a screen. Absolute inside a positioned parent such as PhoneFrame. */
export function Scrim({ center, className, children, ...rest }: ScrimProps) {
  return (
    <div className={cx('cl-scrim', center && 'cl-scrim--center', className)} {...rest}>
      {children}
    </div>
  );
}
