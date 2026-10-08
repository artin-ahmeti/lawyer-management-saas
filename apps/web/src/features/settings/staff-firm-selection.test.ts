import { randomUUID } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { createApiClient } from '@lawfirm/api-client';
import {
  prepareStaffFirmSelection,
  submitStaffFirmSelection,
  verifyRefreshedStaffSelection,
} from './staff-firm-selection';

const userId = randomUUID(),
  firmId = randomUUID(),
  sessionId = randomUUID();
const receipt = {
  userId,
  firmId,
  revision: 1,
  commandId: randomUUID(),
  requiresSessionRefresh: true as const,
};
const session = (firm = firmId, revision = 1, user = userId, sid = sessionId) => ({
  user: {
    id: user,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-10-08T00:00:00Z',
  },
  access_token: `header.${btoa(JSON.stringify({ sub: user, firm_id: firm, session_id: sid, staff_context_revision: revision }))}.signature`,
});
it('retains one reviewed command and action key through a lost response with current credentials', async () => {
  const intent = prepareStaffFirmSelection(firmId, 0);
  const transport = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new Error('Response lost'))
    .mockResolvedValueOnce(new Response(JSON.stringify(receipt)));
  const client = createApiClient({
    baseUrl: 'http://localhost:3300',
    accessToken: async () => 'current-token',
    fetch: transport,
  });
  await expect(submitStaffFirmSelection(client, intent, userId)).rejects.toThrow('Response lost');
  await expect(submitStaffFirmSelection(client, intent, userId)).resolves.toEqual(receipt);
  for (const [, options] of transport.mock.calls) {
    expect(options?.body).toBe(JSON.stringify(intent.input));
    expect(options?.headers).toMatchObject({
      'Idempotency-Key': intent.idempotencyKey,
      'X-Request-Id': intent.requestId,
      Authorization: 'Bearer current-token',
    });
  }
});
it('rejects receipts for another actor, target or revision rather than using them to install authority', async () => {
  const intent = prepareStaffFirmSelection(firmId, 0);
  for (const result of [
    { ...receipt, userId: randomUUID() },
    { ...receipt, firmId: randomUUID() },
    { ...receipt, revision: 7 },
    { ...receipt, requiresSessionRefresh: false },
  ])
    await expect(
      submitStaffFirmSelection(
        { selectStaffFirm: async () => result as typeof receipt },
        intent,
        userId,
      ),
    ).rejects.toThrow();
});
it('requires Auth refresh for the same actor/session/selection revision and an authorized target read', async () => {
  const read = vi
    .fn()
    .mockResolvedValue({ id: firmId, name: 'Real target', revision: 3, canRename: false });
  await expect(
    verifyRefreshedStaffSelection(
      { data: { session: session() }, error: null },
      receipt,
      sessionId,
      read,
    ),
  ).resolves.toEqual({ id: firmId, name: 'Real target', revision: 3, canRename: false });
  for (const current of [
    session(randomUUID()),
    session(firmId, 2),
    session(firmId, 1, randomUUID()),
    session(firmId, 1, userId, randomUUID()),
  ])
    await expect(
      verifyRefreshedStaffSelection(
        { data: { session: current }, error: null },
        receipt,
        sessionId,
        read,
      ),
    ).rejects.toThrow();
  await expect(
    verifyRefreshedStaffSelection(
      { data: { session: session() }, error: new Error('offline') },
      receipt,
      sessionId,
      read,
    ),
  ).rejects.toThrow();
  await expect(
    verifyRefreshedStaffSelection(
      { data: { session: session() }, error: null },
      receipt,
      sessionId,
      async () => ({ id: randomUUID(), name: 'Other', revision: 1, canRename: true }),
    ),
  ).rejects.toThrow();
  await expect(
    verifyRefreshedStaffSelection(
      { data: { session: session() }, error: null },
      receipt,
      sessionId,
      async () => {
        throw new Error('Revoked');
      },
    ),
  ).rejects.toThrow('Revoked');
});
