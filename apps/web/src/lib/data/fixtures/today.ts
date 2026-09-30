import type { Alert, ReviewItem } from '../types';

export const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: 'r1',
    icon: 'phone',
    title: 'Call · Sofia Alvarez · 12 min',
    sub: 'Alvarez v. Meridian · 10:12 AM',
    hours: 0.2,
    matterId: 'm1',
  },
  {
    id: 'r2',
    icon: 'calendar',
    title: 'Kessler board sync · 1h',
    sub: 'Kessler — Series B · 2:00 PM',
    hours: 1,
    matterId: 'm3',
  },
  {
    id: 'r3',
    icon: 'mic',
    title: 'Voice memo · “Bennett, point three, call with the appraiser”',
    sub: 'Transcribed on device · 0.3h suggested',
    hours: 0.3,
    matterId: 'm2',
  },
];

export const ALERTS: Alert[] = [
  {
    id: 'a1',
    icon: 'gavel',
    tone: 'info',
    title: 'Pretrial conference in 40 minutes',
    sub: 'People v. Webb · Dept. 22 · J. Whitfield',
    href: '/matters/m4',
  },
  {
    id: 'a2',
    icon: 'alert',
    tone: 'danger',
    title: 'INV-2026-078 is 46 days overdue',
    sub: 'Margaret Bennett · $8,125.00 · link opened, not paid',
    href: '/billing/invoices/i1',
  },
  {
    id: 'a3',
    icon: 'phone',
    tone: 'accent',
    title: 'New lead replied to text-back',
    sub: '(415) 555-0284 · car accident · 8:52 AM',
    href: '/inbox?item=x1',
  },
];

/** Dashboard figures that are aggregates the API will compute (Plan: money/aggregates are API only). */
export const TODAY_METRICS = {
  /** Minutes billed so far this week and today by the current user. */
  billedWeekMinutes: 1284,
  billedTodayMinutes: 204,
  weeklyGoalMinutes: 1800,
  dailyGoalMinutes: 360,
  hoursLeftThisWeek: 8.6,
  unbilledCents: { me: 2032500, firm: 4130000 },
  outstandingCents: 3312500,
  overdueCents: 812500,
  collectedMtdCents: 5890000,
  collectedDeltaPct: 12,
  daysToPaid: 6.2,
  capturedPct: 31,
  sparkUnbilled: [28, 31, 27, 33, 36, 34, 39, 41.3],
  sparkCollected: [12.4, 24.1, 30.6, 47.5, 58.9],
  /** Mon–Fri hours (Fri is the future). */
  weekHours: [7.1, 4.7, 6.3, 3.4, 0],
  timekeepersMe: [
    { name: 'Estate of Bennett', initials: 'MB', hours: 9.8, org: false },
    { name: 'Alvarez v. Meridian', initials: 'SA', hours: 6.4, org: false },
    { name: 'Kessler — Series B', initials: 'KH', hours: 5.2, org: true },
  ],
  timekeepersFirm: [
    { name: 'Dana Okafor', initials: 'DO', hours: 21.4, org: false },
    { name: 'Lisa Tran', initials: 'LT', hours: 18.2, org: false },
    { name: 'J. Whitfield', initials: 'JW', hours: 11.8, org: false },
  ],
  cashIn: { totalCents: 3475000, overdueCents: 812500, dueSoonCents: 2500000, plansCents: 162500 },
  arAging: { currentCents: 2500000, over30Cents: 812500 },
  /** Billing page aggregates (API-computed later): trust that fee agreements allow applying, payments by rail. */
  billing: {
    trustToApplyCents: 620000,
    paymentsMtd: 14,
    achPct: 71,
    achCents: 4180000,
    cardPct: 22,
    cardCents: 1300000,
    paymentPlans: 3,
  },
} as const;
