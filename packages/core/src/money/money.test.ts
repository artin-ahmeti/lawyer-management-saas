import { describe, expect, it } from 'vitest';
import { addCents, formatCents, multiplyCents } from './money.js';

describe('money', () => {
  it('adds integer cents', () => {
    expect(addCents(1050, 25)).toBe(1075);
  });

  it('rejects non-integer amounts', () => {
    expect(() => addCents(10.5, 1)).toThrow(TypeError);
  });

  it('rounds half-up when applying a rate factor', () => {
    // 1.5h at $250/h → 37500 cents
    expect(multiplyCents(25000, 1.5)).toBe(37500);
  });

  it('formats as USD by default', () => {
    expect(formatCents(123456)).toBe('$1,234.56');
  });
});
