'use client';

import type { createApiClient } from '@lawfirm/api-client';
import { Banner, Button, Card, List, ListRow, Pill, Skeleton } from '@lawfirm/ui-web';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ExecutionAttemptHistory } from './ExecutionAttemptHistory';
import { ExecutionRecovery } from './ExecutionRecovery';
import { describeFirmExecution, loadFirmExecutions, type FirmExecution } from './firm-executions';
import styles from './FirmBackgroundWork.module.css';

const timestamp = (value: string | number) => new Date(value).toLocaleString();

export function FirmBackgroundWork({
  client,
  context,
  firmId,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  firmId: string;
}) {
  const cache = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const query = useQuery({
    // The existing session boundary cancels/removes this namespace on context change/unmount.
    queryKey: ['server-firm', context, 'executions'],
    queryFn: ({ signal }) => loadFirmExecutions(client, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    refetchOnWindowFocus: 'always',
  });
  let content;
  if (denied) {
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Background-work access unavailable"
        text="Current administrator access is required. Previous results have been cleared."
      />
    );
  } else if (query.isPending || query.isFetching) {
    content = (
      <div role="status" aria-label="Checking background work">
        <Skeleton height={120} />
      </div>
    );
  } else if (query.isError) {
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Background work could not be checked"
        text="Current results are unavailable. Check your connection and refresh. Refreshing does not rerun a job."
      />
    );
  } else if (query.data.kind === 'denied') {
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Background-work access unavailable"
        text="An active firm owner or administrator can inspect these checks. Previous results have been cleared."
      />
    );
  } else {
    content = (
      <>
        <p className="cl-t-caption cl-muted" role="status">
          Checked {timestamp(query.dataUpdatedAt)}. Refresh to check for changes.
        </p>
        {query.data.items.length === 0 ? (
          <p className="cl-t-body-sm">No firm-profile background work yet.</p>
        ) : (
          <List flat role="list" aria-label="Firm-profile background checks">
            {query.data.items.map((item) => (
              <ExecutionRow
                key={item.id}
                item={item}
                client={client}
                context={context}
                firmId={firmId}
                onRecovered={(id) => {
                  setNotice(
                    `New profile check requested. Refresh background work for its current outcome. Reference: ${id}.`,
                  );
                  void query.refetch();
                }}
                onAccessDenied={() => {
                  setDenied(true);
                  setNotice(null);
                  void cache.resetQueries({ queryKey: ['server-firm', context] });
                }}
              />
            ))}
          </List>
        )}
      </>
    );
  }
  return (
    <section aria-labelledby="firm-background-work-title">
      <Card
        className={styles.panel}
        title={
          <h2 id="firm-background-work-title" className="cl-t-title-3">
            Background work
          </h2>
        }
        subtitle="Up to 20 recent firm-profile checks. Other background work is not included."
        headerAction={
          <Button
            type="button"
            variant="secondary"
            className={styles.refresh}
            disabled={query.isFetching}
            onClick={() => {
              setDenied(false);
              void query.refetch();
            }}
          >
            Refresh background work
          </Button>
        }
      >
        {notice &&
          !denied &&
          query.data?.kind === 'available' &&
          !query.isFetching &&
          !query.isError && (
            <p role="status" className={styles.description}>
              {notice}
            </p>
          )}
        {content}
      </Card>
    </section>
  );
}

function ExecutionRow({
  item,
  client,
  context,
  firmId,
  onRecovered,
  onAccessDenied,
}: {
  item: FirmExecution;
  client: ReturnType<typeof createApiClient>;
  context: string;
  firmId: string;
  onRecovered: (id: string) => void;
  onAccessDenied: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const view = describeFirmExecution(item);
  return (
    <ListRow
      role="listitem"
      className={styles.row}
      data-execution-id={item.id}
      title="Firm profile check"
      pill={<Pill tone={view.tone}>{view.label}</Pill>}
      subtitle={
        <div className="cl-stack cl-stack--sm">
          <p className={styles.description}>{view.detail}</p>
          {view.nextAttemptAt && (
            <p className={styles.description}>
              Next attempt eligible after{' '}
              <time dateTime={view.nextAttemptAt}>{timestamp(view.nextAttemptAt)}</time>. Completion
              depends on processing availability.
            </p>
          )}
          {item.completedAt && (
            <p className={styles.description}>
              Finished <time dateTime={item.completedAt}>{timestamp(item.completedAt)}</time>.
            </p>
          )}
          <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
            <summary className={styles.detailsToggle}>Processing details</summary>
            <dl className={styles.details}>
              <dt>Processing attempts</dt>
              <dd>{item.attempts} of 5</dd>
              <dt>Dispatch attempts</dt>
              <dd>{item.dispatchAttempts}</dd>
              <dt>Job reference</dt>
              <dd>{item.id}</dd>
              <dt>Action reference</dt>
              <dd>{item.commandId}</dd>
              <dt>Request reference</dt>
              <dd>{item.requestId}</dd>
            </dl>
            {expanded && (
              <ExecutionAttemptHistory client={client} context={context} jobId={item.id} />
            )}
            {expanded && ['failed', 'blocked'].includes(item.status) && (
              <ExecutionRecovery
                client={client}
                context={context}
                firmId={firmId}
                jobId={item.id}
                onRecovered={onRecovered}
                onAccessDenied={onAccessDenied}
              />
            )}
          </details>
        </div>
      }
    />
  );
}
