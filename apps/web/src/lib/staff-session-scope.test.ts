import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { staffSessionBoundaryKey } from './firm-session';
it('separates cache scope by actor, Auth session, firm and selection revision', () => {
  const user = randomUUID(),
    firm = randomUUID(),
    sid = randomUUID();
  const session = (actor = user, session = sid, revision = 1) => ({
    user: {
      id: actor,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-10-08T00:00:00Z',
    },
    access_token: `head.${btoa(JSON.stringify({ firm_id: firm, session_id: session, staff_context_revision: revision }))}.sig`,
  });
  const first = staffSessionBoundaryKey(session());
  for (const other of [session(randomUUID()), session(user, randomUUID()), session(user, sid, 2)])
    expect(staffSessionBoundaryKey(other)).not.toBe(first);
});
