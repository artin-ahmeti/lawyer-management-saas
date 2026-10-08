import { expect, it } from 'vitest';
import { provisionFirmSchema, provisionFirmResultSchema } from './firm-provision.js';
it('validates initial firm creation without accepting a role, price or jurisdiction assumption', () => {
  expect(provisionFirmSchema.parse({ name: ' First firm ' })).toEqual({ name: 'First firm' });
  for (const input of [
    { name: ' ' },
    { name: 'a'.repeat(201) },
    { name: '\0' },
    { name: 'Firm', role: 'owner' },
    { name: 'Firm', state: 'CA' },
  ])
    expect(provisionFirmSchema.safeParse(input).success).toBe(false);
  const id = '00000000-0000-4000-a000-000000000001';
  expect(
    provisionFirmResultSchema.parse({ firmId: id, commandId: id, requiresSessionRefresh: true }),
  ).toBeDefined();
  expect(
    provisionFirmResultSchema.safeParse({ firmId: id, commandId: id, role: 'owner' }).success,
  ).toBe(false);
});
