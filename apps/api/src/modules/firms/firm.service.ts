import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  renameFirmResultSchema,
  processingReadinessSchema,
  processingAvailabilityWindowMs,
  type ProcessingReadiness,
  type FirmExecutionList,
  type FirmExecutionHistory,
  type FirmProfile,
  type RenameFirm,
  type RenameFirmResult,
  type FirmRole,
} from '@lawfirm/core';
import type postgres from 'postgres';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { DatabaseService } from '../../common/database/database.module';
import { log } from '../../common/http';
import { ProcessingReadinessService } from './processing-readiness.service';
import { StaffAccessService, hasFirmCapability } from '../../common/auth/staff-access.service';

const command = 'firm.rename.v1';
type CurrentFirm = { id: string; name: string; revision: number; role: FirmRole };
const canRename = (role: FirmRole) => hasFirmCapability(role, 'firm.profile.rename');
const profile = (row: CurrentFirm): FirmProfile => ({
  id: row.id,
  name: row.name,
  revision: row.revision,
  canRename: canRename(row.role),
});

@Injectable()
export class FirmService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ProcessingReadinessService) private readonly readiness: ProcessingReadinessService,
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
  ) {}

  private async current(
    sql: postgres.Sql | postgres.TransactionSql,
    actor: AuthClaims,
    lock?: 'share' | 'update',
  ) {
    return this.access.current(sql, actor, lock);
  }

  async read(actor: AuthClaims): Promise<FirmProfile> {
    return profile(await this.current(this.database.sql, actor));
  }

  async operator(sql: postgres.TransactionSql, actor: AuthClaims): Promise<FirmProfile> {
    const firm = await this.current(sql, actor, 'share');
    if (!hasFirmCapability(firm.role, 'firm.processing.request'))
      throw new ForbiddenException({
        code: 'CAPABILITY_DENIED',
        message: 'Only a firm owner or administrator can manage firm processing.',
      });
    return profile(firm);
  }

  async processingReadiness(actor: AuthClaims, requestId: string): Promise<ProcessingReadiness> {
    const authorize = async () => {
      try {
        const firm = await this.current(this.database.sql, actor);
        if (!hasFirmCapability(firm.role, 'firm.processing.inspect'))
          throw new ForbiddenException({
            code: 'CAPABILITY_DENIED',
            message: 'Only a firm owner or administrator can inspect firm processing.',
          });
      } catch (error) {
        if (error instanceof HttpException) throw error;
        throw new ServiceUnavailableException({ code: 'PROCESSING_CHECK_UNAVAILABLE' });
      }
    };
    await authorize();
    const status = await this.readiness.inspect();
    // Do not hold database locks during network I/O. Revocation during a probe takes precedence.
    await authorize();
    const checkedAt = new Date();
    const age = status.lastWorkerSeenAt
      ? checkedAt.getTime() - Date.parse(status.lastWorkerSeenAt)
      : -1;
    const currentStatus =
      status.worker === 'recently_observed' && (age < 0 || age >= processingAvailabilityWindowMs)
        ? { ...status, worker: 'not_observed' as const, lastWorkerSeenAt: null }
        : status;
    const result = processingReadinessSchema.parse({
      ...currentStatus,
      checkedAt: checkedAt.toISOString(),
      validForMs: processingAvailabilityWindowMs,
      database: 'available',
    });
    log.info({
      event: 'processing_availability_checked',
      entryPoint: 'http',
      requestId,
      queue: result.queue,
      worker: result.worker,
    });
    return result;
  }

  async executions(actor: AuthClaims): Promise<FirmExecutionList> {
    return this.database.sql.begin(async (tx) => {
      await tx`set local lock_timeout = '2s'`;
      const firm = await this.current(tx, actor, 'share');
      if (!hasFirmCapability(firm.role, 'firm.processing.inspect'))
        throw new ForbiddenException({
          code: 'CAPABILITY_DENIED',
          message: 'Only a firm owner or administrator can inspect firm processing.',
        });
      // This endpoint intentionally admits only firm events. Matter/provider jobs need their domain authorization.
      const rows =
        await tx`select e.id, e.command_id, e.request_id, e.event_type, e.attempts as dispatch_attempts,
        coalesce(j.status, 'awaiting_dispatch') as status, coalesce(j.attempts, 0) as attempts,
        case when j.status = 'retry' then j.available_at else e.available_at end as available_at,
        j.completed_at, coalesce(j.last_error_code, e.last_error_code) as error_code
        from public.outbox_events e left join public.job_executions j
          on j.outbox_event_id = e.id and j.firm_id = e.firm_id and j.deleted_at is null
        where e.firm_id = ${firm.id} and e.deleted_at is null and e.event_type in ('firm.renamed.v1', 'firm.profile-check-requested.v1')
        order by e.created_at desc, e.id desc limit 20`;
      return {
        items: rows.map((row) => ({
          id: row.id,
          commandId: row.command_id,
          requestId: row.request_id,
          eventType: row.event_type,
          status: row.status,
          attempts: row.attempts,
          dispatchAttempts: row.dispatch_attempts,
          availableAt: (row.available_at as Date).toISOString(),
          completedAt: (row.completed_at as Date | null)?.toISOString() ?? null,
          errorCode: row.error_code,
        })),
      };
    });
  }

  async executionHistory(actor: AuthClaims, jobId: string): Promise<FirmExecutionHistory> {
    return this.database.sql.begin(async (tx) => {
      await tx`set local lock_timeout = '2s'`;
      await tx`set local statement_timeout = '5s'`;
      const firm = await this.current(tx, actor, 'share');
      if (!hasFirmCapability(firm.role, 'firm.processing.inspect'))
        throw new ForbiddenException({
          code: 'CAPABILITY_DENIED',
          message: 'Only a firm owner or administrator can inspect firm processing.',
        });
      // Allowlist source type before reading any history; firm membership never admits matter jobs.
      const [event] = await tx`select id from public.outbox_events
        where id = ${jobId} and firm_id = ${firm.id} and deleted_at is null
          and event_type in ('firm.renamed.v1', 'firm.profile-check-requested.v1') for share`;
      if (!event)
        throw new NotFoundException({
          code: 'EXECUTION_NOT_FOUND',
          message: 'This check is unavailable.',
        });
      // Holding the job lock keeps the summary and attempt rows from different commits out of one response.
      const [job] = await tx`select attempts, created_by, deleted_at from public.job_executions
        where outbox_event_id = ${jobId} and firm_id = ${firm.id} for share`;
      if (job?.deleted_at)
        throw new NotFoundException({
          code: 'EXECUTION_NOT_FOUND',
          message: 'This check is unavailable.',
        });
      const rows = job
        ? await tx`select attempt_number, status, started_at, finished_at, error_code
        from public.job_execution_attempts where job_id = ${jobId} and firm_id = ${firm.id}
          and created_by = ${job.created_by} order by attempt_number limit 5`
        : [];
      return {
        jobId,
        attemptCount: job?.attempts ?? 0,
        unrecordedAttempts: (job?.attempts ?? 0) - rows.length,
        items: rows.map((row) => ({
          number: row.attempt_number,
          status: row.status,
          startedAt: (row.started_at as Date).toISOString(),
          finishedAt: (row.finished_at as Date | null)?.toISOString() ?? null,
          errorCode: row.error_code,
        })),
      };
    });
  }

  async rename(
    actor: AuthClaims,
    input: RenameFirm,
    idempotencyKey: string,
    requestId: string,
  ): Promise<RenameFirmResult> {
    const inputHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const result = await this.database.sql.begin(async (tx) => {
      await tx`set local statement_timeout = '5s'`;
      await tx`set local lock_timeout = '2s'`;
      // Serialize a retry's entire transaction. The unique receipt index independently protects intent identity.
      await tx`select pg_advisory_xact_lock(hashtextextended(${`${actor.sub}:${actor.firm_id}:${command}:${idempotencyKey}`}, 0))`;
      const before = await this.current(tx, actor, 'update');
      if (!canRename(before.role))
        throw new ForbiddenException({
          code: 'CAPABILITY_DENIED',
          message: 'Only a firm owner or administrator can rename the firm.',
        });
      // Recheck authorization BEFORE replaying a persisted response.
      const [receipt] = await tx`select input_hash, response from public.command_receipts
        where firm_id = ${before.id} and created_by = ${actor.sub}
          and command = ${command} and idempotency_key = ${idempotencyKey}`;
      if (receipt) {
        if (receipt.input_hash !== inputHash)
          throw new ConflictException({
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'This action key was already used for a different edit.',
          });
        return { value: renameFirmResultSchema.parse(receipt.response), replayed: true };
      }
      if (before.revision !== input.expectedRevision)
        throw new ConflictException({
          code: 'REVISION_CONFLICT',
          message: 'The firm profile changed. Reload the current profile before saving.',
        });
      const [after] = await tx<CurrentFirm[]>`update public.firms
        set name = ${input.name}, revision = revision + 1
        where id = ${before.id} returning id, name, revision, ${before.role}::text as role`;
      if (!after) throw new Error('Firm update returned no record');
      const commandId = randomUUID();
      const value = { firm: profile(after), commandId };
      await tx`insert into public.command_receipts (id, firm_id, created_by, command,
        idempotency_key, request_id, input_hash, response)
        values (${commandId}, ${before.id}, ${actor.sub}, ${command}, ${idempotencyKey}, ${requestId}, ${inputHash}, ${tx.json(value)})`;
      await tx`insert into public.audit_logs (firm_id, created_by, command_id, request_id,
        action, record_type, record_id, before, after)
        values (${before.id}, ${actor.sub}, ${commandId}, ${requestId}, ${command}, 'firm', ${before.id},
          ${tx.json({ name: before.name, revision: before.revision })}, ${tx.json({ name: after.name, revision: after.revision })})`;
      await tx`insert into public.outbox_events (firm_id, created_by, command_id, request_id, event_type, payload)
        values (${before.id}, ${actor.sub}, ${commandId}, ${requestId}, 'firm.renamed.v1',
          ${tx.json({ firmId: before.id, revision: after.revision })})`;
      return { value, replayed: false };
    });
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      requestId,
      command,
      commandId: result.value.commandId,
      firmId: actor.firm_id,
      replayed: result.replayed,
    });
    return result.value;
  }
}
