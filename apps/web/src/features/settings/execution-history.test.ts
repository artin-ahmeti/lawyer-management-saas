import { createApiClient } from '@lawfirm/api-client';
import { describe, expect, it, vi } from 'vitest';
import { loadExecutionHistory, describeExecutionAttempt } from './execution-history';

const jobId = '00000000-0000-4000-a000-000000000001';
const otherId = '00000000-0000-4000-a000-000000000002';
const history = {
  jobId,
  attemptCount: 1,
  unrecordedAttempts: 0,
  items: [
    {
      number: 1,
      status: 'succeeded' as const,
      startedAt: '2026-10-06T10:30:00.000Z',
      finishedAt: '2026-10-06T10:31:00.000Z',
      errorCode: null,
    },
  ],
};
const client = (transport: typeof fetch) =>
  createApiClient({
    baseUrl: 'http://localhost:3300',
    accessToken: async () => 'local-test',
    fetch: transport,
  });
describe('execution history read boundary', () => {
  it('uses an authorized no-store bounded read and passes cancellation', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(history)));
    const signal = new AbortController().signal;
    expect(await loadExecutionHistory(client(fetcher), jobId, signal)).toEqual({
      kind: 'available',
      history,
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      `http://localhost:3300/firms/current/executions/${jobId}/attempts`,
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      signal,
      cache: 'no-store',
      headers: { Authorization: 'Bearer local-test' },
    });
  });
  it('rejects mismatched references, malformed data and unsafe path identifiers', async () => {
    for (const data of [
      { ...history, jobId: otherId },
      { ...history, items: [{ ...history.items[0], payload: 'private' }] },
    ])
      await expect(
        loadExecutionHistory(
          client(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(data)))),
          jobId,
        ),
      ).rejects.toThrow();
    const fetcher = vi.fn<typeof fetch>();
    await expect(loadExecutionHistory(client(fetcher), '../name')).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('clears authorized history on denial or unavailable source without treating network failures as empty', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(history)))
      .mockResolvedValueOnce(new Response('{}', { status: 403 }))
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockRejectedValueOnce(new TypeError('Offline'));
    const api = client(fetcher);
    expect((await loadExecutionHistory(api, jobId)).kind).toBe('available');
    expect(await loadExecutionHistory(api, jobId)).toEqual({ kind: 'denied' });
    expect(await loadExecutionHistory(api, jobId)).toEqual({ kind: 'unavailable' });
    await expect(loadExecutionHistory(api, jobId)).rejects.toThrow('Offline');
  });
});
it('describes recorded interruption and running work without claiming non-delivery or success', () => {
  expect(
    describeExecutionAttempt({
      ...history.items[0]!,
      status: 'interrupted',
      errorCode: 'LEASE_EXPIRED',
    }),
  ).toMatchObject({ label: 'Interrupted', detail: expect.stringContaining('not confirmed') });
  expect(
    describeExecutionAttempt({ ...history.items[0]!, status: 'running', finishedAt: null }),
  ).toMatchObject({ label: 'Processing', detail: expect.stringContaining('not confirmed') });
});
