import { describe, expect, it } from 'vitest';
import {
  clock,
  daysLate,
  dueLabel,
  fmtDate,
  fmtDateWeekday,
  fmtTime,
  hours,
  money,
  moneyShort,
  roundedHours,
  whenLabel,
} from './format';

describe('money', () => {
  it('always carries cents in copy and drops them on tiles', () => {
    expect(money(812500)).toBe('$8,125.00');
    expect(moneyShort(1732500)).toBe('$17,325');
    expect(money(0)).toBe('$0.00');
  });
});

describe('time', () => {
  it('renders minutes as tenths of an hour and seconds as a clock', () => {
    expect(hours(96)).toBe('1.6h');
    expect(clock(42 * 60 + 17)).toBe('00:42:17');
    expect(roundedHours(7)).toBe(0.2);
  });
});

describe('dates (pinned to Mon 2026-09-29, Pacific)', () => {
  it('formats calendar days without time-zone drift', () => {
    expect(fmtDate('2026-10-03')).toBe('Oct 3');
    expect(fmtDateWeekday('2026-10-03')).toBe('Fri, Oct 3');
    expect(fmtTime('2026-09-29T09:30:00-07:00')).toEqual({ time: '9:30', ampm: 'AM' });
  });
  it('labels due dates relative to today', () => {
    expect(dueLabel('2026-09-29')).toBe('Today');
    expect(dueLabel('2026-09-30')).toBe('Tomorrow');
    expect(dueLabel('2026-10-03')).toBe('4 days');
    expect(dueLabel('2026-09-26')).toBe('Sep 26');
    expect(whenLabel('2026-10-03')).toBe('Fri Oct 3');
    expect(daysLate('2026-08-14')).toBe(46);
  });
});
