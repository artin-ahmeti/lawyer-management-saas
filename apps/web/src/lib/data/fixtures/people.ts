import type { Timekeeper } from '../types';

export const TIMEKEEPERS: Timekeeper[] = [
  {
    id: 'do',
    name: 'Dana Okafor',
    short: 'D. Okafor',
    initials: 'DO',
    email: 'dana@tranokafor.law',
    role: 'Owner · Attorney',
    rateCents: 42500,
    panelRateCents: 35000,
    proBonoRateCents: 0,
    twoFactor: true,
    lastActive: 'now',
    isCurrentUser: true,
  },
  {
    id: 'lt',
    name: 'Lisa Tran',
    short: 'L. Tran',
    initials: 'LT',
    email: 'lisa@tranokafor.law',
    role: 'Partner · Attorney',
    rateCents: 32500,
    panelRateCents: 28500,
    proBonoRateCents: 0,
    twoFactor: true,
    lastActive: '12 min ago',
  },
  {
    id: 'jw',
    name: 'J. Whitfield',
    short: 'J. Whitfield',
    initials: 'JW',
    email: 'j.whitfield@tranokafor.law',
    role: 'Attorney',
    rateCents: 30000,
    panelRateCents: 26000,
    proBonoRateCents: 0,
    twoFactor: true,
    lastActive: 'in court',
  },
];

export const CURRENT_USER = TIMEKEEPERS[0]!;
