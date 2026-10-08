import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '@lawfirm/api-client';
import type { FirmExecutionList } from '@lawfirm/core';
import { describeFirmExecution, loadFirmExecutions } from './firm-executions';

const item: FirmExecutionList['items'][number] = {
  id: 'e809f397-7c8a-44f9-9e07-138fc10f671c',
  commandId: 'e809f397-7c8a-44f9-9e07-138fc10f671d',
  requestId: 'e809f397-7c8a-44f9-9e07-138fc10f671e',
  eventType: 'firm.renamed.v1',
  status: 'awaiting_dispatch',
  attempts: 0,
  dispatchAttempts: 1,
  availableAt: '2026-10-06T10:30:00.000Z',
  completedAt: null,
  errorCode: null,
};
const clientWith = (transport: typeof fetch) =>
  createApiClient({
    baseUrl: 'http://localhost:3300',
    accessToken: async () => 'test-only-token',
    fetch: transport,
  });

describe('firm background-work read boundary', () => {
  it('replaces authorized results with a denial after access changes', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [item] })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'CAPABILITY_DENIED',
            message: 'Untrusted server details',
          }),
          { status: 403 },
        ),
      );
    const client = clientWith(transport);
    expect((await loadFirmExecutions(client)).kind).toBe('available');
    const denied = await loadFirmExecutions(client);
    expect(denied).toEqual({ kind: 'denied' });
    expect('items' in denied).toBe(false);
  });

  it('rejects malformed, oversized and extra-field responses rather than displaying an empty or successful list', async () => {
    for (const body of [
      { items: [{ ...item, status: 'delivered' }] },
      { items: [{ ...item, payload: { private: 'hidden' } }] },
      { items: Array.from({ length: 21 }, () => item) },
      { items: null },
    ]) {
      const client = clientWith(
        vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body))),
      );
      await expect(loadFirmExecutions(client)).rejects.toThrow();
    }
  });

  it('keeps connection and server failures distinct from a verified empty list', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Connection failed'))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] })));
    const client = clientWith(transport);
    await expect(loadFirmExecutions(client)).rejects.toThrow('Connection failed');
    await expect(loadFirmExecutions(client)).rejects.toMatchObject({ status: 503 });
    await expect(loadFirmExecutions(client)).resolves.toEqual({ kind: 'available', items: [] });
  });

  it('passes query cancellation to the transport without converting it to an empty result', async () => {
    const abort = new AbortController();
    const transport = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    abort.abort();
    await expect(loadFirmExecutions(clientWith(transport), abort.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(transport.mock.calls[0]?.[1]?.signal).toBe(abort.signal);
  });
});

describe('truthful firm processing presentation', () => {
  it('shows a queue failure as unfinished work with a future retry eligibility', () => {
    const view = describeFirmExecution({ ...item, errorCode: 'QUEUE_UNAVAILABLE' });
    expect(view.label).toBe('Waiting to start');
    expect(view.detail).toContain('unavailable');
    expect(view.nextAttemptAt).toBe(item.availableAt);
  });

  it('distinguishes an automatic retry from exhausted processing', () => {
    const retry = describeFirmExecution({
      ...item,
      status: 'retry',
      attempts: 1,
      errorCode: 'PROCESSING_FAILED',
    });
    const failed = describeFirmExecution({
      ...item,
      status: 'failed',
      attempts: 5,
      errorCode: 'ATTEMPTS_EXHAUSTED',
    });
    expect(retry.label).toBe('Retry pending');
    expect(retry.nextAttemptAt).toBe(item.availableAt);
    expect(failed.label).toBe('Failed');
    expect(failed.nextAttemptAt).toBeNull();
    expect(failed.detail).toContain('stopped');
  });

  it('explains permission and source blocks without promising an automatic retry', () => {
    for (const errorCode of ['ACCESS_REVOKED', 'SOURCE_CHANGED'] as const) {
      const view = describeFirmExecution({ ...item, status: 'blocked', errorCode });
      expect(view.label).toBe('Blocked');
      expect(view.nextAttemptAt).toBeNull();
      expect(view.detail).toContain(errorCode === 'ACCESS_REVOKED' ? 'permission' : 'changed');
    }
  });

  it('describes a completed internal check without claiming provider delivery', () => {
    const view = describeFirmExecution({
      ...item,
      status: 'succeeded',
      completedAt: item.availableAt,
    });
    expect(view.label).toBe('Completed');
    expect(view.detail).toContain('verified');
    expect(view.detail).toContain('No messages');
    expect(view.nextAttemptAt).toBeNull();
  });
});
