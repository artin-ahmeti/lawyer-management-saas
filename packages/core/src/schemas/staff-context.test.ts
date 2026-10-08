import { expect, it } from 'vitest';
import { staffContextSchema } from './staff-context.js';
const id = '00000000-0000-4000-a000-000000000001';
it('pairs current firm and role, bounds supported capabilities and excludes credential data', () => {
  expect(staffContextSchema.parse({ userId: id, capabilities: [] })).toEqual({
    userId: id,
    capabilities: [],
  });
  const current = { userId: id, firmId: id, role: 'readonly', capabilities: ['firm.profile.read'] };
  expect(staffContextSchema.parse(current)).toEqual(current);
  for (const bad of [
    { ...current, role: undefined },
    { ...current, firmId: undefined },
    { ...current, role: 'client' },
    { ...current, capabilities: ['financial.all'] },
    { ...current, capabilities: ['firm.profile.read', 'firm.profile.read'] },
    { ...current, accessToken: 'secret' },
    { userId: id, capabilities: ['firm.profile.rename'] },
  ])
    expect(staffContextSchema.safeParse(bad).success).toBe(false);
});
