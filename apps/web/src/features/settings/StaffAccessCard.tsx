'use client';
import type { createApiClient } from '@lawfirm/api-client';
import type { FirmCapability, FirmRole } from '@lawfirm/core';
import { Banner, Button, Card, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { loadStaffContext } from './staff-access';
import styles from './FirmBackgroundWork.module.css';

const roles: Record<FirmRole, string> = {
  owner: 'Firm owner',
  admin: 'Administrator',
  attorney: 'Attorney',
  paralegal: 'Paralegal',
  billing: 'Billing staff',
  readonly: 'Read-only staff',
};
const permissions: Record<FirmCapability, string> = {
  'firm.profile.read': 'Read the firm profile',
  'firm.profile.rename': 'Rename the firm',
  'firm.processing.inspect': 'Inspect background checks',
  'firm.processing.request': 'Request reviewed profile checks',
  'firm.staff.invitations.manage': 'Prepare and revoke staff invitations',
  'firm.staff.roles.manage': 'Review staff and change eligible roles',
  'firm.staff.memberships.manage': 'Remove and restore staff memberships',
};
export function StaffAccessCard({
  client,
  context,
  userId,
  firmId,
  canRename,
  onAccessChanged,
  onAccessDenied,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  userId: string;
  firmId: string;
  canRename: boolean;
  onAccessChanged: () => void;
  onAccessDenied: () => void;
}) {
  const query = useQuery({
    queryKey: ['server-firm', context, 'staff-access'],
    queryFn: ({ signal }) => loadStaffContext(client, userId, firmId, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    refetchOnWindowFocus: 'always',
  });
  useEffect(() => {
    if (query.data?.kind === 'denied') onAccessDenied();
    else if (
      query.data?.kind === 'available' &&
      query.data.context.capabilities.includes('firm.profile.rename') !== canRename
    )
      onAccessChanged();
  }, [query.data, canRename, onAccessChanged, onAccessDenied]);
  let content;
  if (query.isPending || query.isFetching)
    content = (
      <div role="status" aria-label="Checking current access">
        <Skeleton height={100} />
      </div>
    );
  else if (query.isError)
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Current access could not be checked"
        text="Check your connection and refresh. Previous permissions are not shown."
      />
    );
  else if (query.data.kind === 'denied')
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Firm access unavailable"
        text="Your current firm membership could not be confirmed."
      />
    );
  else
    content = (
      <div className="cl-stack cl-stack--sm">
        <p className={styles.description}>
          Staff role: <strong>{roles[query.data.context.role]}</strong>
        </p>
        <p className={styles.description}>
          Checked {new Date(query.dataUpdatedAt).toLocaleString()}.
        </p>
        <ul aria-label="Current firm permissions" className={styles.history}>
          {query.data.context.capabilities.map((permission) => (
            <li key={permission}>{permissions[permission]}</li>
          ))}
        </ul>
      </div>
    );
  return (
    <section aria-label="Current firm access">
      <Card
        className={styles.panel}
        title={<h2 className="cl-t-title-3">Your access</h2>}
        subtitle="These permissions apply to the firm profile, staff invitations and background checks."
        headerAction={
          <Button
            type="button"
            variant="secondary"
            className={styles.refresh}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh access
          </Button>
        }
      >
        {content}
      </Card>
    </section>
  );
}
