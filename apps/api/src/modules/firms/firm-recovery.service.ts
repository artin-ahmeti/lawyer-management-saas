import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  firmRenamedEventSchema,
  recoverExecutionResultSchema,
  recoveryReviewSchema,
  type FirmProfile,
  type RecoverExecution,
  type RecoverExecutionResult,
  type RecoveryReview,
} from '@lawfirm/core';
import type postgres from 'postgres';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { DatabaseService } from '../../common/database/database.module';
import { log } from '../../common/http';
import { FirmService } from './firm.service';

const command = 'firm.profile-check.request.v1';
type Source = {
  id: string;
  created_by: string;
  status: string;
  attempts: number;
  deleted_at: Date | null;
};
@Injectable()
export class FirmRecoveryService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(FirmService) private readonly firms: FirmService,
  ) {}

  private async inspect(
    tx: postgres.TransactionSql,
    firm: FirmProfile,
    jobId: string,
    write: boolean,
  ) {
    const [event] = await tx`select created_by, payload from public.outbox_events
      where id = ${jobId} and firm_id = ${firm.id} and deleted_at is null
        and event_type in ('firm.renamed.v1', 'firm.profile-check-requested.v1') for share`;
    if (!event)
      throw new NotFoundException({
        code: 'EXECUTION_NOT_FOUND',
        message: 'This check is unavailable.',
      });
    const [job] = await tx<
      Source[]
    >`select id, created_by, status, attempts, deleted_at from public.job_executions
      where outbox_event_id = ${jobId} and firm_id = ${firm.id} ${write ? tx`for update` : tx`for share`}`;
    if (job?.deleted_at)
      throw new NotFoundException({
        code: 'EXECUTION_NOT_FOUND',
        message: 'This check is unavailable.',
      });
    const parsed = firmRenamedEventSchema.safeParse(event.payload);
    const valid =
      parsed.success &&
      parsed.data.firmId === firm.id &&
      (!job || job.created_by === event.created_by);
    const [recovery] = job
      ? await tx`select replacement_event_id from public.execution_recoveries where source_job_id = ${job.id} and firm_id = ${firm.id}`
      : [];
    const reason = recovery
      ? 'ALREADY_RECOVERED'
      : !valid
        ? 'SOURCE_INVALID'
        : !job || !['failed', 'blocked'].includes(job.status)
          ? 'NOT_TERMINAL'
          : null;
    const review = recoveryReviewSchema.parse({
      jobId,
      firm,
      eligible: reason === null,
      reason,
      sourceStatus: job?.status ?? null,
      sourceRevision: valid ? parsed.data.revision : null,
      replacementJobId: recovery?.replacement_event_id ?? null,
    });
    return { review, job };
  }

  async review(actor: AuthClaims, jobId: string): Promise<RecoveryReview> {
    return this.database.sql.begin(async (tx) => {
      await tx`set local lock_timeout = '2s'`;
      await tx`set local statement_timeout = '5s'`;
      const firm = await this.firms.operator(tx, actor);
      return (await this.inspect(tx, firm, jobId, false)).review;
    });
  }

  async request(
    actor: AuthClaims,
    jobId: string,
    input: RecoverExecution,
    key: string,
    requestId: string,
  ): Promise<RecoverExecutionResult> {
    const inputHash = createHash('sha256')
      .update(JSON.stringify({ jobId, ...input }))
      .digest('hex');
    const result = await this.database.sql.begin(async (tx) => {
      await tx`set local lock_timeout = '2s'`;
      await tx`set local statement_timeout = '5s'`;
      await tx`select pg_advisory_xact_lock(hashtextextended(${`${actor.sub}:${actor.firm_id}:${command}:${key}`}, 0))`;
      const firm = await this.firms.operator(tx, actor);
      const { review, job } = await this.inspect(tx, firm, jobId, true);
      // Authorization and source availability are checked even when recovering an uncertain response.
      const [receipt] = await tx`select input_hash, response from public.command_receipts
        where firm_id = ${firm.id} and created_by = ${actor.sub} and command = ${command} and idempotency_key = ${key}`;
      if (receipt) {
        if (receipt.input_hash !== inputHash)
          throw new ConflictException({
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'This action key was used for another review.',
          });
        return { value: recoverExecutionResultSchema.parse(receipt.response), replayed: true };
      }
      if (!review.eligible || !job)
        throw new ConflictException({
          code: review.reason ?? 'NOT_TERMINAL',
          message: 'This check cannot be requested again. Reload its review.',
        });
      if (
        firm.revision !== input.expectedRevision ||
        review.sourceRevision !== input.expectedSourceRevision ||
        job.status !== input.expectedStatus
      )
        throw new ConflictException({
          code: 'REVIEW_CONFLICT',
          message: 'The reviewed profile or check changed. Review it again.',
        });
      const commandId = randomUUID();
      const replacement = randomUUID();
      const value = recoverExecutionResultSchema.parse({
        jobId: replacement,
        sourceJobId: jobId,
        commandId,
        status: 'awaiting_dispatch',
      });
      await tx`insert into public.command_receipts (id, firm_id, created_by, command, idempotency_key, request_id, input_hash, response)
        values (${commandId}, ${firm.id}, ${actor.sub}, ${command}, ${key}, ${requestId}, ${inputHash}, ${tx.json(value)})`;
      await tx`insert into public.outbox_events (id, firm_id, created_by, command_id, request_id, event_type, payload)
        values (${replacement}, ${firm.id}, ${actor.sub}, ${commandId}, ${requestId}, 'firm.profile-check-requested.v1', ${tx.json({ firmId: firm.id, revision: firm.revision })})`;
      await tx`insert into public.execution_recoveries (id, firm_id, created_by, source_job_id, source_created_by, replacement_event_id, request_id, reviewed_revision, reason)
        values (${commandId}, ${firm.id}, ${actor.sub}, ${job.id}, ${job.created_by}, ${replacement}, ${requestId}, ${firm.revision}, ${input.reason})`;
      await tx`insert into public.audit_logs (firm_id, created_by, command_id, request_id, action, record_type, record_id, before, after)
        values (${firm.id}, ${actor.sub}, ${commandId}, ${requestId}, ${command}, 'job_execution', ${job.id},
        ${tx.json({ status: job.status, attempts: job.attempts, sourceRevision: review.sourceRevision })},
        ${tx.json({ replacementJobId: replacement, reviewedRevision: firm.revision, reason: input.reason })})`;
      return { value, replayed: false };
    });
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      requestId,
      command,
      commandId: result.value.commandId,
      jobId: result.value.jobId,
      firmId: actor.firm_id,
      replayed: result.replayed,
    });
    return result.value;
  }
}
