import { createApiClient } from '@lawfirm/api-client';
import { expect, it, vi } from 'vitest';
import { prepareFirmProvision, submitFirmProvision, refreshFirmSession } from './firm-provision';

const firmId = '00000000-0000-4000-a000-000000000001';
const userId = '00000000-0000-4000-a000-000000000002';
const commandId = '00000000-0000-4000-a000-000000000003';
it('retains the same first-firm intent after an uncertain result without automatic retries', async () => {
  const intent = prepareFirmProvision(' First firm ');
  expect(intent.input).toEqual({ name: 'First firm' });
  expect(() => prepareFirmProvision(' ')).toThrow();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new TypeError('Response lost'))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ firmId, commandId, requiresSessionRefresh: true })),
    );
  const api = createApiClient({
    baseUrl: 'http://localhost:3300',
    accessToken: async () => 'test',
    fetch: fetcher,
  });
  await expect(submitFirmProvision(api, intent)).rejects.toThrow('Response lost');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(await submitFirmProvision(api, intent)).toEqual({
    firmId,
    commandId,
    requiresSessionRefresh: true,
  });
  expect(fetcher.mock.calls[0]).toEqual(fetcher.mock.calls[1]);
  expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
    method: 'POST',
    body: JSON.stringify(intent.input),
    headers: { 'Idempotency-Key': intent.idempotencyKey, 'X-Request-Id': intent.requestId },
  });
});
it('rejects a malformed creation receipt rather than inventing owner access', async () => {
  const api = createApiClient({
    baseUrl: 'http://localhost:3300',
    accessToken: async () => 'test',
    fetch: vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ firmId, commandId, requiresSessionRefresh: false, role: 'owner' }),
        ),
      ),
  });
  await expect(submitFirmProvision(api, prepareFirmProvision('Firm'))).rejects.toThrow();
});
it('requires a fresh matching identity and firm session before handing off to the authorized read', async () => {
  const session = (id: string, firm?: string) => ({
    user: { id },
    access_token: `header.${btoa(JSON.stringify(firm ? { firm_id: firm } : {}))}.signature`,
  });
  const refreshSession = vi
    .fn()
    .mockResolvedValue({ data: { session: session(userId, firmId) }, error: null });
  await expect(refreshFirmSession({ refreshSession }, userId, firmId)).resolves.toBeUndefined();
  for (const bad of [
    null,
    session(commandId, firmId),
    session(userId),
    session(userId, commandId),
  ]) {
    refreshSession.mockResolvedValueOnce({ data: { session: bad }, error: null });
    await expect(refreshFirmSession({ refreshSession }, userId, firmId)).rejects.toThrow();
  }
  refreshSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Offline') });
  await expect(refreshFirmSession({ refreshSession }, userId)).rejects.toThrow();
});
