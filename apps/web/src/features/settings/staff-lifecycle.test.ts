import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { createApiClient } from '@lawfirm/api-client';
import {
  loadRemovedStaff,
  loadStaffMembershipHistory,
  prepareStaffMembershipChange,
  submitStaffMembershipChange,
} from './staff-lifecycle';
const firm = randomUUID(),
  user = randomUUID();
const respond = (response: unknown) =>
  createApiClient({
    baseUrl: 'http://example.test',
    accessToken: async () => 'test',
    fetch: async () => Response.json(response),
  });
it('rejects removed staff and membership history from another firm', async () => {
  const foreign = randomUUID();
  await expect(
    loadRemovedStaff(
      respond({ firmId: foreign, assignableRoles: [], items: [], nextCursor: null }),
      firm,
    ),
  ).rejects.toThrow('Unexpected staff scope');
  await expect(
    loadStaffMembershipHistory(respond({ firmId: foreign, items: [], nextCursor: null }), firm),
  ).rejects.toThrow('Unexpected staff scope');
});
it('retains one removal intent across an unknown result and binds its receipt to the target', async () => {
  const intent = prepareStaffMembershipChange({
    action: 'remove',
    input: { userId: user, expectedRevision: 1, reason: 'Left the firm' },
  });
  const keys: string[] = [],
    urls: string[] = [];
  let calls = 0;
  const result = {
    firmId: firm,
    userId: user,
    role: 'attorney',
    revision: 2,
    status: 'removed',
    commandId: randomUUID(),
  };
  const client = createApiClient({
    baseUrl: 'http://example.test',
    accessToken: async () => 'test',
    fetch: async (url, init) => {
      urls.push(String(url));
      keys.push(new Headers(init?.headers).get('Idempotency-Key')!);
      if (++calls === 1) throw new TypeError('Connection lost');
      return Response.json(calls === 2 ? result : { ...result, status: 'active' });
    },
  });
  await expect(submitStaffMembershipChange(client, firm, intent)).rejects.toThrow(
    'Connection lost',
  );
  expect(await submitStaffMembershipChange(client, firm, intent)).toEqual(result);
  expect(new Set(keys).size).toBe(1);
  expect(urls.every((u) => u.endsWith('/firms/current/staff/removals'))).toBe(true);
  await expect(submitStaffMembershipChange(client, firm, intent)).rejects.toThrow(
    'Unexpected staff receipt',
  );
});
it('binds a restoration receipt to the reviewed role and an active membership', async () => {
  const intent = prepareStaffMembershipChange({
    action: 'restore',
    input: { userId: user, role: 'paralegal', expectedRevision: 2, reason: 'Rejoined' },
  });
  const result = {
    firmId: firm,
    userId: user,
    role: 'paralegal',
    revision: 3,
    status: 'active',
    commandId: randomUUID(),
  };
  const urls: string[] = [];
  const client = createApiClient({
    baseUrl: 'http://example.test',
    accessToken: async () => 'test',
    fetch: async (url) => {
      urls.push(String(url));
      return Response.json(result);
    },
  });
  expect(await submitStaffMembershipChange(client, firm, intent)).toEqual(result);
  expect(urls).toEqual(['http://example.test/firms/current/staff/restorations']);
  for (const mismatch of [
    { role: 'owner' },
    { firmId: randomUUID() },
    { userId: randomUUID() },
    { revision: 4 },
    { status: 'removed' },
  ])
    await expect(
      submitStaffMembershipChange(respond({ ...result, ...mismatch }), firm, intent),
    ).rejects.toThrow('Unexpected staff receipt');
  expect(() =>
    prepareStaffMembershipChange({
      action: 'restore',
      input: { userId: user, role: 'reader', expectedRevision: 2, reason: 'x' } as never,
    }),
  ).toThrow();
});
