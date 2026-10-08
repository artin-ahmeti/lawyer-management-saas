'use client';

import { ApiError, createApiClient } from '@lawfirm/api-client';
import {
  firmProfileSchema,
  renameFirmResultSchema,
  renameFirmSchema,
  type FirmProfile,
} from '@lawfirm/core';
import { Banner, Button, Card, Field, Input, Skeleton } from '@lawfirm/ui-web';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Page } from '@/components/PageState';
import { apiUrl } from '@/lib/env';
import { firmSessionKey } from '@/lib/firm-session';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { FirmBackgroundWork } from './FirmBackgroundWork';
import { ProcessingAvailability } from './ProcessingAvailability';
import { StaffAccessCard } from './StaffAccessCard';
import { StaffInvitations } from './StaffInvitations';
import { InitialFirmSetup } from './InitialFirmSetup';
import { WorkspaceMemberships } from './WorkspaceMemberships';
import { StaffSessionActions } from './StaffSessionActions';
import { StaffLifecycle } from './StaffLifecycle';
import { StaffRoles } from './StaffRoles';

const queryNamespace = ['server-firm'] as const;

export function LiveFirmSettings() {
  const auth = getSupabaseBrowser();
  const cache = useQueryClient();
  const [identity, setIdentity] = useState<{ session: Session | null; error?: string }>();
  const activeContext = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    let active = true;
    let authEventReceived = false;
    const { data } = auth.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      const nextContext = session ? firmSessionKey(session) : null;
      if (activeContext.current !== nextContext) {
        void cache.cancelQueries({ queryKey: queryNamespace });
        cache.removeQueries({ queryKey: queryNamespace });
      } else {
        void cache.invalidateQueries({ queryKey: queryNamespace });
      }
      activeContext.current = nextContext;
      if (active) setIdentity({ session });
    });
    void auth.auth.getSession().then(({ data: current, error }) => {
      if (active && !authEventReceived)
        setIdentity({
          session: current.session,
          error: error ? 'Your session could not be loaded. Sign in again.' : undefined,
        });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
      void cache.cancelQueries({ queryKey: queryNamespace });
      cache.removeQueries({ queryKey: queryNamespace });
    };
  }, [auth, cache]);

  const session = identity?.session;
  return (
    <Page>
      <div className="cl-stack cl-stack--sm">
        <div className="cl-eyebrow">Workspace</div>
        <h1 className="cl-t-title-1">Settings</h1>
      </div>
      <StaffSessionActions />
      {session && (
        <AccountWorkspaceSettings key={`received:${firmSessionKey(session)}`} session={session} />
      )}
      {!auth ? (
        <Card
          title="Firm profile unavailable"
          subtitle="Connect this installation to Supabase to load your firm."
        />
      ) : !identity ? (
        <div role="status" aria-label="Loading your session">
          <Skeleton height={120} />
        </div>
      ) : identity.error || !session ? (
        <Banner tone="warning" title={identity.error ?? 'Sign in to load your firm profile.'} />
      ) : (
        <AuthorizedFirmSettings
          key={firmSessionKey(session)}
          context={firmSessionKey(session)}
          userId={session.user.id}
        />
      )}
      <Card
        title="Additional settings"
        subtitle="Billing, integrations and workflow settings will become available as their services are connected."
      />
    </Page>
  );
}

function AccountWorkspaceSettings({ session }: { session: Session }) {
  const auth = getSupabaseBrowser(),
    context = firmSessionKey(session);
  const client = createApiClient({
    baseUrl: apiUrl,
    accessToken: async () => {
      if (!auth) return null;
      const { data, error } = await auth.auth.getSession();
      return !error && data.session && firmSessionKey(data.session) === context
        ? data.session.access_token
        : null;
    },
  });
  return (
    <>
      <WorkspaceMemberships client={client} context={context} userId={session.user.id} />
      <StaffInvitations client={client} context={context} userId={session.user.id} />
    </>
  );
}

function AuthorizedFirmSettings({ context, userId }: { context: string; userId: string }) {
  const auth = getSupabaseBrowser();
  const cache = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [editVersion, setEditVersion] = useState(0);
  const recheckAccess = useCallback(() => {
    void cache.invalidateQueries({ queryKey: [...queryNamespace, context], exact: true });
  }, [cache, context]);
  const denyAccess = useCallback(() => {
    // Cancelling the session's firm reads also cancels the account's own workspace
    // reads, which share the prefix; losing a firm changes those, so refetch them.
    void cache.cancelQueries({ queryKey: [...queryNamespace, context] }).then(() => {
      for (const key of ['memberships', 'active-selection'])
        void cache.invalidateQueries({ queryKey: [...queryNamespace, context, key] });
    });
    cache.setQueryData([...queryNamespace, context], {
      kind: 'denied',
      message: 'Your current firm membership could not be confirmed.',
    });
  }, [cache, context]);
  const client = createApiClient({
    baseUrl: apiUrl,
    accessToken: async () => {
      const { data, error } = await auth!.auth.getSession();
      if (error || !data.session || firmSessionKey(data.session) !== context) return null;
      return data.session.access_token;
    },
  });
  const query = useQuery({
    queryKey: [...queryNamespace, context],
    queryFn: async ({ signal }) => {
      try {
        return {
          kind: 'available' as const,
          firm: firmProfileSchema.parse(await client.firm(signal)),
        };
      } catch (error) {
        if (error instanceof ApiError && error.status === 403 && error.code === 'NO_ACTIVE_FIRM')
          return { kind: 'needs_setup' as const };
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          // A denial replaces cached data, including after a previously successful read.
          return { kind: 'denied' as const, message: error.message };
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
  if (query.isPending)
    return (
      <div role="status" aria-label="Loading firm profile">
        <Skeleton height={200} />
      </div>
    );
  if (query.isError) {
    return (
      <Banner
        tone="warning"
        title="The firm profile did not load"
        text="Check your connection and try again."
        actions={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }
  if (query.data.kind === 'denied')
    return (
      <Banner
        tone="warning"
        title="Firm access unavailable"
        text={query.data.message}
        actions={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Try again
          </Button>
        }
      />
    );
  if (query.data.kind === 'needs_setup')
    return <InitialFirmSetup client={client} userId={userId} onRefresh={() => query.refetch()} />;
  const firm = query.data.firm;
  const refresh = async () => {
    const current = await query.refetch();
    if (current.data?.kind === 'available' && !current.isError)
      setEditVersion((version) => version + 1);
  };
  return (
    <>
      {saved && <Banner tone="success" role="status" title="Firm name saved." />}
      <LiveFirmProfileForm
        key={`${firm.id}:${firm.canRename}:${editVersion}`}
        firm={firm}
        client={client}
        refresh={refresh}
        onEdit={() => setSaved(false)}
        onSaved={() => {
          setSaved(true);
          void cache.invalidateQueries({ queryKey: [...queryNamespace, context, 'executions'] });
        }}
      />
      <StaffAccessCard
        client={client}
        context={context}
        userId={userId}
        firmId={firm.id}
        canRename={firm.canRename}
        onAccessChanged={recheckAccess}
        onAccessDenied={denyAccess}
      />
      {firm.canRename && (
        <>
          <StaffRoles
            client={client}
            context={context}
            firmId={firm.id}
            onAccessChanged={recheckAccess}
          />
          <StaffLifecycle
            client={client}
            context={context}
            firmId={firm.id}
            userId={userId}
            onAccessChanged={recheckAccess}
          />
          <StaffInvitations client={client} context={context} userId={userId} firmId={firm.id} />
          <ProcessingAvailability client={client} context={context} />
          <FirmBackgroundWork client={client} context={context} firmId={query.data.firm.id} />
        </>
      )}
    </>
  );
}

function LiveFirmProfileForm({
  firm,
  client,
  refresh,
  onEdit,
  onSaved,
}: {
  firm: FirmProfile;
  client: ReturnType<typeof createApiClient>;
  refresh: () => Promise<unknown>;
  onEdit: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(firm.name);
  // Background reads do not replace the revision the user actually reviewed.
  const [reviewedRevision] = useState(firm.revision);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; reload?: boolean }>();
  const intent = useRef<{ body: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const save = async () => {
    if (inFlight.current || !firm.canRename) return;
    const parsed = renameFirmSchema.safeParse({ name, expectedRevision: reviewedRevision });
    if (!parsed.success) {
      setMessage({ text: 'Enter a firm name between 1 and 200 characters.' });
      return;
    }
    const body = JSON.stringify(parsed.data);
    if (intent.current?.body !== body) intent.current = { body, key: crypto.randomUUID() };
    const key = intent.current.key;
    inFlight.current = true;
    setSaving(true);
    setMessage(undefined);
    try {
      renameFirmResultSchema.parse(
        await client.renameFirm(parsed.data, {
          idempotencyKey: key,
          requestId: crypto.randomUUID(),
        }),
      );
      if (!mounted.current) return;
      intent.current = null;
      onSaved();
      // Read current state rather than installing a potentially older replayed receipt.
      await refresh();
    } catch (error) {
      if (!mounted.current) return;
      const denied = error instanceof ApiError && [401, 403].includes(error.status);
      const conflict = error instanceof ApiError && error.status === 409;
      if (denied) {
        await refresh();
        return;
      }
      setMessage({
        reload: conflict,
        text: conflict
          ? 'The firm profile changed. Load the current profile and review your edit before saving again.'
          : 'The save could not be confirmed. Try again to safely check the same edit.',
      });
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <Card
      title="Firm profile"
      subtitle={
        firm.canRename
          ? 'Update the name shown for your firm.'
          : 'Your current role can view this profile.'
      }
    >
      <form
        className="cl-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        aria-busy={saving}
      >
        <Field label="Firm name">
          <Input
            aria-label="Firm name"
            value={name}
            maxLength={200}
            required
            readOnly={!firm.canRename}
            disabled={saving}
            autoComplete="organization"
            onChange={(event) => {
              setName(event.target.value);
              setMessage(undefined);
              onEdit();
            }}
          />
        </Field>
        {message && (
          <Banner
            tone="warning"
            role="alert"
            title={message.text}
            actions={
              message.reload ? (
                <Button variant="secondary" onClick={() => void refresh()}>
                  Load current profile
                </Button>
              ) : undefined
            }
          />
        )}
        {firm.canRename && (
          <div className="cl-inline">
            <Button
              type="submit"
              variant="primary"
              disabled={saving || name.trim() === firm.name || Boolean(message?.reload)}
            >
              {saving ? 'Saving…' : 'Save firm name'}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
