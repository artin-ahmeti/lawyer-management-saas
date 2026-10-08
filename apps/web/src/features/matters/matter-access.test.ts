import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { createApiClient } from '@lawfirm/api-client';
import {
  loadMatterAccess,
  prepareMatterAccessChange,
  submitMatterAccessChange,
} from './matter-access';
const firm = randomUUID(),
  matter = randomUUID(),
  user = randomUUID();
it('rejects an access roster from another matter or firm', async () => {
  const data = { firmId: firm, matterId: matter, revision: 1, items: [], nextCursor: null };
  for (const response of [
    { ...data, firmId: randomUUID() },
    { ...data, matterId: randomUUID() },
  ]) {
    const client = createApiClient({
      baseUrl: 'http://example.test',
      accessToken: async () => 'test',
      fetch: async () => Response.json(response),
    });
    await expect(loadMatterAccess(client, firm, matter)).rejects.toThrow('Unexpected access scope');
  }
});
it('retains one access intent across an unknown result and binds its receipt to target and scope', async () => {
  const intent = prepareMatterAccessChange({
    userId: user,
    role: 'reader',
    expectedRevision: 1,
    reason: 'Assignment reviewed',
  });
  const bodies: string[] = [],
    keys: string[] = [];
  let calls = 0;
  const result = {
    firmId: firm,
    matterId: matter,
    userId: user,
    role: 'reader',
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
  await expect(submitMatterAccessChange(client, firm, matter, intent)).rejects.toThrow(
    'Connection lost',
  );
  expect(await submitMatterAccessChange(client, firm, matter, intent)).toEqual(result);
  expect(new Set(keys).size).toBe(1);
  expect(new Set(bodies).size).toBe(1);
  await expect(submitMatterAccessChange(client, firm, matter, intent)).rejects.toThrow(
    'Unexpected access receipt',
  );
});
