import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { firmExecutionListSchema, type FirmExecutionList } from '@lawfirm/core';
import type { PillTone } from '@lawfirm/ui-web';

export type FirmExecution = FirmExecutionList['items'][number];
export type FirmExecutionsRead = { kind: 'available'; items: FirmExecution[] } | { kind: 'denied' };

export async function loadFirmExecutions(
  client: Pick<ReturnType<typeof createApiClient>, 'firmExecutions'>,
  signal?: AbortSignal,
): Promise<FirmExecutionsRead> {
  try {
    const result = firmExecutionListSchema.parse(await client.firmExecutions(signal));
    return { kind: 'available', items: result.items };
  } catch (error) {
    // A fresh denial replaces previously authorized data. Other failures remain errors.
    if (error instanceof ApiError && [401, 403].includes(error.status)) return { kind: 'denied' };
    throw error;
  }
}

const states: Record<FirmExecution['status'], { label: string; detail: string; tone: PillTone }> = {
  awaiting_dispatch: {
    label: 'Waiting to start',
    tone: 'neutral',
    detail: 'The saved change is waiting for background processing. The check has not completed.',
  },
  pending: {
    label: 'Queued',
    tone: 'neutral',
    detail: 'Waiting for a worker to check the saved change. The check has not completed.',
  },
  running: {
    label: 'Processing',
    tone: 'info',
    detail: 'A worker has claimed this check. Completion has not been confirmed.',
  },
  retry: {
    label: 'Retry pending',
    tone: 'warning',
    detail: 'The check could not complete. Automatic processing will try again.',
  },
  succeeded: {
    label: 'Completed',
    tone: 'success',
    detail:
      'The saved firm profile was verified. No messages were sent or connected services updated.',
  },
  blocked: {
    label: 'Blocked',
    tone: 'warning',
    detail: 'This check cannot proceed. Review the current firm profile and access permissions.',
  },
  failed: {
    label: 'Failed',
    tone: 'danger',
    detail: 'Automatic processing has stopped. This check has not completed.',
  },
};

export const executionErrorReasons: Record<NonNullable<FirmExecution['errorCode']>, string> = {
  QUEUE_UNAVAILABLE:
    'The processing queue was unavailable. The saved change is retained for another dispatch attempt.',
  ACCESS_REVOKED: 'The initiating staff member no longer has permission to run this check.',
  SOURCE_CHANGED:
    'The firm profile changed after this check was requested. Review the current profile.',
  SOURCE_UNAVAILABLE: 'The saved source for this check is no longer available.',
  INVALID_EVENT: 'The saved request could not be validated. This check cannot proceed.',
  UNSUPPORTED_EVENT: 'This type of check is unavailable.',
  PROCESSING_FAILED: 'The previous processing attempt could not complete.',
  ATTEMPTS_EXHAUSTED: 'The automatic attempt limit was reached.',
};

/** Presentation only: server records own status, retry eligibility and authorization. */
export function describeFirmExecution(item: FirmExecution) {
  const state = states[item.status];
  const reason = item.errorCode ? executionErrorReasons[item.errorCode] : null;
  const showReason = reason && item.status !== 'succeeded' && item.status !== 'running';
  return {
    ...state,
    detail: showReason ? `${state.detail} ${reason}` : state.detail,
    nextAttemptAt:
      item.status === 'retry' ||
      (item.status === 'awaiting_dispatch' && item.errorCode === 'QUEUE_UNAVAILABLE')
        ? item.availableAt
        : null,
  };
}
