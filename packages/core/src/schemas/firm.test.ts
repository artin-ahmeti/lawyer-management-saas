import { describe, expect, it } from 'vitest';
import { renameFirmSchema } from './firm.js';

describe('firm rename contract', () => {
  it('normalizes a firm name while retaining the confirmed revision', () => {
    expect(renameFirmSchema.parse({ name: '  Example LLP  ', expectedRevision: 3 })).toEqual({
      name: 'Example LLP',
      expectedRevision: 3,
    });
  });

  it.each([
    { name: '   ', expectedRevision: 0 },
    { name: 'a'.repeat(201), expectedRevision: 0 },
    { name: 'Bad\0name', expectedRevision: 0 },
    { name: 'Example', expectedRevision: -1 },
    { name: 'Example', expectedRevision: 0.5 },
    { name: 'Example', expectedRevision: 0, firmId: 'another-firm' },
    { name: 'Example', expectedRevision: 0, role: 'owner' },
  ])('rejects an invalid or authority-bearing payload: %j', (input) => {
    expect(renameFirmSchema.safeParse(input).success).toBe(false);
  });
});
