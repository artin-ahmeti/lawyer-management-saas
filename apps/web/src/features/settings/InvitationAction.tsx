'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import type { StaffInvitationCommandResult } from '@lawfirm/core';
import { Banner, Button } from '@lawfirm/ui-web';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { refreshFirmSession } from './firm-provision';
import { submitInvitation, type InvitationIntent } from './staff-invitations';
import styles from './FirmBackgroundWork.module.css';

export function InvitationAction({
  intent,
  client,
  userId,
  context,
  onDone,
  onDenied,
}: {
  intent: InvitationIntent;
  client: ReturnType<typeof createApiClient>;
  userId: string;
  context: string;
  onDone: () => void;
  onDenied: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<StaffInvitationCommandResult>(),
    [error, setError] = useState<{ text: string; terminal: boolean }>();
  const request = useRef<AbortController | null>(null),
    mounted = useRef(true),
    inFlight = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  const run = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    request.current = new AbortController();
    try {
      let result = receipt;
      if (!result) {
        result = await submitInvitation(client, intent, request.current.signal);
        if (!mounted.current) return;
        setReceipt(result);
      }
      if (intent.kind === 'accept') {
        const auth = getSupabaseBrowser();
        if (!auth) throw new Error('Session refresh unavailable');
        try {
          await refreshFirmSession(auth.auth, userId, intent.firmId);
          if (mounted.current) onDone();
        } catch {
          if (mounted.current)
            setError({
              text:
                context === `${userId}:none` || context === `${userId}:${intent.firmId}`
                  ? 'Your membership was saved. Refresh firm access to continue; accepting again is unnecessary.'
                  : 'Your membership was saved. Your existing firm remains active; switching to the joined firm is not available here yet.',
              terminal: false,
            });
        }
      }
    } catch (caught) {
      if (!mounted.current) return;
      const denied = caught instanceof ApiError && [401, 403].includes(caught.status);
      const terminal =
        caught instanceof ApiError && [401, 403, 404, 409, 422].includes(caught.status);
      setError({
        terminal,
        text: terminal
          ? 'This action is unavailable or changed. Refresh the invitations before reviewing another action.'
          : 'The result could not be confirmed. Check the same request to safely recover it.',
      });
      if (denied) onDenied();
    } finally {
      inFlight.current = false;
      request.current = null;
      if (mounted.current) setBusy(false);
    }
  };
  const title = receipt
    ? intent.kind === 'accept'
      ? 'Firm joined'
      : intent.kind === 'prepare'
        ? 'Invitation prepared'
        : 'Invitation revoked'
    : intent.kind === 'accept'
      ? 'Review joining this firm'
      : intent.kind === 'prepare'
        ? 'Review staff invitation'
        : 'Review invitation revocation';
  return (
    <div className="cl-stack cl-stack--sm" aria-busy={busy}>
      <Banner
        tone={receipt ? 'success' : 'info'}
        role="status"
        title={title}
        text={
          intent.kind === 'prepare'
            ? `${intent.input.email} · ${intent.input.role}. Email delivery is unavailable; the recipient can review this after signing in with their confirmed email.`
            : intent.kind === 'accept'
              ? 'Join with the role shown on the invitation. Access is enforced by the server.'
              : 'Revocation prevents future acceptance. It does not remove an accepted membership.'
        }
      />
      {error && <Banner tone="warning" role="alert" title={error.text} />}
      <div className="cl-inline">
        {!error?.terminal && (!receipt || intent.kind === 'accept') && (
          <Button
            className={styles.refresh}
            disabled={busy}
            onClick={() => void run()}
            variant="primary"
          >
            {busy
              ? 'Working…'
              : receipt
                ? 'Refresh joined firm access'
                : error
                  ? 'Check invitation request'
                  : intent.kind === 'accept'
                    ? 'Confirm joining firm'
                    : intent.kind === 'prepare'
                      ? 'Confirm invitation'
                      : 'Confirm revocation'}
          </Button>
        )}
        {(error?.terminal || (receipt && intent.kind !== 'accept')) && (
          <Button className={styles.refresh} disabled={busy} variant="secondary" onClick={onDone}>
            Refresh invitations
          </Button>
        )}
        {!receipt && !error && !busy && (
          <Button className={styles.refresh} variant="secondary" onClick={onDone}>
            Cancel review
          </Button>
        )}
      </div>
    </div>
  );
}
