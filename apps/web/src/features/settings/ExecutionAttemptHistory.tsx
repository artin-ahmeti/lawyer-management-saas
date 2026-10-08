'use client';

import type { createApiClient } from '@lawfirm/api-client';
import { Banner, Button, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { describeExecutionAttempt, loadExecutionHistory } from './execution-history';
import styles from './FirmBackgroundWork.module.css';

const timestamp = (value: string | number) => new Date(value).toLocaleString();

export function ExecutionAttemptHistory({
  client,
  context,
  jobId,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  jobId: string;
}) {
  const query = useQuery({
    queryKey: ['server-firm', context, 'execution-history', jobId],
    queryFn: ({ signal }) => loadExecutionHistory(client, jobId, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    refetchOnWindowFocus: 'always',
  });
  let content;
  if (query.isPending || query.isFetching) {
    content = (
      <div role="status" aria-label="Loading attempt history">
        <Skeleton height={80} />
      </div>
    );
  } else if (query.isError) {
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Attempt history could not be checked"
        text="Current history is unavailable. Check your connection and refresh. Refreshing does not rerun work."
      />
    );
  } else if (query.data.kind === 'denied') {
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Attempt-history access unavailable"
        text="An active firm owner or administrator can inspect attempts. Previous history has been cleared."
      />
    );
  } else if (query.data.kind === 'unavailable') {
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="This check is unavailable"
        text="The source may have been removed or access changed. Previous history has been cleared."
      />
    );
  } else {
    const { history } = query.data;
    content = (
      <>
        <p className={styles.description} role="status">
          Checked {timestamp(query.dataUpdatedAt)}.
        </p>
        {history.unrecordedAttempts > 0 && (
          <p className={styles.description}>
            {history.unrecordedAttempts} of {history.attemptCount} attempts have no retained
            details. Details were not recorded for these attempts.
          </p>
        )}
        {history.items.length === 0 ? (
          <p className={styles.description}>
            {history.attemptCount === 0
              ? 'No processing attempts have started.'
              : 'No individual attempt details are available.'}
          </p>
        ) : (
          <ol className={styles.history} aria-label="Recorded processing attempts">
            {history.items.map((attempt) => {
              const view = describeExecutionAttempt(attempt);
              return (
                <li key={attempt.number} value={attempt.number}>
                  <p className={styles.description}>
                    <strong>
                      Attempt {attempt.number}: {view.label}
                    </strong>
                  </p>
                  <p className={styles.description}>{view.detail}</p>
                  <p className={styles.description}>
                    Started <time dateTime={attempt.startedAt}>{timestamp(attempt.startedAt)}</time>
                    .
                    {attempt.finishedAt && (
                      <>
                        {' '}
                        Outcome recorded{' '}
                        <time dateTime={attempt.finishedAt}>{timestamp(attempt.finishedAt)}</time>.
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </>
    );
  }
  return (
    <section aria-label="Execution attempt history" className="cl-stack cl-stack--sm">
      <h3 className="cl-t-body-sm">Attempt history</h3>
      {content}
      <Button
        type="button"
        variant="secondary"
        className={styles.refresh}
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        Refresh attempt history
      </Button>
    </section>
  );
}
