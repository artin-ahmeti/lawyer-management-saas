import { createApiClient } from '@lawfirm/api-client';
import { expect, it, vi } from 'vitest';
import { loadRecoveryReview, prepareRecovery, submitRecovery } from './execution-recovery';

const jobId = '00000000-0000-4000-a000-000000000001';
const firmId = '00000000-0000-4000-a000-000000000002';
const replacement = '00000000-0000-4000-a000-000000000003';
const review = {
  jobId,
  firm: { id: firmId, name: 'Firm', revision: 2, canRename: true },
  eligible: true,
  reason: null,
  sourceRevision: 1,
  sourceStatus: 'failed',
  replacementJobId: null,
};
const client = (fetcher: typeof fetch) =>
  createApiClient({
    baseUrl: 'http://localhost:3300',
    accessToken: async () => 'test',
    fetch: fetcher,
  });
it('reads a current authorized review and validates both context references', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(review)));
  expect(await loadRecoveryReview(client(fetcher), jobId, firmId)).toEqual({
    kind: 'available',
    review,
  });
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    cache: 'no-store',
    headers: { Authorization: 'Bearer test' },
  });
  for (const bad of [
    { ...review, jobId: replacement },
    { ...review, firm: { ...review.firm, id: replacement } },
    { ...review, sourceStatus: 'running' },
  ]) {
    await expect(
      loadRecoveryReview(
        client(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(bad)))),
        jobId,
        firmId,
      ),
    ).rejects.toThrow();
  }
});
it('prepares only an eligible reviewed intent and keeps identity and input across an uncertain response', async () => {
  const intent = prepareRecovery(review, ' Reviewed profile ');
  expect(intent.input).toEqual({
    reason: 'Reviewed profile',
    expectedRevision: 2,
    expectedSourceRevision: 1,
    expectedStatus: 'failed',
  });
  expect(() =>
    prepareRecovery({ ...review, eligible: false, reason: 'NOT_TERMINAL' }, 'Reviewed'),
  ).toThrow();
  const result = {
    jobId: replacement,
    sourceJobId: jobId,
    commandId: firmId,
    status: 'awaiting_dispatch',
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new TypeError('Connection lost'))
    .mockResolvedValueOnce(new Response(JSON.stringify(result)));
  const api = client(fetcher);
  await expect(submitRecovery(api, intent)).rejects.toThrow('Connection lost');
  expect(await submitRecovery(api, intent)).toEqual(result);
  expect(fetcher.mock.calls[0]?.[1]).toEqual(fetcher.mock.calls[1]?.[1]);
  expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
    method: 'POST',
    body: JSON.stringify(intent.input),
    headers: { 'Idempotency-Key': intent.idempotencyKey, 'X-Request-Id': intent.requestId },
  });
});
it('returns unavailable or denied without hiding a transport failure and rejects a mismatched write response', async () => {
  for (const status of [401, 403, 404]) {
    expect(
      await loadRecoveryReview(
        client(vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status }))),
        jobId,
        firmId,
      ),
    ).toEqual({ kind: status === 404 ? 'unavailable' : 'denied' });
  }
  await expect(
    loadRecoveryReview(
      client(vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Offline'))),
      jobId,
      firmId,
    ),
  ).rejects.toThrow('Offline');
  const intent = prepareRecovery(review, 'Reviewed');
  await expect(
    submitRecovery(
      client(
        vi.fn<typeof fetch>().mockResolvedValue(
          new Response(
            JSON.stringify({
              jobId: replacement,
              sourceJobId: replacement,
              commandId: firmId,
              status: 'awaiting_dispatch',
            }),
          ),
        ),
      ),
      intent,
    ),
  ).rejects.toThrow();
});
