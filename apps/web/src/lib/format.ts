import { formatCents } from '@lawfirm/core';
import { TIME_ZONE, todayIso, weekdayOf } from './clock';

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const wholeDollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** "$8,125.00" — every amount in copy and tables carries cents. */
export const money = (cents: number): string => formatCents(Math.round(cents));
/** "$17,325" — KPI tiles drop the cents. */
export const moneyShort = (cents: number): string => wholeDollars.format(Math.round(cents) / 100);
/** Money or an em dash when the value does not apply (contingency, flat fee). */
export const moneyOrDash = (cents: number | null, short = false): string =>
  cents === null ? '—' : short ? moneyShort(cents) : money(cents);

/** Minutes → "1.6h". */
export const hours = (minutes: number, suffix = 'h'): string =>
  `${(minutes / 60).toFixed(1)}${suffix}`;
/** Decimal hours → "1.6h". */
export const hoursFromDecimal = (h: number, suffix = 'h'): string => `${h.toFixed(1)}${suffix}`;
/** Minutes → "1:36" (stepper display). */
export const hoursMinutes = (minutes: number): string =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
/** Seconds → "00:42:17". */
export const clock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
};
/** Round up to the next tenth of an hour (firm rounding rule). */
export const roundedHours = (minutes: number): number => Math.ceil(minutes / 6) / 10;

/** Parse an ISO date (`YYYY-MM-DD`) at noon in the firm's zone so the calendar day never shifts. */
export function parseIsoDate(iso: string): Date {
  if (iso.length > 10) return new Date(iso);
  return new Date(`${iso}T12:00:00-07:00`);
}

const dateFmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, ...options });

/** "Sep 29" */
export const fmtDate = (iso: string): string =>
  dateFmt({ month: 'short', day: 'numeric' }).format(parseIsoDate(iso));
/** "Fri" — weekday name (anchored to the fixtures' calendar while on mock data). */
export const fmtWeekday = (iso: string): string => WEEKDAYS_SHORT[weekdayOf(iso)] ?? '';
/** "Fri, Oct 3" */
export const fmtDateWeekday = (iso: string): string => `${fmtWeekday(iso)}, ${fmtDate(iso)}`;
/** "Monday, September 29" */
export const fmtDateLong = (iso: string): string =>
  `${WEEKDAYS_LONG[weekdayOf(iso)] ?? ''}, ${dateFmt({ month: 'long', day: 'numeric' }).format(parseIsoDate(iso))}`;
/** "Oct 12, 2027" */
export const fmtDateYear = (iso: string): string =>
  dateFmt({ month: 'short', day: 'numeric', year: 'numeric' }).format(parseIsoDate(iso));
/** { time: "9:30", ampm: "AM" } */
export function fmtTime(isoDateTime: string): { time: string; ampm: string } {
  const parts = dateFmt({ hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(
    new Date(isoDateTime),
  );
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { time: `${get('hour')}:${get('minute')}`, ampm: get('dayPeriod').toUpperCase() };
}
/** "9:30 AM" */
export const fmtClockTime = (isoDateTime: string): string => {
  const { time, ampm } = fmtTime(isoDateTime);
  return `${time} ${ampm}`;
};

const DAY_MS = 86_400_000;
/** Whole days from today to `iso` (negative when past). */
export function daysFromToday(iso: string): number {
  const a = parseIsoDate(todayIso()).getTime();
  const b = parseIsoDate(iso.slice(0, 10)).getTime();
  return Math.round((b - a) / DAY_MS);
}
/** "Today" · "Tomorrow" · "4 days" · "Sep 26" */
export function dueLabel(iso: string): string {
  const d = daysFromToday(iso);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d > 1 && d <= 14) return `${d} days`;
  return fmtDate(iso);
}
/** "Today" · "Fri Oct 3" */
export function whenLabel(iso: string): string {
  const d = daysFromToday(iso);
  if (d === 0) return 'Today';
  return fmtDateWeekday(iso).replace(',', '');
}
/** Days an invoice is past due, 0 when not. */
export const daysLate = (dueIso: string): number => Math.max(0, -daysFromToday(dueIso));

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const plural = (n: number, one: string, many = `${one}s`): string =>
  `${n} ${n === 1 ? one : many}`;
