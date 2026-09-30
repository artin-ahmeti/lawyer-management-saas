/**
 * The week the fixtures describe: Mon Sep 29 – Fri Oct 3, 2026. The app clock
 * is pinned to Sep 29 (`@/lib/clock`), which the design treats as a Monday, so
 * the columns are listed here rather than derived from the real weekday.
 */
export const WEEK_DAYS: { name: string; date: string }[] = [
  { name: 'Mon', date: '2026-09-29' },
  { name: 'Tue', date: '2026-09-30' },
  { name: 'Wed', date: '2026-10-01' },
  { name: 'Thu', date: '2026-10-02' },
  { name: 'Fri', date: '2026-10-03' },
];

/** Visible day: 8 AM to 5 PM in ten 56px rows. */
export const DAY_START_HOUR = 8;
export const HOURS: number[] = Array.from({ length: 10 }, (_, i) => DAY_START_HOUR + i);
export const HOUR_PX = 56;

/** Event block colours by tone: background, ink, left bar. */
export const EVENT_TONES: Record<
  'neutral' | 'info' | 'warning' | 'danger',
  { bg: string; ink: string; bar: string }
> = {
  info: { bg: 'var(--info-bg)', ink: 'var(--info-ink)', bar: 'var(--info-dot)' },
  danger: { bg: 'var(--danger-bg)', ink: 'var(--danger-ink)', bar: 'var(--danger-dot)' },
  warning: { bg: 'var(--warning-bg)', ink: 'var(--warning-ink)', bar: 'var(--warning-dot)' },
  neutral: { bg: 'var(--surface-2)', ink: 'var(--ink)', bar: 'var(--border-strong)' },
};

/** "8 AM", "12 PM", "5 PM". */
export const hourLabel = (h: number): string => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
