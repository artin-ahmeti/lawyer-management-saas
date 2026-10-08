'use client';
import { ApiError } from '@lawfirm/api-client';
import { Banner, Button, Card, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useLiveMatterClient } from './use-live-matter-client';
import {
  loadMatterAccess,
  loadMatterAccessCandidates,
  loadMatterAccessHistory,
} from './matter-access';
import { MatterAccessForm } from './MatterAccessForm';
import styles from './LiveMatters.module.css';

export function MatterStaffAccess({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { client, context, firmId } = useLiveMatterClient();
  const [afterGrant, setAfterGrant] = useState<string>(),
    [afterStaff, setAfterStaff] = useState<string>();
  const [beforeHistory, setBeforeHistory] = useState<{
    beforeId: string;
    beforeCreatedAt: string;
  } | null>(null);
  const [pendingIntent, setPendingIntent] = useState(false);
  const options = {
    enabled: !!firmId,
    retry: false as const,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always' as const,
    refetchOnWindowFocus: 'always' as const,
  };
  const access = useQuery({
    ...options,
    queryKey: ['server-matter-access', context, id, 'grants', afterGrant],
    queryFn: ({ signal }) => loadMatterAccess(client, firmId!, id, signal, afterGrant),
  });
  const staff = useQuery({
    ...options,
    queryKey: ['server-matter-access', context, id, 'candidates', afterStaff],
    queryFn: ({ signal }) => loadMatterAccessCandidates(client, firmId!, id, signal, afterStaff),
  });
  const history = useQuery({
    ...options,
    queryKey: ['server-matter-access', context, id, 'history', beforeHistory],
    queryFn: ({ signal }) => loadMatterAccessHistory(client, firmId!, id, signal, beforeHistory),
  });
  const queries = [access, staff, history],
    loading = queries.some((q) => q.isPending || q.isFetching),
    error = queries.find((q) => q.isError)?.error;
  const denied = error instanceof ApiError && [401, 403, 404].includes(error.status);
  const ready = !loading && !error && access.data && staff.data && history.data;
  const staffLabel = (userId: string) => {
    const person = [...(staff.data?.items ?? []), ...(access.data?.items ?? [])].find(
      (p) => p.userId === userId,
    );
    return person?.name ?? person?.email ?? userId;
  };
  const refresh = () => {
    void access.refetch();
    void staff.refetch();
    void history.refetch();
  };
  const changed = () => {
    setAfterGrant(undefined);
    setBeforeHistory(null);
    refresh();
    onChanged();
  };
  return (
    <Card
      className={styles.card}
      title={<h2 className="cl-t-title-2">Staff access</h2>}
      subtitle="Manage staff access for this matter and review the recorded changes."
      headerAction={
        <Button variant="secondary" onClick={refresh}>
          Refresh staff access
        </Button>
      }
    >
      {loading ? (
        <div role="status" aria-label="Loading staff access">
          <Skeleton height={120} />
        </div>
      ) : error ? (
        <Banner
          role="alert"
          tone="warning"
          title={
            denied ? 'Staff access management unavailable' : 'Staff access could not be loaded'
          }
          text="Refresh to check current access before making a change."
          actions={<Button onClick={refresh}>Retry staff access</Button>}
        />
      ) : (
        ready && (
          <div className="cl-stack cl-stack--md">
            <div>
              <h3 className="cl-t-title-3">Current assignments</h3>
              <p className="cl-muted">Access policy revision {access.data!.revision}</p>
              <ul className={styles.list} aria-label="Matter staff assignments">
                {access.data!.items.map((person) => (
                  <li key={person.userId} className={`${styles.item} ${styles.body}`}>
                    <strong>{person.name ?? person.email}</strong>
                    <p className="cl-muted">
                      {person.role === 'manager' ? 'Matter manager' : 'Read access'} ·{' '}
                      {person.staffRole}
                      {!person.isActive && ' · Inactive staff; no effective access'}
                    </p>
                  </li>
                ))}
              </ul>
              {!access.data!.items.length && <p>No assignments on this page.</p>}
              <div className={styles.actions}>
                {afterGrant && (
                  <Button onClick={() => setAfterGrant(undefined)}>First assignments</Button>
                )}
                {access.data!.nextCursor && (
                  <Button onClick={() => setAfterGrant(access.data!.nextCursor!)}>
                    Next assignments
                  </Button>
                )}
              </div>
            </div>
            <h3 className="cl-t-title-3">Change an assignment</h3>
          </div>
        )
      )}
      {/* Keep one unresolved intent through transient read failures; confirmed denial removes it. */}
      {firmId && !denied && (
        <div hidden={!ready}>
          <MatterAccessForm
            client={client}
            firmId={firmId}
            matterId={id}
            revision={access.data?.revision ?? 1}
            candidates={staff.data?.items ?? []}
            onChanged={changed}
            onRefresh={refresh}
            onIntentChange={setPendingIntent}
          />
          <div className={styles.actions}>
            {afterStaff && (
              <Button disabled={pendingIntent} onClick={() => setAfterStaff(undefined)}>
                First staff
              </Button>
            )}
            {staff.data?.nextCursor && (
              <Button
                disabled={pendingIntent}
                onClick={() => setAfterStaff(staff.data!.nextCursor!)}
              >
                Next staff
              </Button>
            )}
          </div>
        </div>
      )}
      {ready && (
        <div className="cl-stack cl-stack--sm">
          <h3 className="cl-t-title-3">Access history</h3>
          {!history.data!.items.length ? (
            <p>No access changes recorded yet.</p>
          ) : (
            <ol className={styles.list} aria-label="Matter access history">
              {history.data!.items.map((entry) => (
                <li key={entry.id} className={`${styles.item} ${styles.body}`}>
                  <strong>
                    Revision {entry.revision} · {entry.previousRole ?? 'No access'} →{' '}
                    {entry.role ?? 'No access'}
                  </strong>
                  <p>{entry.reason}</p>
                  <p className="cl-muted">
                    {new Date(entry.createdAt).toLocaleString()} · Staff {staffLabel(entry.userId)}{' '}
                    · Changed by {staffLabel(entry.actorId)}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <div className={styles.actions}>
            {beforeHistory && (
              <Button onClick={() => setBeforeHistory(null)}>Latest access history</Button>
            )}
            {history.data!.nextCursor && (
              <Button onClick={() => setBeforeHistory(history.data!.nextCursor)}>
                Older access history
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
