import type { Session } from '@supabase/supabase-js';
import { staffSessionScopeSchema, uuidSchema } from '@lawfirm/core';
/** Decoded identity/revision binds ephemeral state; API checks remain authoritative. */
export function decodedStaffSessionScope(session: Pick<Session, 'user' | 'access_token'>) {
  try {
    const payload: unknown = JSON.parse(
      atob(session.access_token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')),
    );
    const parsed = staffSessionScopeSchema.safeParse(payload);
    return parsed.success
      ? {
          sessionId: parsed.data.session_id,
          firmId: parsed.data.firm_id,
          revision: parsed.data.staff_context_revision ?? 0,
        }
      : undefined;
  } catch {
    return undefined;
  }
}
export function staffSessionBoundaryKey(session: Pick<Session, 'user' | 'access_token'>) {
  const scope = decodedStaffSessionScope(session);
  return `${firmSessionKey(session)}:${scope?.sessionId ?? 'legacy'}:${scope?.revision ?? 0}`;
}

/** Cache namespace only. An unverified claim NEVER grants a capability or authorizes a request. */
export function firmSessionKey(session: Pick<Session, 'user' | 'access_token'>): string {
  try {
    const encoded = session.access_token.split('.')[1];
    if (!encoded) return `${session.user.id}:none`;
    const payload: unknown = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
    const claimedFirm =
      typeof payload === 'object' && payload !== null && 'firm_id' in payload
        ? uuidSchema.safeParse(payload.firm_id)
        : undefined;
    return `${session.user.id}:${claimedFirm?.success ? claimedFirm.data : 'none'}`;
  } catch {
    return `${session.user.id}:none`;
  }
}
