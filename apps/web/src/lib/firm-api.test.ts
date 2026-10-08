import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from '@lawfirm/api-client';

describe('shared firm API transport', () => {
  it('retains the caller action key and obtains current credentials for each retry', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ firm: {}, commandId: 'test' }), { status: 200 }),
      );
    const credentials = vi
      .fn()
      .mockResolvedValueOnce('first-token')
      .mockResolvedValueOnce('refreshed-token');
    const client = createApiClient({
      baseUrl: 'http://localhost:3000/',
      accessToken: credentials,
      fetch: transport,
    });
    const body = { name: 'Example LLP', expectedRevision: 1 };
    await client.renameFirm(body, { idempotencyKey: 'same-action', requestId: 'first-request' });
    transport.mockResolvedValueOnce(
      new Response(JSON.stringify({ firm: {}, commandId: 'test' }), { status: 200 }),
    );
    await client.renameFirm(body, { idempotencyKey: 'same-action', requestId: 'retry-request' });
    expect(transport).toHaveBeenCalledTimes(2);
    for (const [index, auth] of ['first-token', 'refreshed-token'].entries()) {
      const [url, options] = transport.mock.calls[index]!;
      expect(url).toBe('http://localhost:3000/firms/current/name');
      expect(options?.headers).toMatchObject({
        Authorization: `Bearer ${auth}`,
        'Idempotency-Key': 'same-action',
      });
      expect(options?.body).toBe(JSON.stringify(body));
    }
  });

  it('does not send an unauthenticated request', async () => {
    const transport = vi.fn<typeof fetch>();
    const client = createApiClient({
      baseUrl: 'http://localhost:3000',
      accessToken: async () => null,
      fetch: transport,
    });
    await expect(client.firm()).rejects.toMatchObject({ status: 401, code: 'SESSION_REQUIRED' });
    expect(transport).not.toHaveBeenCalled();
  });

  it('preserves a server conflict and does not retry the write automatically', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'REVISION_CONFLICT',
          message: 'Reload current data.',
        }),
        { status: 409, headers: { 'X-Request-Id': 'request-id' } },
      ),
    );
    const client = createApiClient({
      baseUrl: 'http://localhost:3000',
      accessToken: async () => 'token',
      fetch: transport,
    });
    const action = client.renameFirm(
      { name: 'Example', expectedRevision: 1 },
      { idempotencyKey: 'action-key', requestId: 'request-id' },
    );
    await expect(action).rejects.toBeInstanceOf(ApiError);
    await expect(action).rejects.toMatchObject({
      status: 409,
      code: 'REVISION_CONFLICT',
      requestId: 'request-id',
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});

it('inspects authorized firm execution status without hiding denied access', async () => {
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'CAPABILITY_DENIED', message: 'Access denied.' }), {
        status: 403,
      }),
    );
  const client = createApiClient({
    baseUrl: 'http://localhost:3000',
    accessToken: async () => 'token',
    fetch: transport,
  });
  await expect(client.firmExecutions()).resolves.toEqual({ items: [] });
  await expect(client.firmExecutions()).rejects.toMatchObject({
    status: 403,
    code: 'CAPABILITY_DENIED',
  });
  expect(transport).toHaveBeenCalledTimes(2);
  expect(transport.mock.calls[0]?.[0]).toBe('http://localhost:3000/firms/current/executions');
});

it('checks processing through an authenticated, cancellable read with no automatic retry', async () => {
  const signal = new AbortController().signal;
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(JSON.stringify({ code: 'CAPABILITY_DENIED' }), { status: 403 }),
    );
  const client = createApiClient({
    baseUrl: 'http://localhost:3000',
    accessToken: async () => 'current-token',
    fetch: transport,
  });
  await expect(client.processingReadiness(signal)).rejects.toMatchObject({ status: 403 });
  expect(transport).toHaveBeenCalledOnce();
  const [url, options] = transport.mock.calls[0]!;
  expect(url).toBe('http://localhost:3000/firms/current/processing-readiness');
  expect(options?.method ?? 'GET').toBe('GET');
  expect(options?.cache).toBe('no-store');
  expect(options?.signal).toBe(signal);
  expect(options?.headers).toEqual({ Authorization: 'Bearer current-token' });
});
