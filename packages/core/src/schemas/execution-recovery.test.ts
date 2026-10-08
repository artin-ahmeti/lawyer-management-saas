import { expect, it } from 'vitest';
import { recoverExecutionSchema, recoveryReviewSchema } from './execution-recovery.js';

it('requires a bounded reason and the actual reviewed record revisions and outcome', () => {
  const input = {
    reason: ' Verified current profile ',
    expectedRevision: 2,
    expectedSourceRevision: 1,
    expectedStatus: 'failed',
  };
  expect(recoverExecutionSchema.parse(input).reason).toBe('Verified current profile');
  for (const data of [
    { ...input, reason: ' ' },
    { ...input, reason: '\0' },
    { ...input, reason: 'a'.repeat(501) },
    { ...input, expectedRevision: 0 },
    { ...input, expectedStatus: 'succeeded' },
    { ...input, actor: 'owner' },
  ])
    expect(recoverExecutionSchema.safeParse(data).success).toBe(false);
});

it('cannot describe an unavailable source or a replacement as eligible for recovery', () => {
  const review = {
    jobId: '00000000-0000-4000-a000-000000000001',
    firm: {
      id: '00000000-0000-4000-a000-000000000002',
      name: 'Firm',
      revision: 2,
      canRename: true,
    },
    eligible: true,
    reason: null,
    sourceStatus: 'failed',
    sourceRevision: 1,
    replacementJobId: null,
  };
  expect(recoveryReviewSchema.parse(review)).toEqual(review);
  for (const bad of [
    { ...review, reason: 'ALREADY_RECOVERED' },
    { ...review, sourceStatus: 'running' },
    { ...review, sourceRevision: null },
    { ...review, replacementJobId: review.jobId },
    { ...review, eligible: false },
  ])
    expect(recoveryReviewSchema.safeParse(bad).success).toBe(false);
});
