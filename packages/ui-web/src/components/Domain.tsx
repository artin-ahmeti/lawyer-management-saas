import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';
import { IconWell } from './Icon';
import type { IconName } from '../icons';

export interface TimerBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Matter name. */
  title: ReactNode;
  /** What is being done. */
  subtitle?: ReactNode;
  /** "00:42:17". */
  time: ReactNode;
  paused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
}

/** The docked running-timer bar: pulsing dot, matter, mono time, pause and stop. Sits above the TabBar on every screen while a timer runs. */
export function TimerBar({
  title,
  subtitle,
  time,
  paused,
  onPause,
  onResume,
  onStop,
  className,
  ...rest
}: TimerBarProps) {
  return (
    <div className={cx('cl-timerbar', paused && 'is-paused', className)} {...rest}>
      <span className="cl-timerbar__dot" />
      <div className="cl-timerbar__body">
        <div className="cl-timerbar__title">{title}</div>
        {subtitle ? <div className="cl-timerbar__sub">{subtitle}</div> : null}
      </div>
      <span className="cl-timerbar__time">{time}</span>
      {paused ? (
        <button
          type="button"
          className="cl-btn cl-btn--primary cl-btn--icon"
          aria-label="Resume"
          onClick={onResume}
        >
          <Icon name="play" />
        </button>
      ) : (
        <>
          <button
            type="button"
            className="cl-btn cl-btn--secondary cl-btn--icon"
            aria-label="Pause"
            onClick={onPause}
          >
            <Icon name="pause" />
          </button>
          <button
            type="button"
            className="cl-btn cl-btn--primary cl-btn--icon"
            aria-label="Stop"
            onClick={onStop}
          >
            <Icon name="stop" />
          </button>
        </>
      )}
    </div>
  );
}

export interface TimerHeroProps extends HTMLAttributes<HTMLDivElement> {
  /** "00:42:17"; leading zero groups are dimmed automatically. */
  time: string;
  caption?: ReactNode;
}

/** Large mono timer for the Start-timer flow. */
export function TimerHero({ time, caption, className, ...rest }: TimerHeroProps) {
  const m = /^((?:00:)+)(.*)$/.exec(time);
  return (
    <div className={cx('cl-timer-hero', className)} {...rest}>
      <div className="cl-timer-hero__digits">
        {m ? (
          <>
            <span className="dim">{m[1]}</span>
            {m[2]}
          </>
        ) : (
          time
        )}
      </div>
      {caption ? <span className="cl-t-label cl-muted">{caption}</span> : null}
    </div>
  );
}

export interface CaptureItem {
  key: string;
  label: ReactNode;
  icon: IconName;
  /** Accent well for the three time actions. */
  accent?: boolean;
  onClick?: () => void;
}

export interface CaptureGridProps extends HTMLAttributes<HTMLDivElement> {
  items?: CaptureItem[];
}

const DEFAULT_CAPTURE: CaptureItem[] = [
  { key: 'timer', label: 'Start timer', icon: 'play', accent: true },
  { key: 'voice', label: 'Voice memo', icon: 'mic', accent: true },
  { key: 'time', label: 'Log time', icon: 'clock', accent: true },
  { key: 'expense', label: 'Expense', icon: 'camera' },
  { key: 'task', label: 'Task', icon: 'check' },
  { key: 'note', label: 'Note', icon: 'pen' },
];

/** The 3×2 Capture grid: Start timer, Voice memo, Log time (accent), Expense, Task, Note. Lives in the Capture sheet. */
export function CaptureGrid({ items = DEFAULT_CAPTURE, className, ...rest }: CaptureGridProps) {
  return (
    <div className={cx('cl-capture', className)} {...rest}>
      {items.map((it) => (
        <button key={it.key} type="button" className="cl-capture__item" onClick={it.onClick}>
          <IconWell name={it.icon} tone={it.accent ? 'accent' : 'neutral'} size="lg" />
          {it.label}
        </button>
      ))}
    </div>
  );
}

export interface BarDatum {
  label: ReactNode;
  /** Value in the chart's unit (hours). */
  value: number;
  /** Highlight as today. */
  today?: boolean;
  /** Render as an empty future slot. */
  future?: boolean;
}

export interface MiniBarsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  /** Right-aligned total. */
  total?: ReactNode;
  bars: BarDatum[];
  /** Axis maximum; defaults to the largest value. */
  max?: number;
  /** Dashed goal line with its label. */
  goal?: number;
  goalLabel?: ReactNode;
  /** Print each value above its bar. */
  showValues?: boolean;
}

/** Single-series bar chart (hours per day vs a goal). Thin bars, rounded tops, one dashed goal line, tabular labels. */
export function MiniBars({
  title,
  total,
  bars,
  max,
  goal,
  goalLabel,
  showValues = true,
  className,
  ...rest
}: MiniBarsProps) {
  const top = max ?? (Math.max(goal ?? 0, ...bars.map((b) => b.value)) || 1);
  return (
    <div className={cx('cl-chart', className)} {...rest}>
      {title || total ? (
        <div className="cl-chart__title">
          <span>{title}</span>
          {total !== undefined ? (
            <span className="cl-num" style={{ color: 'var(--ink)' }}>
              {total}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="cl-bars">
        {goal !== undefined ? (
          <div className="cl-bars__goal" style={{ bottom: `${(goal / top) * 100}%` }}>
            <span>{goalLabel}</span>
          </div>
        ) : null}
        {bars.map((b, i) => (
          <div
            key={i}
            className={cx('cl-bars__bar', b.today && 'is-today', b.future && 'is-future')}
            style={{ height: b.future ? 2 : `${(b.value / top) * 100}%` }}
          >
            {showValues && !b.future ? <span>{b.value}</span> : null}
          </div>
        ))}
      </div>
      <div className="cl-bars__labels">
        {bars.map((b, i) => (
          <span key={i}>{b.label}</span>
        ))}
      </div>
    </div>
  );
}

export interface StackSegment {
  label: ReactNode;
  value: number;
  /** Sequential step 1–6 (light → dark). */
  step?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Formatted value for the legend. */
  display?: ReactNode;
}

export interface StackedBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  total?: ReactNode;
  segments: StackSegment[];
}

/** One-hue stacked bar for magnitude (AR aging) with a legend. 2px gaps between segments. */
export function StackedBar({ title, total, segments, className, ...rest }: StackedBarProps) {
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className={cx('cl-chart', className)} {...rest}>
      {title || total ? (
        <div className="cl-chart__title">
          <span>{title}</span>
          {total !== undefined ? (
            <span className="cl-num" style={{ color: 'var(--ink)' }}>
              {total}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="cl-stackbar">
        {segments.map((s, i) => (
          <span
            key={i}
            style={{
              width: `${(s.value / sum) * 100}%`,
              background: `var(--chart-seq-${s.step ?? Math.min(6, i + 2)})`,
            }}
          />
        ))}
      </div>
      <div className="cl-legend">
        {segments.map((s, i) => (
          <span key={i}>
            <i style={{ background: `var(--chart-seq-${s.step ?? Math.min(6, i + 2)})` }} />
            {s.label}
            {s.display !== undefined ? <b>{s.display}</b> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface SparklineProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  points: number[];
}

/** Accent sparkline with an emphasised endpoint. */
export function Sparkline({ title, points, className, ...rest }: SparklineProps) {
  const w = 300;
  const h = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map(
    (p, i) =>
      [
        points.length > 1 ? (i / (points.length - 1)) * w : 0,
        h - 4 - ((p - min) / span) * (h - 8),
      ] as const,
  );
  const d = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const last = coords[coords.length - 1];
  return (
    <div className={cx('cl-chart', className)} {...rest}>
      {title ? (
        <div className="cl-chart__title">
          <span>{title}</span>
        </div>
      ) : null}
      <svg
        className="cl-spark"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {last ? <circle cx={last[0]} cy={last[1]} r={3} fill="var(--accent)" /> : null}
      </svg>
    </div>
  );
}
