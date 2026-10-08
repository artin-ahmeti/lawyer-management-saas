import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { processingReadinessSchema, type ProcessingReadiness } from '@lawfirm/core';

export type ProcessingReadinessRead =
  { kind: 'available'; snapshot: ProcessingReadiness } | { kind: 'expired' } | { kind: 'denied' };

export async function loadProcessingReadiness(
  client: Pick<ReturnType<typeof createApiClient>, 'processingReadiness'>,
  signal?: AbortSignal,
  now: () => number = Date.now,
): Promise<ProcessingReadinessRead> {
  try {
    const snapshot = processingReadinessSchema.parse(await client.processingReadiness(signal));
    const receivedAt = now();
    if (Date.parse(snapshot.checkedAt) > receivedAt || readinessExpiresAt(snapshot) <= receivedAt)
      return { kind: 'expired' };
    return { kind: 'available', snapshot };
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) return { kind: 'denied' };
    throw error;
  }
}

export function readinessExpiresAt(snapshot: ProcessingReadiness) {
  const checked = Date.parse(snapshot.checkedAt) + snapshot.validForMs;
  return snapshot.lastWorkerSeenAt
    ? Math.min(checked, Date.parse(snapshot.lastWorkerSeenAt) + snapshot.validForMs)
    : checked;
}
