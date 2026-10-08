import type { createApiClient } from '@lawfirm/api-client';
import {
  changeMatterAccessSchema,
  changeMatterAccessResultSchema,
  matterAccessCandidatesSchema,
  matterAccessHistorySchema,
  matterAccessListSchema,
  type ChangeMatterAccess,
} from '@lawfirm/core';
type Client = ReturnType<typeof createApiClient>;
const checkScope = (
  value: { firmId: string; matterId: string },
  firmId: string,
  matterId: string,
) => {
  if (value.firmId !== firmId || value.matterId !== matterId)
    throw new Error('Unexpected access scope');
};
export async function loadMatterAccess(
  client: Pick<Client, 'matterAccess'>,
  firmId: string,
  matterId: string,
  signal?: AbortSignal,
  afterId?: string,
) {
  const value = matterAccessListSchema.parse(await client.matterAccess(matterId, signal, afterId));
  checkScope(value, firmId, matterId);
  return value;
}
export async function loadMatterAccessCandidates(
  client: Pick<Client, 'matterAccessCandidates'>,
  firmId: string,
  matterId: string,
  signal?: AbortSignal,
  afterId?: string,
) {
  const value = matterAccessCandidatesSchema.parse(
    await client.matterAccessCandidates(matterId, signal, afterId),
  );
  checkScope(value, firmId, matterId);
  return value;
}
export async function loadMatterAccessHistory(
  client: Pick<Client, 'matterAccessHistory'>,
  firmId: string,
  matterId: string,
  signal?: AbortSignal,
  cursor: { beforeId: string; beforeCreatedAt: string } | null = null,
) {
  const value = matterAccessHistorySchema.parse(
    await client.matterAccessHistory(matterId, signal, cursor),
  );
  checkScope(value, firmId, matterId);
  return value;
}
export function prepareMatterAccessChange(input: ChangeMatterAccess) {
  return {
    input: changeMatterAccessSchema.parse(input),
    idempotencyKey: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
  };
}
export type MatterAccessIntent = ReturnType<typeof prepareMatterAccessChange>;
export async function submitMatterAccessChange(
  client: Pick<Client, 'changeMatterAccess'>,
  firmId: string,
  matterId: string,
  intent: MatterAccessIntent,
  signal?: AbortSignal,
) {
  const value = changeMatterAccessResultSchema.parse(
    await client.changeMatterAccess(matterId, intent.input, {
      idempotencyKey: intent.idempotencyKey,
      requestId: intent.requestId,
      signal,
    }),
  );
  if (
    value.firmId !== firmId ||
    value.matterId !== matterId ||
    value.userId !== intent.input.userId ||
    value.role !== intent.input.role ||
    value.revision !== intent.input.expectedRevision + 1
  )
    throw new Error('Unexpected access receipt');
  return value;
}
