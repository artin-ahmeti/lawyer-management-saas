'use client';
import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { Banner, Button, Card, Skeleton } from '@lawfirm/ui-web';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StaffLifecycleForm } from './StaffLifecycleForm';
import { loadRemovedStaff, loadStaffMembershipHistory } from './staff-lifecycle';
import { loadFirmStaff } from './staff-roles';
import styles from './StaffRoles.module.css';

export function StaffLifecycle({
  client,
  context,
  firmId,
  userId,
  onAccessChanged,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  firmId: string;
  userId: string;
  onAccessChanged: () => void;
}) {
  const cache = useQueryClient();
  const [staffAfter, setStaffAfter] = useState<string>();
  const [removedAfter, setRemovedAfter] = useState<string>();
  const [cursor, setCursor] = useState<{ beforeId: string; beforeCreatedAt: string } | null>(null);
  const [removing, setRemoving] = useState(false),
    [restoring, setRestoring] = useState(false);
  const options = {
    retry: false as const,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always' as const,
    refetchOnWindowFocus: 'always' as const,
  };
  const staff = useQuery({
    ...options,
    queryKey: ['server-firm', context, 'staff-lifecycle-current', firmId, staffAfter],
    queryFn: ({ signal }) => loadFirmStaff(client, firmId, signal, staffAfter),
  });
  const removed = useQuery({
    ...options,
    queryKey: ['server-firm', context, 'staff-lifecycle-removed', firmId, removedAfter],
    queryFn: ({ signal }) => loadRemovedStaff(client, firmId, signal, removedAfter),
  });
  const history = useQuery({
    ...options,
    queryKey: ['server-firm', context, 'staff-lifecycle-history', firmId, cursor],
    queryFn: ({ signal }) => loadStaffMembershipHistory(client, firmId, signal, cursor),
  });
  const queries = [staff, removed, history];
  const loading = queries.some((q) => q.isPending || q.isFetching);
  const error = staff.error ?? removed.error ?? history.error;
  const denied = error instanceof ApiError && [401, 403, 404].includes(error.status);
  useEffect(() => {
    if (denied) onAccessChanged();
  }, [denied, onAccessChanged]);
  const ready = !loading && !error && staff.data && removed.data && history.data;
  const refresh = () => queries.forEach((q) => void q.refetch());
  const changed = () => {
    setCursor(null);
    refresh();
    for (const key of ['staff-roles', 'staff-role-history', 'staff-access'])
      void cache.invalidateQueries({ queryKey: ['server-firm', context, key] });
    onAccessChanged();
  };
  const label = (id: string) => {
    const person = [...(staff.data?.items ?? []), ...(removed.data?.items ?? [])].find(
      (p) => p.userId === id,
    );
    return person?.name ?? person?.email ?? id;
  };
  const pager = (
    show: boolean,
    text: string,
    onClick: () => void,
    disabled = removing || restoring,
  ) =>
    show && (
      <Button disabled={disabled} onClick={onClick}>
        {text}
      </Button>
    );
  return (
    <Card
      className={styles.card}
      title={<h2 className="cl-t-title-2">Staff membership</h2>}
      subtitle="Remove staff from the firm or restore a removed membership."
      headerAction={
        <Button variant="secondary" onClick={refresh}>
          Refresh staff membership
        </Button>
      }
    >
      <div className="cl-stack cl-stack--lg">
        {loading ? (
          <div role="status" aria-label="Loading staff membership">
            <Skeleton height={120} />
          </div>
        ) : (
          error && (
            <Banner
              role="alert"
              tone="warning"
              title={
                denied
                  ? 'Staff membership management unavailable'
                  : 'Staff membership could not be loaded'
              }
              text="Refresh to check current access before making a change."
              actions={<Button onClick={refresh}>Retry staff membership</Button>}
            />
          )
        )}
        {/* Hide warm records on read failure, retain each uncertain intent until a confirmed denial. */}
        {!denied && (
          <div className="cl-stack cl-stack--md" hidden={!ready}>
            <h3 className="cl-t-title-3">Remove a staff member</h3>
            <p className="cl-muted">
              Removal ends firm access at once and revokes every matter grant. A manager handoff is
              needed first when they are the last manager of a matter.
            </p>
            <StaffLifecycleForm
              client={client}
              firmId={firmId}
              mode="remove"
              people={staff.data?.items ?? []}
              assignableRoles={staff.data?.assignableRoles ?? []}
              currentUserId={userId}
              onChanged={changed}
              onRefresh={refresh}
              onIntentChange={setRemoving}
            />
            <div className={styles.actions}>
              {pager(!!staffAfter, 'First current staff', () => setStaffAfter(undefined))}
              {pager(!!staff.data?.nextCursor, 'Next current staff', () =>
                setStaffAfter(staff.data!.nextCursor!),
              )}
            </div>
            <h3 className="cl-t-title-3">Removed staff</h3>
            {ready && !removed.data!.items.length ? (
              <p>No removed staff on this page.</p>
            ) : (
              <ul className={styles.list} aria-label="Removed firm staff">
                {removed.data?.items.map((person) => (
                  <li key={person.userId} className={`${styles.item} ${styles.body}`}>
                    <strong>{person.name ?? person.email ?? 'Unnamed account'}</strong>
                    <p className="cl-muted">
                      {person.role} · Removed {new Date(person.removedAt).toLocaleString()} ·
                      Membership revision {person.revision}
                      {!person.isAvailable && ' · Account unavailable'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.actions}>
              {pager(!!removedAfter, 'First removed staff', () => setRemovedAfter(undefined))}
              {pager(!!removed.data?.nextCursor, 'Next removed staff', () =>
                setRemovedAfter(removed.data!.nextCursor!),
              )}
            </div>
            <h3 className="cl-t-title-3">Restore a staff member</h3>
            <StaffLifecycleForm
              client={client}
              firmId={firmId}
              mode="restore"
              people={removed.data?.items ?? []}
              assignableRoles={removed.data?.assignableRoles ?? []}
              currentUserId={userId}
              onChanged={changed}
              onRefresh={refresh}
              onIntentChange={setRestoring}
            />
          </div>
        )}
        {ready && (
          <div className="cl-stack cl-stack--sm">
            <h3 className="cl-t-title-3">Membership history</h3>
            {!history.data!.items.length ? (
              <p>No removals or restorations recorded yet.</p>
            ) : (
              <ol className={styles.list} aria-label="Staff membership history">
                {history.data!.items.map((entry) => (
                  <li key={entry.id} className={`${styles.item} ${styles.body}`}>
                    <strong>
                      {entry.change === 'removed'
                        ? `Removed · ${entry.previousRole}`
                        : `Restored · ${entry.previousRole} → ${entry.role}`}{' '}
                      · Membership revision {entry.revision}
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
              {pager(!!cursor, 'Latest membership history', () => setCursor(null), false)}
              {pager(
                !!history.data!.nextCursor,
                'Older membership history',
                () => setCursor(history.data!.nextCursor),
                false,
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
