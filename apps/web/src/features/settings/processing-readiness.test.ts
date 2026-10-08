import { expect, it } from 'vitest';
import { ApiError } from '@lawfirm/api-client';
import { loadProcessingReadiness, readinessExpiresAt } from './processing-readiness';

const checkedAt = '2026-10-06T12:00:00Z';
const snapshot = {
  checkedAt,
  validForMs: 15000 as const,
  database: 'available' as const,
  queue: 'available' as const,
  worker: 'recently_observed' as const,
  lastWorkerSeenAt: '2026-10-06T11:59:50Z',
};

it('expires a snapshot at the earlier heartbeat deadline', () => {
  expect(readinessExpiresAt(snapshot)).toBe(Date.parse(checkedAt) + 5000);
  expect(readinessExpiresAt({ ...snapshot, worker: 'not_observed', lastWorkerSeenAt: null })).toBe(
    Date.parse(checkedAt) + 15000,
  );
});
it('validates available evidence and replaces denied data with an empty denial', async () => {
  const signal = new AbortController().signal;
  await expect(
    loadProcessingReadiness({ processingReadiness: async () => snapshot }, signal, () =>
      Date.parse(checkedAt),
    ),
  ).resolves.toEqual({ kind: 'available', snapshot });
  for (const status of [401, 403])
    await expect(
      loadProcessingReadiness({
        processingReadiness: async () => {
          throw new ApiError(status, 'DENIED', 'private text');
        },
      }),
    ).resolves.toEqual({ kind: 'denied' });
});
it('never displays an available response that expired in transit or comes from a future clock', async () => {
  for (const now of [Date.parse(checkedAt) + 5000, Date.parse(checkedAt) - 1])
    await expect(
      loadProcessingReadiness({ processingReadiness: async () => snapshot }, undefined, () => now),
    ).resolves.toEqual({ kind: 'expired' });
});
it('keeps failed or malformed reads as errors rather than available or empty', async () => {
  await expect(
    loadProcessingReadiness({
      processingReadiness: async () => {
        throw new ApiError(503, 'UNAVAILABLE', 'private text');
      },
    }),
  ).rejects.toMatchObject({ status: 503 });
  await expect(
    loadProcessingReadiness({
      processingReadiness: async () => ({ ...snapshot, queue: 'unavailable' }),
    }),
  ).rejects.toThrow();
});
