import type { createApiClient } from '@lawfirm/api-client';
import {
  createMatterSchema,
  createMatterResultSchema,
  matterListSchema,
  matterSchema,
  type CreateMatter,
} from '@lawfirm/core';
type Client = ReturnType<typeof createApiClient>;
export function prepareMatterCreation(input: CreateMatter) {
  return {
    input: createMatterSchema.parse(input),
    idempotencyKey: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
  };
}
export type MatterCreationIntent = ReturnType<typeof prepareMatterCreation>;
export async function loadMatterList(
  client: Pick<Client, 'matters'>,
  firmId: string,
  signal?: AbortSignal,
  afterId?: string,
) {
  const value = matterListSchema.parse(await client.matters(signal, afterId));
  if (value.items.some((m) => m.firmId !== firmId)) throw new Error('Unexpected matter workspace');
  return value;
}
export async function loadMatter(
  client: Pick<Client, 'matter'>,
  firmId: string,
  id: string,
  signal?: AbortSignal,
) {
  const value = matterSchema.parse(await client.matter(id, signal));
  if (value.firmId !== firmId || value.id !== id) throw new Error('Unexpected matter workspace');
  return value;
}
export async function submitMatterCreation(
  client: Pick<Client, 'createMatter'>,
  intent: MatterCreationIntent,
  firmId: string,
  signal?: AbortSignal,
) {
  const value = createMatterResultSchema.parse(
    await client.createMatter(intent.input, {
      idempotencyKey: intent.idempotencyKey,
      requestId: intent.requestId,
      signal,
    }),
  );
  if (value.matter.firmId !== firmId) throw new Error('Unexpected matter workspace');
  return value;
}
