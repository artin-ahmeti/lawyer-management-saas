'use client';

import { Banner, Button, Skeleton } from '@lawfirm/ui-web';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { previewMode } from '@/lib/env';
import { decodedStaffSessionScope, staffSessionBoundaryKey } from '@/lib/firm-session';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useOverlays } from '@/stores/ui';
import {
  StaffWorkspaceTransition,
  StaffWorkspaceTransitionContext,
  type StaffWorkspaceTransitionRequest,
} from './StaffWorkspaceTransition';
import { StaffIdentitySessionContext } from '@/lib/staff-shell';

export function StaffSessionBoundary({ children }: { children: ReactNode }) {
  return previewMode ? children : <LiveSessionBoundary>{children}</LiveSessionBoundary>;
}

function LiveSessionBoundary({ children }: { children: ReactNode }) {
  const auth = getSupabaseBrowser();
  const cache = useQueryClient();
  const context = useRef<string | null>(null);
  const [identity, setIdentity] = useState<{
    context: string | null;
    session?: Session | null;
    error?: boolean;
  }>();
  const [transition, setTransition] = useState<StaffWorkspaceTransitionRequest>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!auth) return;
    let active = true,
      receivedEvent = false;
    const apply = (session: Session | null) => {
      if (!active) return;
      const next = session ? staffSessionBoundaryKey(session) : null;
      if (!next || (context.current && context.current !== next)) {
        void cache.cancelQueries();
        cache.clear();
        useOverlays.setState(useOverlays.getInitialState(), true);
      }
      context.current = next;
      setIdentity({ context: next, session });
      setTransition((current) =>
        current &&
        session?.user.id === current.userId &&
        decodedStaffSessionScope(session)?.sessionId === current.sessionId
          ? current
          : undefined,
      );
    };
    const { data } = auth.auth.onAuthStateChange((_event, session) => {
      receivedEvent = true;
      apply(session);
    });
    void auth.auth
      .getSession()
      .then(({ data: current, error }) => {
        if (!active || receivedEvent) return;
        if (error) setIdentity({ context: null, error: true });
        else apply(current.session);
      })
      .catch(() => {
        if (active && !receivedEvent) setIdentity({ context: null, error: true });
      });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [auth, cache, attempt]);

  if (!auth)
    return (
      <Banner
        tone="warning"
        title="Workspace session unavailable"
        text="Authentication is not configured for this installation."
      />
    );
  if (!identity)
    return (
      <div role="status" aria-label="Loading workspace session">
        <Skeleton height={160} />
      </div>
    );
  if (identity.error)
    return (
      <Banner
        tone="warning"
        role="alert"
        title="Your session could not be loaded"
        actions={
          <Button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry session
          </Button>
        }
      />
    );
  if (!identity.context)
    return (
      <Banner
        tone="warning"
        role="status"
        title="You are signed out of this browser"
        actions={
          <Link href="/sign-in" className="cl-btn cl-btn--secondary">
            Sign in
          </Link>
        }
      />
    );
  // Context changes discard component drafts; decoded claims remain cache keys, never grants.
  const begin: React.ContextType<typeof StaffWorkspaceTransitionContext> = (intent, targetName) => {
    const scope = identity.session && decodedStaffSessionScope(identity.session);
    if (!scope || !identity.session) return;
    void cache.cancelQueries();
    cache.clear();
    useOverlays.setState(useOverlays.getInitialState(), true);
    setTransition({
      intent,
      targetName,
      userId: identity.session.user.id,
      sessionId: scope.sessionId,
    });
  };
  return (
    <StaffWorkspaceTransitionContext.Provider value={begin}>
      {transition ? (
        <StaffWorkspaceTransition key={transition.intent.idempotencyKey} request={transition} />
      ) : (
        <StaffIdentitySessionContext.Provider value={identity.session ?? null}>
          <Fragment key={identity.context}>{children}</Fragment>
        </StaffIdentitySessionContext.Provider>
      )}
    </StaffWorkspaceTransitionContext.Provider>
  );
}
