import type { CalendarEvent } from '../types';

/** The week of Mon Sep 29 – Fri Oct 3, 2026 (Pacific). */
export const EVENTS: CalendarEvent[] = [
  {
    id: 'e1',
    startsAt: '2026-09-29T09:30:00-07:00',
    durationMin: 60,
    title: 'Pretrial conference · People v. Webb',
    sub: 'Dept. 22, SF Superior · J. Whitfield',
    kind: 'Court',
    tone: 'info',
    dot: false,
    matterId: 'm4',
  },
  {
    id: 'e2',
    startsAt: '2026-09-29T14:00:00-07:00',
    durationMin: 60,
    title: 'Kessler board sync',
    sub: 'Zoom · Kessler — Series B',
    kind: 'Meeting',
    tone: 'neutral',
    dot: false,
    matterId: 'm3',
  },
  {
    id: 'e3',
    startsAt: '2026-09-29T17:00:00-07:00',
    durationMin: 30,
    title: 'Inventory filing deadline · Estate of Bennett',
    sub: 'Prob. Code §8800 · L. Tran',
    kind: 'Deadline',
    tone: 'danger',
    dot: true,
    matterId: 'm2',
  },
  {
    id: 'e4',
    startsAt: '2026-09-30T11:00:00-07:00',
    durationMin: 60,
    title: 'Appraiser call · Dr. Patel',
    sub: 'Estate of Bennett · phone',
    kind: 'Call',
    tone: 'neutral',
    dot: false,
    matterId: 'm2',
  },
  {
    id: 'e5',
    startsAt: '2026-10-01T10:00:00-07:00',
    durationMin: 90,
    title: 'Deposition · Meridian safety manager',
    sub: 'Alvarez v. Meridian · 1 Market St',
    kind: 'Deposition',
    tone: 'info',
    dot: false,
    matterId: 'm1',
  },
  {
    id: 'e6',
    startsAt: '2026-10-02T09:00:00-07:00',
    durationMin: 60,
    title: 'Trust notice · Alvarez (Rule 1.15)',
    sub: '14-day notice · funds received Sep 18',
    kind: 'Deadline',
    tone: 'warning',
    dot: true,
    matterId: 'm1',
  },
  {
    id: 'e7',
    startsAt: '2026-10-02T15:00:00-07:00',
    durationMin: 60,
    title: 'Consult · Priya Natarajan',
    sub: 'Immigration · J. Whitfield',
    kind: 'Consult',
    tone: 'neutral',
    dot: false,
    matterId: 'm7',
  },
  {
    id: 'e8',
    startsAt: '2026-10-03T09:00:00-07:00',
    durationMin: 60,
    title: 'Inventory filing · Estate of Bennett',
    sub: 'Probate Dept. 204 · L. Tran',
    kind: 'Court',
    tone: 'info',
    dot: false,
    matterId: 'm2',
  },
  {
    id: 'e9',
    startsAt: '2026-10-03T13:00:00-07:00',
    durationMin: 120,
    title: 'Definitive agreement drafting block',
    sub: 'Kessler — Series B',
    kind: 'Focus',
    tone: 'neutral',
    dot: false,
    matterId: 'm3',
  },
];

export interface DeadlineItem {
  id: string;
  title: string;
  sub: string;
  date: string;
  tone: 'neutral' | 'warning' | 'danger';
  matterId: string;
}

/** Docket items surfaced on Today ("next 14 days"). */
export const DEADLINES: DeadlineItem[] = [
  {
    id: 'd1',
    title: 'Inventory filing · Estate of Bennett',
    sub: 'Prob. Code §8800',
    date: '2026-10-03',
    tone: 'warning',
    matterId: 'm2',
  },
  {
    id: 'd2',
    title: '14-day trust notice · Alvarez',
    sub: 'Rule 1.15 · funds received Sep 18',
    date: '2026-10-02',
    tone: 'warning',
    matterId: 'm1',
  },
  {
    id: 'd3',
    title: 'RFE response window · Okonkwo',
    sub: 'USCIS · 87 days',
    date: '2026-10-11',
    tone: 'neutral',
    matterId: 'm7',
  },
];
