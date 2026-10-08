import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  loadMatter,
  loadMatterList,
  prepareMatterCreation,
  submitMatterCreation,
} from './live-matters';
const firmId = randomUUID(),
  id = randomUUID();
const matter = {
  id,
  firmId,
  title: 'Advisory engagement',
  reference: null,
  revision: 1,
  createdAt: new Date().toISOString(),
  accessRole: 'manager' as const,
};
it('binds read results to the requested workspace and matter rather than accepting foreign data', async () => {
  await expect(
    loadMatterList(
      {
        matters: async () => ({
          items: [{ ...matter, firmId: randomUUID() }],
          nextCursor: null,
          canCreate: true,
        }),
      },
      firmId,
    ),
  ).rejects.toThrow('workspace');
  await expect(
    loadMatter({ matter: async () => ({ ...matter, id: randomUUID() }) }, firmId, id),
  ).rejects.toThrow('matter');
});
it('preserves the same intent after an uncertain response and validates the receipt scope', async () => {
  const intent = prepareMatterCreation({ title: ' Advisory engagement ' });
  let fail = true;
  const attempts: unknown[] = [];
  const client = {
    createMatter: async (input: unknown, action: unknown) => {
      attempts.push({ input, action });
      if (fail) {
        fail = false;
        throw new Error('response lost');
      }
      return { matter, commandId: randomUUID() };
    },
  };
  await expect(submitMatterCreation(client, intent, firmId)).rejects.toThrow('response lost');
  expect((await submitMatterCreation(client, intent, firmId)).matter.id).toBe(id);
  expect(attempts[0]).toEqual(attempts[1]);
  await expect(
    submitMatterCreation(
      {
        createMatter: async () => ({
          matter: { ...matter, firmId: randomUUID() },
          commandId: randomUUID(),
        }),
      },
      intent,
      firmId,
    ),
  ).rejects.toThrow('workspace');
});
