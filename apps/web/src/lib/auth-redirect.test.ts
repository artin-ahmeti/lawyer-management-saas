import { describe, expect, it } from 'vitest';
import { safeNext } from './auth-redirect';

describe('authentication return paths', () => {
  it('preserves local routes and their query parameters', () => {
    expect(safeNext('/matters/m2?tab=Billing')).toBe('/matters/m2?tab=Billing');
    expect(safeNext('/update-password')).toBe('/update-password');
  });
  it('rejects external destinations, browser slash normalization, and auth loops', () => {
    for (const path of [
      'https://example.com',
      '//example.com',
      '/\\example.com',
      '/\n/example.com',
      '/sign-in?next=/today',
      '/auth/callback',
    ]) {
      expect(safeNext(path)).toBe('/today');
    }
    expect(safeNext(null)).toBe('/today');
  });
});
