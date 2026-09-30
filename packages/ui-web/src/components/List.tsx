import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';
import type { IconName } from '../icons';

export interface ListProps extends HTMLAttributes<HTMLDivElement> {
  /** No surface, border or radius (inside a card). */
  flat?: boolean;
  /** Footer line (totals, pay-link state). */
  footer?: ReactNode;
  children?: ReactNode;
}

/** Grouped list container: surface, hairline, 12px radius. Rows go inside; never float rows as cards. */
export function List({ flat, footer, className, children, ...rest }: ListProps) {
  return (
    <div className={cx('cl-list', flat && 'cl-list--flat', className)} {...rest}>
      {children}
      {footer ? <div className="cl-list__foot">{footer}</div> : null}
    </div>
  );
}

export interface ListRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  /** Second line in ink-secondary; separate parts with `RowSep`. */
  subtitle?: ReactNode;
  /** Leading element: Checkbox, Avatar, IconWell, or a `TimeBlock`. */
  lead?: ReactNode;
  /** Trailing value in tabular figures ("$8,125.00", "1.6h"). */
  value?: ReactNode;
  /** Trailing meta under the value; tone colours it. */
  meta?: ReactNode;
  metaTone?: 'neutral' | 'warning' | 'danger';
  /** Trailing pill (rendered under the value, or alone). */
  pill?: ReactNode;
  /** Free-form trailing content (buttons). Replaces value/meta/pill. */
  trail?: ReactNode;
  chevron?: boolean;
  selected?: boolean;
  /** Hover/press affordance. */
  pressable?: boolean;
  /** Title at regular weight (tasks, time entries). */
  regular?: boolean;
  /** Struck-through title (completed task). */
  done?: boolean;
  /** Inset the separator past a leading avatar. */
  inset?: boolean;
}

/**
 * The workhorse row: optional leading element, a two-line body, a trailing
 * value/status column. 60px on mobile, 52 on web. Separators are hairlines
 * inset to the body.
 */
export function ListRow({
  title,
  subtitle,
  lead,
  value,
  meta,
  metaTone = 'neutral',
  pill,
  trail,
  chevron,
  selected,
  pressable,
  regular,
  done,
  inset,
  className,
  onClick,
  onKeyDown,
  ...rest
}: ListRowProps) {
  const hasTrail =
    trail !== undefined || value !== undefined || meta !== undefined || pill !== undefined;
  return (
    <div
      role={onClick || pressable ? 'button' : undefined}
      tabIndex={onClick || pressable ? 0 : undefined}
      className={cx(
        'cl-row',
        (pressable || onClick) && 'cl-row--pressable',
        selected && 'is-selected',
        (inset || lead) && 'cl-row--inset',
        className,
      )}
      onClick={onClick}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          !event.defaultPrevented &&
          event.target === event.currentTarget &&
          onClick &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      {...rest}
    >
      {lead ? <span className="cl-row__lead">{lead}</span> : null}
      <div className="cl-row__body">
        <div
          className={cx('cl-row__title', regular && 'cl-row__title--regular', done && 'is-done')}
        >
          {title}
        </div>
        {subtitle ? <div className="cl-row__sub">{subtitle}</div> : null}
      </div>
      {hasTrail ? (
        trail !== undefined ? (
          <div className="cl-inline cl-inline--nowrap" style={{ gap: 6 }}>
            {trail}
          </div>
        ) : (
          <div className="cl-row__trail">
            {value !== undefined ? <span className="cl-row__value">{value}</span> : null}
            {pill}
            {meta !== undefined ? (
              <span
                className={cx(
                  'cl-row__meta',
                  metaTone === 'danger' && 'is-danger',
                  metaTone === 'warning' && 'is-warning',
                )}
              >
                {meta}
              </span>
            ) : null}
          </div>
        )
      ) : null}
      {chevron ? <Icon name="chevron-right" className="cl-row__chev" /> : null}
    </div>
  );
}

/** Dot separator between subtitle parts. */
export function RowSep() {
  return <span className="sep">·</span>;
}

export interface TimeBlockProps {
  /** "9:30", "1:36". */
  main: ReactNode;
  /** "AM", "Sep 29". */
  sub?: ReactNode;
}

/** Leading time column for agenda rows and time entries. */
export function TimeBlock({ main, sub }: TimeBlockProps) {
  return (
    <span className="cl-row__time">
      {main}
      {sub ? <small>{sub}</small> : null}
    </span>
  );
}

export interface SwipeActionProps {
  label: ReactNode;
  icon?: IconName;
  tone?: 'accent' | 'success' | 'danger';
  onClick?: () => void;
}

export interface SwipeRowProps extends HTMLAttributes<HTMLDivElement> {
  /** The row. */
  children: ReactNode;
  /** Revealed actions (Timer, Done). */
  actions: SwipeActionProps[];
}

/** A row with its swipe actions revealed (static representation). */
export function SwipeRow({ children, actions, className, ...rest }: SwipeRowProps) {
  return (
    <div className={cx('cl-swipe', className)} {...rest}>
      {children}
      {actions.map((a, i) => (
        <button
          key={i}
          type="button"
          className={cx('cl-swipe__action', a.tone === 'danger' && 'cl-swipe__action--danger')}
          style={
            a.tone === 'success'
              ? { background: 'var(--success-solid)', color: 'var(--success-on)' }
              : undefined
          }
          onClick={a.onClick}
        >
          {a.icon ? <Icon name={a.icon} /> : null}
          {a.label}
        </button>
      ))}
    </div>
  );
}
