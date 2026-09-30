import { dataMode } from './env';

/**
 * The fixtures describe "Monday, September 29 2026" at 8:52 AM Pacific. The
 * real calendar has that date on a Tuesday, so while the app runs on fixtures
 * weekday names are derived from this anchor (see `weekdayOf`) and the demo
 * week runs Mon Sep 29 – Fri Oct 3 exactly as the design shows.
 */
export const DEMO_NOW = '2026-09-29T08:52:00-07:00';
export const DEMO_ANCHOR_DATE = '2026-09-29';
export const DEMO_ANCHOR_WEEKDAY = 1; // Monday
export const TIME_ZONE = 'America/Los_Angeles';

/** Current instant; pinned while the app runs on fixtures so relative labels stay truthful. */
export function now(): Date {
  return dataMode === 'mock' ? new Date(DEMO_NOW) : new Date();
}

/** Today's calendar date in the firm's time zone as `YYYY-MM-DD`. */
export function todayIso(): string {
  return toIsoDate(now());
}

export function toIsoDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const DAY_MS = 86_400_000;
const utcDay = (iso: string) =>
  Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

/** Weekday index (0 = Sunday) for an ISO date; anchored to the fixtures' calendar in mock mode. */
export function weekdayOf(iso: string): number {
  const day = iso.slice(0, 10);
  if (dataMode === 'mock') {
    const delta = Math.round((utcDay(day) - utcDay(DEMO_ANCHOR_DATE)) / DAY_MS);
    return (((DEMO_ANCHOR_WEEKDAY + delta) % 7) + 7) % 7;
  }
  return new Date(`${day}T12:00:00`).getDay();
}
