import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { createApiClient } from '@lawfirm/api-client';
import { loadFirmStaff, prepareStaffRoleChange, submitStaffRoleChange } from './staff-roles';
const firm = randomUUID(),
  user = randomUUID();
it('rejects an access roster from another firm', async () => {
  const data = {
    firmId: firm,
    assignableRoles: ['owner', 'admin', 'attorney', 'paralegal', 'billing', 'readonly'],
    items: [],
    nextCursor: null,
  };
  for (const response of [{ ...data, firmId: randomUUID() }]) {
    const client = createApiClient({
      baseUrl: 'http://example.test',
      accessToken: async () => 'test',
      fetch: async () => Response.json(response),
    });
    await expect(loadFirmStaff(client, firm)).rejects.toThrow('Unexpected staff scope');
  }
});
it('retains one access intent across an unknown result and binds its receipt to target and scope', async () => {
  const intent = prepareStaffRoleChange({
    userId: user,
    role: 'paralegal',
    expectedRevision: 1,
    reason: 'Assignment reviewed',
  });
  const bodies: string[] = [],
    keys: string[] = [];
  let calls = 0;
  const result = {
    firmId: firm,
    userId: user,
    role: 'paralegal',
    revision: 2,
    commandId: randomUUID(),
  };
  const client = createApiClient({
    baseUrl: 'http://example.test',
    accessToken: async () => 'test',
    fetch: async (_url, init) => {
      keys.push(new Headers(init?.headers).get('Idempotency-Key')!);
      bodies.push(String(init?.body));
      if (++calls === 1) throw new TypeError('Connection lost');
      return Response.json(calls === 2 ? result : { ...result, userId: randomUUID() });
    },
  });
  await expect(submitStaffRoleChange(client, firm, intent)).rejects.toThrow('Connection lost');
  expect(await submitStaffRoleChange(client, firm, intent)).toEqual(result);
  expect(new Set(keys).size).toBe(1);
  expect(new Set(bodies).size).toBe(1);
  await expect(submitStaffRoleChange(client, firm, intent)).rejects.toThrow(
    'Unexpected staff receipt',
  );
});
