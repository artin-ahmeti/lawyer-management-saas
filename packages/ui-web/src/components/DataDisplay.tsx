import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';
import type { IconName } from '../icons';

export type PillTone =
  'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'ink' | 'outline';

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  /** neutral (draft, closed) · accent (open, in progress) · success (paid, done) · warning (due ≤7d, partial) · danger (overdue, missed) · info (court, sync) · ink (the current user's filter) · outline (attributes: Hourly, Flat fee). */
  tone?: PillTone;
  /** Add the dot when the pill is the only status marker in a row. */
  dot?: boolean;
  icon?: IconName;
  size?: 'md' | 'lg';
  children?: ReactNode;
}

/** 24px status pill, sentence case, tinted background. Describes state, never acts. */
export function Pill({
  tone = 'neutral',
  dot,
  icon,
  size = 'md',
  className,
  children,
  ...rest
}: PillProps) {
  return (
    <span
      className={cx(
        'cl-pill',
        tone !== 'neutral' && `cl-pill--${tone}`,
        size === 'lg' && 'cl-pill--lg',
        className,
      )}
      {...rest}
    >
      {dot ? <span className="cl-pill__dot" /> : null}
      {icon ? <Icon name={icon} /> : null}
      {children}
    </span>
  );
}

export interface DotProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
}

/** 8px status dot. */
export function Dot({ tone = 'neutral', className, ...rest }: DotProps) {
  return (
    <span className={cx('cl-dot', tone !== 'neutral' && `cl-dot--${tone}`, className)} {...rest} />
  );
}

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Full name; initials are derived. */
  name?: string;
  /** Explicit initials (overrides `name`). */
  initials?: string;
  size?: AvatarSize;
  /** People are round, organisations are squared. */
  kind?: 'person' | 'org';
  /** `accent` marks the signed-in user, `ink` marks a count in a stack. */
  tone?: 'default' | 'accent' | 'ink';
  /** Icon instead of initials (building for an organisation). */
  icon?: IconName;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Initials on a tonal surface; xs 24 · sm 28 · md 36 · lg 48 · xl 64. */
export function Avatar({
  name,
  initials,
  size = 'md',
  kind = 'person',
  tone = 'default',
  icon,
  className,
  ...rest
}: AvatarProps) {
  return (
    <span
      className={cx(
        'cl-avatar',
        size !== 'md' && `cl-avatar--${size}`,
        kind === 'org' && 'cl-avatar--org',
        tone !== 'default' && `cl-avatar--${tone}`,
        className,
      )}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : (initials ?? (name ? initialsOf(name) : ''))}
    </span>
  );
}

export interface AvatarStackProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
}

/** Overlapping avatars; end with an `ink` avatar holding "+N". */
export function AvatarStack({ className, children, ...rest }: AvatarStackProps) {
  return (
    <span className={cx('cl-avatar-stack', className)} {...rest}>
      {children}
    </span>
  );
}

export interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  count?: number | string;
  /** Right-aligned action label ("See all", "Add"). */
  action?: ReactNode;
  onAction?: () => void;
}

/** Section title with an optional count and a right-aligned action. */
export function SectionHeader({
  title,
  count,
  action,
  onAction,
  className,
  ...rest
}: SectionHeaderProps) {
  return (
    <div className={cx('cl-section', className)} {...rest}>
      <span className="cl-section__title">
        {title}
        {count !== undefined ? <span className="cl-section__count">{count}</span> : null}
      </span>
      {action ? (
        <button type="button" className="cl-section__action" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

export type CardTone = 'default' | 'tint' | 'ink' | 'raised' | 'warning' | 'danger';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right side of the header: a pill, a link, a button. */
  headerAction?: ReactNode;
  /** Leading element in the header (an IconWell). */
  headerLead?: ReactNode;
  tone?: CardTone;
  /** No padding; children manage their own (lists inside cards). */
  flush?: boolean;
  /** Footer row of buttons. */
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * A card marks the one thing that isn't a list item: the running timer,
 * Review your day, a deadline, a trust warning. Lists live in `List`, not in
 * cards.
 */
export function Card({
  title,
  subtitle,
  headerAction,
  headerLead,
  tone = 'default',
  flush,
  footer,
  className,
  children,
  ...rest
}: CardProps) {
  const hasHead = title || subtitle || headerAction || headerLead;
  return (
    <div
      className={cx(
        'cl-card',
        tone !== 'default' && `cl-card--${tone}`,
        flush && 'cl-card--flush',
        className,
      )}
      {...rest}
    >
      {hasHead ? (
        <div className="cl-card__head">
          <div className="cl-inline" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
            {headerLead}
            <div style={{ minWidth: 0 }}>
              {title ? <div className="cl-card__title">{title}</div> : null}
              {subtitle ? <div className="cl-card__sub">{subtitle}</div> : null}
            </div>
          </div>
          {headerAction}
        </div>
      ) : null}
      {children}
      {footer ? <div className="cl-card__foot">{footer}</div> : null}
    </div>
  );
}

export interface KpiTileProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  /** Tabular value, e.g. "$17,325" or "3.4". */
  value: ReactNode;
  /** Smaller secondary unit after the value ("of 6h", "%"). */
  unit?: ReactNode;
  /** Delta or hint line. */
  delta?: ReactNode;
  /** Colours the delta: up = success, down = danger. */
  deltaTone?: 'neutral' | 'up' | 'down';
  deltaIcon?: IconName;
  /** 0–100 progress bar under the value. */
  progress?: number;
  /** Accent-tinted: reserved for the one number the screen exists to move. */
  tint?: boolean;
}

/** KPI tile: label, tabular value, one delta. At most two per mobile screen, four per web page. */
export function KpiTile({
  label,
  value,
  unit,
  delta,
  deltaTone = 'neutral',
  deltaIcon,
  progress,
  tint,
  className,
  ...rest
}: KpiTileProps) {
  return (
    <div className={cx('cl-kpi', tint && 'cl-kpi--tint', className)} {...rest}>
      <span className="cl-kpi__label">{label}</span>
      <span className="cl-kpi__value">
        {value}
        {unit ? <small>{unit}</small> : null}
      </span>
      {delta ? (
        <span
          className={cx(
            'cl-kpi__delta',
            deltaTone === 'up' && 'is-up',
            deltaTone === 'down' && 'is-down',
          )}
        >
          {deltaIcon ? <Icon name={deltaIcon} /> : null}
          {delta}
        </span>
      ) : null}
      {progress !== undefined ? (
        <div className="cl-progress">
          <div
            className="cl-progress__bar"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export interface KpiRowProps extends HTMLAttributes<HTMLDivElement> {
  /** 2 (mobile) or 4 (web) columns. */
  columns?: 2 | 3 | 4;
  children?: ReactNode;
}

/** Grid for KPI tiles. */
export function KpiRow({ columns = 2, className, children, ...rest }: KpiRowProps) {
  return (
    <div className={cx(columns === 2 ? 'cl-kpi-row' : `cl-grid-${columns}`, className)} {...rest}>
      {children}
    </div>
  );
}

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  /** 0–100. */
  value: number;
}

/** 4px progress bar. */
export function ProgressBar({ value, className, ...rest }: ProgressBarProps) {
  return (
    <div className={cx('cl-progress', className)} {...rest}>
      <div
        className="cl-progress__bar"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export interface KeyValueItem {
  label: ReactNode;
  value: ReactNode;
}

export interface KeyValueProps extends HTMLAttributes<HTMLDListElement> {
  items: KeyValueItem[];
}

/** Label/value pairs in two columns (invoice facts, trust details). */
export function KeyValue({ items, className, ...rest }: KeyValueProps) {
  return (
    <dl className={cx('cl-kv', className)} {...rest}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{it.label}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface StageItem {
  label: ReactNode;
  state?: 'done' | 'current' | 'upcoming';
  /** Client variant only: the "Next: …" sentence under the current stage. */
  next?: ReactNode;
}

export interface StageTrackerProps extends HTMLAttributes<HTMLDivElement> {
  stages: StageItem[];
  /** `staff` is horizontal with short labels; `client` is vertical, plain language, with a dated next step. */
  variant?: 'staff' | 'client';
}

/** Where a matter is in its playbook. Stages come from the practice playbook, so probate, PI, family and immigration render the same way. */
export function StageTracker({ stages, variant = 'staff', className, ...rest }: StageTrackerProps) {
  return (
    <div
      className={cx('cl-stages', variant === 'client' && 'cl-stages--client', className)}
      {...rest}
    >
      {stages.map((s, i) => (
        <div
          key={i}
          className={cx(
            'cl-stage',
            s.state === 'done' && 'is-done',
            s.state === 'current' && 'is-current',
          )}
        >
          <span className="cl-stage__dot" />
          <span className="cl-stage__label">
            {s.label}
            {s.next ? <span className="cl-stage__next">{s.next}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

export interface TimelineEvent {
  title: ReactNode;
  meta?: ReactNode;
  icon?: IconName;
  /** `accent` for money events. */
  tone?: 'default' | 'accent';
  /** Quoted message body. */
  quote?: ReactNode;
}

export interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  events: TimelineEvent[];
}

/** Vertical activity feed: actor, action, object and time; money events use the accent well. */
export function Timeline({ events, className, ...rest }: TimelineProps) {
  return (
    <div className={cx('cl-timeline', className)} {...rest}>
      {events.map((e, i) => (
        <div key={i} className="cl-event">
          <span className={cx('cl-event__icon', e.tone === 'accent' && 'cl-event__icon--accent')}>
            <Icon name={e.icon ?? 'check'} />
          </span>
          <div className="cl-event__body">
            <div className="cl-event__title">{e.title}</div>
            {e.meta ? <div className="cl-event__meta">{e.meta}</div> : null}
            {e.quote ? <div className="cl-event__quote">{e.quote}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: IconName;
  title: ReactNode;
  /** One sentence: what will appear here and how. */
  text?: ReactNode;
  action?: ReactNode;
  /** title-2 for first-run moments ("Your first matter."). */
  large?: boolean;
}

/** Icon in a tonal circle, a title, one sentence, at most one action. */
export function EmptyState({
  icon,
  title,
  text,
  action,
  large,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div className={cx('cl-empty', className)} {...rest}>
      {icon ? (
        <span className="cl-empty__icon">
          <Icon name={icon} size="lg" />
        </span>
      ) : null}
      <div className={cx('cl-empty__title', large && 'cl-t-title-2')}>{title}</div>
      {text ? <div className="cl-empty__text">{text}</div> : null}
      {action}
    </div>
  );
}

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
}

/** Shimmering placeholder block. */
export function Skeleton({
  width = '100%',
  height = 12,
  circle,
  className,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <span
      className={cx('cl-skel', circle && 'cl-skel--circle', className)}
      style={{ width, height, ...style }}
      {...rest}
    />
  );
}

/** Skeleton shaped like a list row (avatar, two lines, trailing block). */
export function SkeletonRow() {
  return (
    <div className="cl-row">
      <Skeleton width={36} height={36} circle />
      <div className="cl-row__body" style={{ gap: 8 }}>
        <Skeleton width="70%" />
        <Skeleton width="45%" height={10} />
      </div>
      <Skeleton width={56} />
    </div>
  );
}
