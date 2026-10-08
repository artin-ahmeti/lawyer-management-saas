import { createApiClient } from '@lawfirm/api-client';
import { expect, it, vi } from 'vitest';
import { loadStaffContext } from './staff-access';
const userId = '00000000-0000-4000-a000-000000000001';
const firmId = '00000000-0000-4000-a000-000000000002';
const context = { userId, firmId, role: 'readonly', capabilities: ['firm.profile.read'] };
const client = (fetcher: typeof fetch) =>
  createApiClient({
    baseUrl: 'http://localhost:3300',
    accessToken: async () => 'test',
    fetch: fetcher,
  });
it('loads current staff access through an authorized cancellable read', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(context)));
  const signal = new AbortController().signal;
  expect(await loadStaffContext(client(fetcher), userId, firmId, signal)).toEqual({
    kind: 'available',
    context,
  });
  expect(fetcher.mock.calls[0]?.[0]).toBe('http://localhost:3300/auth/me');
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    signal,
    cache: 'no-store',
    headers: { Authorization: 'Bearer test' },
  });
});
it('rejects mismatched actors/firms and unsupported authority instead of rendering it', async () => {
  for (const bad of [
    { ...context, userId: firmId },
    { ...context, firmId: userId },
    { ...context, capabilities: ['financial.all'] },
    { userId, capabilities: [] },
  ])
    await expect(
      loadStaffContext(
        client(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(bad)))),
        userId,
        firmId,
      ),
    ).rejects.toThrow();
});
it('replaces current access with denial and leaves transport failures visible', async () => {
  for (const status of [401, 403])
    expect(
      await loadStaffContext(
        client(vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status }))),
        userId,
        firmId,
      ),
    ).toEqual({ kind: 'denied' });
  await expect(
    loadStaffContext(
      client(vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Offline'))),
      userId,
      firmId,
    ),
  ).rejects.toThrow('Offline');
});
