'use client';

import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { Banner, Button, Textarea, Skeleton } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import {
  loadRecoveryReview,
  prepareRecovery,
  submitRecovery,
  type RecoveryIntent,
} from './execution-recovery';
import styles from './FirmBackgroundWork.module.css';

export function ExecutionRecovery({
  client,
  context,
  firmId,
  jobId,
  onRecovered,
  onAccessDenied,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  firmId: string;
  jobId: string;
  onRecovered: (id: string) => void;
  onAccessDenied: () => void;
}) {
  const fieldId = useId();
  const [reason, setReason] = useState('');
  const [intent, setIntent] = useState<RecoveryIntent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const query = useQuery({
    queryKey: ['server-firm', context, 'execution-recovery', jobId],
    queryFn: ({ signal }) => loadRecoveryReview(client, jobId, firmId, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    refetchOnWindowFocus: intent === null,
  });
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      pending.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (query.data?.kind === 'denied') onAccessDenied();
  }, [query.data?.kind, onAccessDenied]);

  async function submit() {
    if (pending.current || query.data?.kind !== 'available') return;
    let action;
    try {
      action = intent ?? prepareRecovery(query.data.review, reason);
    } catch {
      setError('Enter a review reason of 1–500 characters and reload an eligible review.');
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setIntent(action);
    setBusy(true);
    setError(null);
    try {
      const result = await submitRecovery(client, action, controller.signal);
      if (live.current) onRecovered(result.jobId);
    } catch (failure) {
      if (!live.current || controller.signal.aborted) return;
      if (failure instanceof ApiError && [401, 403].includes(failure.status)) {
        onAccessDenied();
        return;
      }
      if (failure instanceof ApiError && [404, 409, 422].includes(failure.status)) {
        setIntent(null);
        setError(
          'The reviewed check changed or is unavailable. Review its current state before requesting another check.',
        );
        void query.refetch();
      } else
        setError(
          'The request outcome is unconfirmed. Check the same request to recover its result safely.',
        );
    } finally {
      pending.current = null;
      if (live.current) setBusy(false);
    }
  }
  let content;
  if (query.isPending || query.isFetching)
    content = (
      <div role="status" aria-label="Loading recovery review">
        <Skeleton height={100} />
      </div>
    );
  else if (query.isError)
    content = (
      <Banner
        tone="warning"
        role="alert"
        title="Recovery review unavailable"
        text="Check your connection and reload the review."
      />
    );
  else if (query.data.kind !== 'available')
    content = <p className={styles.description}>This check is unavailable for review.</p>;
  else if (!query.data.review.eligible && !intent)
    content = (
      <p className={styles.description}>
        {query.data.review.reason === 'ALREADY_RECOVERED' ? (
          <>
            A new check was already requested. Reference: {query.data.review.replacementJobId}.
            Refresh background work for its current outcome.
          </>
        ) : (
          'This check cannot have a new request in its current state.'
        )}
      </p>
    );
  else
    content = (
      <form
        className="cl-stack cl-stack--sm"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className={styles.description}>
          Review {query.data.review.firm.name}, profile revision{' '}
          {intent?.input.expectedRevision ?? query.data.review.firm.revision}. This requests a new
          profile check and preserves the original outcome.
        </p>
        <label htmlFor={fieldId} className="cl-t-body-sm">
          Review reason
        </label>
        <Textarea
          id={fieldId}
          value={reason}
          maxLength={500}
          required
          disabled={busy || intent !== null}
          aria-describedby={`${fieldId}-help`}
          onChange={(event) => setReason(event.target.value)}
        />
        <p id={`${fieldId}-help`} className={styles.description}>
          Record why a new check is appropriate. Up to 500 characters.
        </p>
        <Button
          type="submit"
          className={styles.refresh}
          disabled={busy || (!intent && !reason.trim())}
        >
          {busy ? 'Checking request…' : intent ? 'Check same request' : 'Request new profile check'}
        </Button>
      </form>
    );
  return (
    <section aria-label="Review failed profile check" className="cl-stack cl-stack--sm">
      <h3 className="cl-t-body-sm">Review failed check</h3>
      {error && <Banner tone="warning" role="alert" title={error} />}
      {content}
      {!intent && (
        <Button
          type="button"
          variant="secondary"
          className={styles.refresh}
          disabled={busy || query.isFetching}
          onClick={() => void query.refetch()}
        >
          Reload recovery review
        </Button>
      )}
    </section>
  );
}
