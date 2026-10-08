'use client';

import type { createApiClient } from '@lawfirm/api-client';
import { Banner, Button, Card, List, ListRow, Pill, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { loadProcessingReadiness, readinessExpiresAt } from './processing-readiness';
import styles from './FirmBackgroundWork.module.css';

export function ProcessingAvailability({
  client,
  context,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
}) {
  const query = useQuery({
    queryKey: ['server-firm', context, 'processing-readiness'],
    queryFn: ({ signal }) => loadProcessingReadiness(client, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    refetchOnWindowFocus: 'always',
  });
  const snapshot = query.data?.kind === 'available' ? query.data.snapshot : undefined;
  const deadline = snapshot ? readinessExpiresAt(snapshot) : 0;
  const [expiredCheck, setExpiredCheck] = useState<string>();
  useEffect(() => {
    if (!snapshot) return;
    const timer = setTimeout(
      () => setExpiredCheck(snapshot.checkedAt),
      Math.max(0, deadline - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [snapshot, deadline]);
  const expired = snapshot && expiredCheck === snapshot.checkedAt;
  let content;
  if (query.isPending || query.isFetching) {
    content = (
      <div role="status" aria-label="Checking processing availability">
        <Skeleton height={120} />
      </div>
    );
  } else if (query.isError) {
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Processing availability could not be checked"
        text="Current availability is unknown. Check your connection and refresh. Saved work is not rerun by this check."
      />
    );
  } else if (query.data.kind === 'denied') {
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Processing-availability access unavailable"
        text="An active firm owner or administrator can inspect availability. Previous results have been cleared."
      />
    );
  } else if (expired || !snapshot) {
    content = (
      <Banner
        tone="warning"
        role="status"
        title="Availability check expired"
        text="Refresh to check current processing availability. The previous result no longer establishes availability."
      />
    );
  } else {
    const observed = snapshot.worker === 'recently_observed';
    const available = snapshot.queue === 'available';
    content = (
      <>
        <p className="cl-t-caption cl-muted" role="status">
          Checked{' '}
          <time dateTime={snapshot.checkedAt}>{new Date(snapshot.checkedAt).toLocaleString()}</time>
          . This check expires within 15 seconds.
        </p>
        <List flat role="list" aria-label="Processing availability checks">
          <ListRow
            role="listitem"
            className={styles.row}
            title="Database"
            subtitle="Current firm access was verified."
            pill={<Pill tone="success">Available</Pill>}
          />
          <ListRow
            role="listitem"
            className={styles.row}
            title="Processing queue"
            subtitle={
              available
                ? 'The queue answered this check.'
                : snapshot.queue === 'unconfigured'
                  ? 'Processing has not been configured for this installation.'
                  : 'The queue could not be reached. Processing may be delayed.'
            }
            pill={
              <Pill tone={available ? 'success' : 'warning'}>
                {available
                  ? 'Available'
                  : snapshot.queue === 'unconfigured'
                    ? 'Not configured'
                    : 'Unavailable'}
              </Pill>
            }
          />
          <ListRow
            role="listitem"
            className={styles.row}
            title="Background worker"
            subtitle={
              observed
                ? `A worker completed a processing poll at ${new Date(snapshot.lastWorkerSeenAt!).toLocaleString()}.`
                : snapshot.worker === 'not_observed'
                  ? 'No recent processing signal was received. Pending work has not been confirmed complete.'
                  : 'Worker availability could not be checked while the queue is unavailable.'
            }
            pill={
              <Pill tone={observed ? 'success' : 'warning'}>
                {observed ? 'Recently active' : 'Unconfirmed'}
              </Pill>
            }
          />
        </List>
        <p className="cl-t-caption cl-muted">
          Availability does not confirm a job completed or a message was delivered. Check each job’s
          outcome below.
        </p>
      </>
    );
  }
  return (
    <section aria-labelledby="processing-availability-title">
      <Card
        className={styles.panel}
        title={
          <h2 id="processing-availability-title" className="cl-t-title-3">
            Processing availability
          </h2>
        }
        subtitle="A short-lived check of the services used for background processing."
        headerAction={
          <Button
            type="button"
            variant="secondary"
            className={styles.refresh}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Check processing availability
          </Button>
        }
      >
        {content}
      </Card>
    </section>
  );
}
