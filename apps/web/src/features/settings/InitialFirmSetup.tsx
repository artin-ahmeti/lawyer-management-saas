'use client';

import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { provisionFirmSchema, type ProvisionFirmResult } from '@lawfirm/core';
import { Banner, Button, Card, Field, Input } from '@lawfirm/ui-web';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import {
  prepareFirmProvision,
  submitFirmProvision,
  refreshFirmSession,
  type FirmProvisionIntent,
} from './firm-provision';
import styles from './FirmBackgroundWork.module.css';

export function InitialFirmSetup({
  client,
  userId,
  onRefresh,
}: {
  client: ReturnType<typeof createApiClient>;
  userId: string;
  onRefresh: () => Promise<unknown>;
}) {
  const auth = getSupabaseBrowser();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<FirmProvisionIntent>();
  const [created, setCreated] = useState<ProvisionFirmResult>();
  const [message, setMessage] = useState<string>();
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);

  const run = async (create: boolean) => {
    if (inFlight.current || !auth) return;
    let prepared = intent;
    if (create && !created && !prepared) {
      if (!provisionFirmSchema.safeParse({ name }).success) {
        setMessage('Enter a firm name between 1 and 200 characters without control characters.');
        return;
      }
      prepared = prepareFirmProvision(name);
      setIntent(prepared);
    }
    inFlight.current = true;
    setBusy(true);
    setMessage(undefined);
    let receipt = created;
    try {
      if (create && !receipt && prepared) {
        request.current = new AbortController();
        try {
          receipt = await submitFirmProvision(client, prepared, request.current.signal);
        } catch (error) {
          if (!mounted.current) return;
          if (error instanceof ApiError && error.code === 'EMAIL_CONFIRMATION_REQUIRED') {
            setIntent(undefined);
            setMessage('Confirm your email, then try creating your firm again.');
          } else if (error instanceof ApiError && error.code === 'STAFF_MEMBERSHIP_EXISTS') {
            setMessage('You already belong to a firm. Refresh firm access to continue.');
          } else if (error instanceof ApiError && [401, 403].includes(error.status)) {
            setMessage(
              'Firm setup is unavailable for this account. Sign in again or contact your administrator.',
            );
          } else {
            setMessage(
              'Creation could not be confirmed. Check the same request to safely recover its result.',
            );
          }
          return;
        }
        if (!mounted.current) return;
        setCreated(receipt);
        setIntent(undefined);
      }
      try {
        await refreshFirmSession(auth.auth, userId, receipt?.firmId);
        if (mounted.current) await onRefresh();
      } catch {
        if (mounted.current)
          setMessage(
            receipt
              ? 'Your firm was created, but firm access has not refreshed. Refresh firm access to continue.'
              : 'Firm access could not be refreshed. Try again or sign in again.',
          );
      }
    } finally {
      request.current = null;
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <Card
      title={created ? 'Firm created' : 'Set up your firm'}
      subtitle={
        created
          ? 'Refresh your session to load the firm from the server.'
          : 'Create your first firm, or refresh access if your firm has already added you.'
      }
    >
      <form
        className="cl-form"
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          void run(true);
        }}
      >
        {!created && (
          <Field label="Firm name">
            <Input
              aria-label="New firm name"
              value={name}
              required
              maxLength={200}
              autoComplete="organization"
              disabled={busy || Boolean(intent)}
              onChange={(event) => {
                setName(event.target.value);
                setMessage(undefined);
              }}
            />
          </Field>
        )}
        {message && <Banner tone="warning" role="alert" title={message} />}
        <div className="cl-inline" style={{ flexWrap: 'wrap' }}>
          {!created && (
            <Button
              className={styles.refresh}
              type="submit"
              variant="primary"
              disabled={busy || (!intent && !name.trim())}
            >
              {busy ? 'Working…' : intent ? 'Check creation request' : 'Create firm'}
            </Button>
          )}
          <Button
            className={styles.refresh}
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void run(false)}
          >
            {created && busy ? 'Refreshing…' : 'Refresh firm access'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
