'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { Banner, Button, Card, Skeleton } from '@lawfirm/ui-web';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StaffRoleForm } from './StaffRoleForm';
import { loadFirmStaff, loadStaffRoleHistory } from './staff-roles';
import styles from './StaffRoles.module.css';

export function StaffRoles({
  client,
  context,
  firmId,
  onAccessChanged,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  firmId: string;
  onAccessChanged: () => void;
}) {
  const cache = useQueryClient();
  const [afterId, setAfterId] = useState<string>();
  const [cursor, setCursor] = useState<{ beforeId: string; beforeCreatedAt: string } | null>(null);
  const [pendingIntent, setPendingIntent] = useState(false);
  const options = {
    retry: false as const,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always' as const,
    refetchOnWindowFocus: 'always' as const,
  };
  const staff = useQuery({
    ...options,
    queryKey: ['server-firm', context, 'staff-roles', firmId, afterId],
    queryFn: ({ signal }) => loadFirmStaff(client, firmId, signal, afterId),
  });
  const history = useQuery({
    ...options,
    queryKey: ['server-firm', context, 'staff-role-history', firmId, cursor],
    queryFn: ({ signal }) => loadStaffRoleHistory(client, firmId, signal, cursor),
  });
  const loading = staff.isPending || staff.isFetching || history.isPending || history.isFetching;
  const error = staff.error ?? history.error;
  const denied = error instanceof ApiError && [401, 403, 404].includes(error.status);
  useEffect(() => {
    if (denied) onAccessChanged();
  }, [denied, onAccessChanged]);
  const ready = !loading && !error && staff.data && history.data;
  const refresh = () => {
    void staff.refetch();
    void history.refetch();
  };
  const changed = () => {
    setCursor(null);
    refresh();
    void cache.invalidateQueries({ queryKey: ['server-firm', context, 'staff-access'] });
    onAccessChanged();
  };
  const label = (id: string) => {
    const person = staff.data?.items.find((p) => p.userId === id);
    return person?.name ?? person?.email ?? id;
  };
  return (
    <Card
      className={styles.card}
      title={<h2 className="cl-t-title-2">Staff roles</h2>}
      subtitle="Review firm staff and record changes to their responsibilities."
      headerAction={
        <Button variant="secondary" onClick={refresh}>
          Refresh staff roles
        </Button>
      }
    >
      {loading ? (
        <div role="status" aria-label="Loading staff roles">
          <Skeleton height={120} />
        </div>
      ) : error ? (
        <Banner
          role="alert"
          tone="warning"
          title={denied ? 'Staff role management unavailable' : 'Staff roles could not be loaded'}
          text="Refresh to check current access before making a change."
          actions={<Button onClick={refresh}>Retry staff roles</Button>}
        />
      ) : (
        ready && (
          <div className="cl-stack cl-stack--md">
            <h3 className="cl-t-title-3">Current staff</h3>
            <ul className={styles.list} aria-label="Current firm staff">
              {staff.data!.items.map((person) => (
                <li key={person.userId} className={`${styles.item} ${styles.body}`}>
                  <strong>{person.name ?? person.email}</strong>
                  <p className="cl-muted">
                    {person.role} · Membership revision {person.revision}
                    {!person.isAvailable && ' · Account unavailable'}
                  </p>
                </li>
              ))}
            </ul>
            {!staff.data!.items.length && <p>No current staff on this page.</p>}
            <div className={styles.actions}>
              {afterId && (
                <Button disabled={pendingIntent} onClick={() => setAfterId(undefined)}>
                  First staff
                </Button>
              )}
              {staff.data!.nextCursor && (
                <Button
                  disabled={pendingIntent}
                  onClick={() => setAfterId(staff.data!.nextCursor!)}
                >
                  Next staff
                </Button>
              )}
            </div>
            <h3 className="cl-t-title-3">Change a role</h3>
          </div>
        )
      )}
      {/* Hide warm records on read failure, retain the same uncertain intent until a confirmed denial. */}
      {!denied && (
        <div hidden={!ready}>
          <StaffRoleForm
            client={client}
            firmId={firmId}
            staff={staff.data ?? { firmId, items: [], assignableRoles: [], nextCursor: null }}
            onChanged={changed}
            onRefresh={refresh}
            onIntentChange={setPendingIntent}
          />
        </div>
      )}
      {ready && (
        <div className="cl-stack cl-stack--sm">
          <h3 className="cl-t-title-3">Role history</h3>
          {!history.data!.items.length ? (
            <p>No role changes recorded yet.</p>
          ) : (
            <ol className={styles.list} aria-label="Staff role history">
              {history.data!.items.map((entry) => (
                <li key={entry.id} className={`${styles.item} ${styles.body}`}>
                  <strong>
                    {entry.previousRole} → {entry.role} · Membership revision {entry.revision}
                  </strong>
                  <p>{entry.reason}</p>
                  <p className="cl-muted">
                    {new Date(entry.createdAt).toLocaleString()} · Staff {label(entry.userId)} ·
                    Changed by {label(entry.actorId)}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <div className={styles.actions}>
            {cursor && <Button onClick={() => setCursor(null)}>Latest role history</Button>}
            {history.data!.nextCursor && (
              <Button onClick={() => setCursor(history.data!.nextCursor)}>
                Older role history
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
