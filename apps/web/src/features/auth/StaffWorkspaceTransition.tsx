'use client';
import { ApiError, createApiClient } from '@lawfirm/api-client';
import type { SelectStaffFirmResult } from '@lawfirm/core';
import { Banner, Button, Card } from '@lawfirm/ui-web';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useEffect, useRef, useState } from 'react';
import { Page } from '@/components/PageState';
import { apiUrl } from '@/lib/env';
import { decodedStaffSessionScope } from '@/lib/firm-session';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useOverlays } from '@/stores/ui';
import { StaffSessionActions } from '@/features/settings/StaffSessionActions';
import {
  submitStaffFirmSelection,
  verifyRefreshedStaffSelection,
  type StaffFirmSelectionIntent,
} from '@/features/settings/staff-firm-selection';

export type StaffWorkspaceTransitionRequest = {
  intent: StaffFirmSelectionIntent;
  targetName: string;
  userId: string;
  sessionId: string;
};
export const StaffWorkspaceTransitionContext = createContext<
  ((intent: StaffFirmSelectionIntent, targetName: string) => void) | undefined
>(undefined);

/** Lives outside the staff frame so Auth events cannot expose it before target verification. */
export function StaffWorkspaceTransition({
  request,
}: {
  request: StaffWorkspaceTransitionRequest;
}) {
  const auth = getSupabaseBrowser(),
    cache = useQueryClient();
  const [receipt, setReceipt] = useState<SelectStaffFirmResult>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<{ text: string; terminal: boolean }>();
  const inFlight = useRef(false),
    active = useRef(true),
    controller = useRef<AbortController | null>(null);
  const run = async () => {
    if (!auth || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    controller.current = new AbortController();
    const client = createApiClient({
      baseUrl: apiUrl,
      accessToken: async () => {
        const { data, error } = await auth.auth.getSession();
        return !error &&
          data.session?.user.id === request.userId &&
          decodedStaffSessionScope(data.session)?.sessionId === request.sessionId
          ? data.session.access_token
          : null;
      },
    });
    let saved = receipt;
    try {
      if (!saved) {
        saved = await submitStaffFirmSelection(
          client,
          request.intent,
          request.userId,
          controller.current.signal,
        );
        if (!active.current) return;
        setReceipt(saved);
      }
      await cache.cancelQueries();
      cache.clear();
      useOverlays.setState(useOverlays.getInitialState(), true);
      const refreshed = await auth.auth.refreshSession();
      await verifyRefreshedStaffSelection(refreshed, saved, request.sessionId, () =>
        client.firm(controller.current?.signal),
      );
      if (active.current) window.location.replace('/settings');
    } catch (caught) {
      if (!active.current) return;
      const terminal = caught instanceof ApiError && [401, 403, 409, 422].includes(caught.status);
      setError({
        terminal,
        text: saved
          ? 'Your selection was saved. Workspace access could not be confirmed; refresh access to retry.'
          : terminal
            ? 'The selection is unavailable or changed. Reload to review current workspace access.'
            : 'The selection outcome could not be confirmed. Check the same request to recover it safely.',
      });
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  };
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  return (
    <Page>
      <div className="cl-stack cl-stack--lg">
        <Card
          title={
            <h1 className="cl-t-title-2">
              {busy ? 'Switching workspace' : 'Review workspace switch'}
            </h1>
          }
          subtitle={request.targetName}
        >
          <div className="cl-stack cl-stack--sm" aria-busy={busy}>
            <Banner
              tone="info"
              role="status"
              title={
                busy
                  ? 'Confirming workspace access…'
                  : receipt
                    ? 'Selection saved'
                    : 'Confirm this workspace'
              }
              text="Workspace content is hidden until your refreshed session and current access are confirmed. Other devices keep their current workspace."
            />
            {error && <Banner tone="warning" role="alert" title={error.text} />}
            {error && !error.terminal && (
              <Button type="button" disabled={busy} onClick={() => void run()}>
                {receipt ? 'Refresh workspace access' : 'Check workspace request'}
              </Button>
            )}
            {!error && !receipt && (
              <Button type="button" disabled={busy} onClick={() => void run()}>
                Confirm workspace switch
              </Button>
            )}
            {!busy && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.location.replace('/settings')}
              >
                {error ? 'Reload workspace' : 'Return to Settings'}
              </Button>
            )}
          </div>
        </Card>
        <StaffSessionActions />
      </div>
    </Page>
  );
}
