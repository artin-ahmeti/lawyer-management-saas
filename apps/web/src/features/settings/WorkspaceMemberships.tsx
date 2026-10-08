'use client';

import type { createApiClient } from '@lawfirm/api-client';
import type { FirmRole } from '@lawfirm/core';
import { Banner, Button, Card, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useContext, useState } from 'react';
import { loadStaffMemberships } from './staff-memberships';
import styles from './StaffInvitations.module.css';
import { loadActiveFirmSelection, prepareStaffFirmSelection } from './staff-firm-selection';
import { StaffWorkspaceTransitionContext } from '@/features/auth/StaffWorkspaceTransition';

const roles: Record<FirmRole, string> = {
  owner: 'Firm owner',
  admin: 'Administrator',
  attorney: 'Attorney',
  paralegal: 'Paralegal',
  billing: 'Billing staff',
  readonly: 'Read-only staff',
};

export function WorkspaceMemberships({
  client,
  context,
  userId,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  userId: string;
}) {
  const [afterId, setAfterId] = useState<string>();
  const beginSwitch = useContext(StaffWorkspaceTransitionContext);
  const selection = useQuery({
    queryKey: ['server-firm', context, 'active-selection'],
    queryFn: ({ signal }) => loadActiveFirmSelection(client, userId, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    refetchOnWindowFocus: 'always',
  });
  const query = useQuery({
    queryKey: ['server-firm', context, 'memberships', afterId],
    queryFn: ({ signal }) => loadStaffMemberships(client, userId, afterId, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    refetchOnWindowFocus: 'always',
  });
  let content;
  if (query.isPending || query.isFetching)
    content = (
      <div role="status" aria-label="Loading workspaces">
        <Skeleton height={100} />
      </div>
    );
  else if (query.isError)
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Your workspaces could not be loaded"
        text="Check your connection and refresh. Previous workspace names are not shown."
      />
    );
  else if (query.data.kind === 'denied')
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Workspace access unavailable"
        text="Your confirmed account could not be checked. Sign in again or refresh."
      />
    );
  else {
    const page = query.data.page;
    content = (
      <div className="cl-stack cl-stack--sm">
        {page.items.length ? (
          <ul className={styles.list} role="list" aria-label="Available staff workspaces">
            {page.items.map((membership) => (
              <li className={styles.row} key={membership.id}>
                <div className={styles.details}>
                  <strong>{membership.firmName}</strong>
                  <p>{roles[membership.role]}</p>
                  {selection.data?.firmId === membership.firmId &&
                    !selection.isFetching &&
                    !selection.isError && <p>Selected workspace</p>}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className={styles.control}
                  aria-label={`Use workspace ${membership.firmName}`}
                  disabled={
                    !beginSwitch || !selection.data || selection.isFetching || selection.isError
                  }
                  onClick={() => {
                    if (selection.data)
                      beginSwitch?.(
                        prepareStaffFirmSelection(membership.firmId, selection.data.revision),
                        membership.firmName,
                      );
                  }}
                >
                  Use workspace
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note} role="status">
            No current staff memberships on this page.
          </p>
        )}
        <div className={styles.controls}>
          {afterId && (
            <Button
              type="button"
              variant="secondary"
              className={styles.control}
              onClick={() => setAfterId(undefined)}
            >
              First page
            </Button>
          )}
          {page.nextCursor && (
            <Button
              type="button"
              variant="secondary"
              className={styles.control}
              onClick={() => setAfterId(page.nextCursor!.afterId)}
            >
              Next workspaces
            </Button>
          )}
        </div>
        {selection.isError ? (
          <Banner
            tone="warning"
            role="alert"
            title="Workspace selection unavailable"
            text="Refresh workspaces to check your current session."
          />
        ) : (
          <p className={styles.note}>
            {selection.isPending || selection.isFetching
              ? 'Checking current workspace selection…'
              : 'Select a workspace to review switching this login session. Unsaved page inputs will be closed.'}
          </p>
        )}
      </div>
    );
  }
  return (
    <section aria-label="Your workspaces">
      <Card
        className={styles.panel}
        title={<h2 className="cl-t-title-3">Your workspaces</h2>}
        subtitle="Current staff memberships for your account."
        headerAction={
          <Button
            type="button"
            variant="secondary"
            className={styles.control}
            disabled={query.isFetching || selection.isFetching}
            onClick={() => {
              void query.refetch();
              void selection.refetch();
            }}
          >
            Refresh workspaces
          </Button>
        }
      >
        {content}
      </Card>
    </section>
  );
}
