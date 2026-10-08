import { randomUUID } from 'node:crypto';
import { ApiError } from '@lawfirm/api-client';
import { expect, it } from 'vitest';
import { loadStaffShell } from './staff-shell';
const userId = randomUUID(),
  firmId = randomUUID();
const context = {
  userId,
  firmId,
  email: 'staff@example.test',
  role: 'readonly' as const,
  capabilities: ['firm.profile.read' as const],
};
const firm = { id: firmId, name: 'Authorized workspace', revision: 1, canRename: false };
it('renders shell identity from authorized records and never a fixture owner/rate', async () => {
  await expect(
    loadStaffShell({ staffContext: async () => context, firm: async () => firm }, userId, firmId),
  ).resolves.toEqual({ kind: 'available', firm, context });
});
it('rejects mismatched account/firm metadata and replaces revoked access with a denied state', async () => {
  for (const other of [
    { ...context, userId: randomUUID() },
    { ...context, firmId: randomUUID() },
  ])
    await expect(
      loadStaffShell({ staffContext: async () => other, firm: async () => firm }, userId, firmId),
    ).rejects.toThrow();
  await expect(
    loadStaffShell(
      { staffContext: async () => context, firm: async () => ({ ...firm, id: randomUUID() }) },
      userId,
      firmId,
    ),
  ).rejects.toThrow();
  await expect(
    loadStaffShell(
      {
        staffContext: async () => {
          throw new ApiError(403, 'FIRM_ACCESS_DENIED', 'Denied');
        },
        firm: async () => firm,
      },
      userId,
      firmId,
    ),
  ).resolves.toEqual({ kind: 'denied' });
});
