import { firmRenamedEventSchema } from '@lawfirm/core';
import type postgres from 'postgres';
import type { Logger } from 'pino';
import { checkStaffInvitation, type InvitationCheckResult } from './staff-invitation-check.js';

export interface JobQueue {
  enqueue(jobId: string): Promise<void>;
}
type DispatchClaim = {
  id: string;
  dispatch_lease_token: string;
  attempts: number;
  firm_id: string;
  request_id: string;
  command_id: string;
};
type ExecutionClaim = {
  id: string;
  lease_token: string;
  attempts: number;
  firm_id: string;
  request_id: string;
  command_id: string;
};
type ExecutionSource = {
  firm_id: string;
  created_by: string;
  event_type: string;
  payload: unknown;
  deleted_at: Date | null;
  event_firm_id: string;
  event_actor_id: string;
};
const backoffSeconds = (attempt: number) => Math.min(300, 2 ** Math.min(attempt, 8));

/** Postgres owns recovery and results. Queue acknowledgements are transport evidence only. */
export class ExecutionService {
  constructor(
    private readonly sql: postgres.Sql,
    private readonly queue: JobQueue,
    private readonly logger: Logger,
  ) {}

  async claimDispatch(): Promise<DispatchClaim[]> {
    return this.sql.begin(async (tx) => {
      await tx`set local lock_timeout = '2s'`;
      const events = await tx<DispatchClaim[]>`with eligible as (
        select id from public.outbox_events
        where dispatched_at is null and deleted_at is null and available_at <= now()
          and (dispatch_lease_until is null or dispatch_lease_until <= now())
        order by available_at, id limit 25 for update skip locked
      ) update public.outbox_events e set dispatch_lease_token = gen_random_uuid(),
        dispatch_lease_until = now() + interval '30 seconds', attempts = attempts + 1, updated_at = now()
        from eligible where e.id = eligible.id
        returning e.id, e.dispatch_lease_token, e.attempts, e.firm_id, e.request_id, e.command_id`;
      for (const event of events) {
        await tx`insert into public.job_executions (id, outbox_event_id, firm_id, created_by)
          select id, id, firm_id, created_by from public.outbox_events where id = ${event.id}
          on conflict (outbox_event_id) do nothing`;
      }
      return events;
    });
  }

  async dispatchBatch() {
    const events = await this.claimDispatch();
    await Promise.all(
      events.map(async (event) => {
        try {
          await this.queue.enqueue(event.id);
          const changed = await this.sql`update public.outbox_events set dispatched_at = now(),
          dispatch_lease_token = null, dispatch_lease_until = null, last_error_code = null, updated_at = now()
          where id = ${event.id} and dispatch_lease_token = ${event.dispatch_lease_token}`;
          if (changed.count)
            this.logger.info({
              event: 'outbox_dispatched',
              entryPoint: 'outbox_dispatch',
              jobId: event.id,
              requestId: event.request_id,
              commandId: event.command_id,
              firmId: event.firm_id,
              attempt: event.attempts,
            });
        } catch {
          await this
            .sql`update public.outbox_events set dispatch_lease_token = null, dispatch_lease_until = null,
          last_error_code = 'QUEUE_UNAVAILABLE', available_at = now() + ${backoffSeconds(event.attempts)} * interval '1 second', updated_at = now()
          where id = ${event.id} and dispatch_lease_token = ${event.dispatch_lease_token}`;
          this.logger.warn({
            event: 'outbox_dispatch_retry',
            entryPoint: 'outbox_dispatch',
            jobId: event.id,
            requestId: event.request_id,
            commandId: event.command_id,
            firmId: event.firm_id,
            errorCode: 'QUEUE_UNAVAILABLE',
          });
        }
      }),
    );
  }

  async recover() {
    // Rehydrate pending work even if Redis lost an accepted job. Never replay terminal results.
    return this.sql`with eligible as (
      select e.id from public.outbox_events e join public.job_executions j on j.outbox_event_id = e.id
      where e.deleted_at is null and j.deleted_at is null and e.dispatched_at < now() - interval '30 seconds'
        and ((j.status in ('pending', 'retry') and j.available_at <= now())
          or (j.status = 'running' and j.lease_until <= now()))
      order by e.dispatched_at, e.id limit 25 for update of e skip locked
    ) update public.outbox_events e set dispatched_at = null, available_at = now(), updated_at = now()
      from eligible where e.id = eligible.id`;
  }

  async claimExecution(jobId: string): Promise<ExecutionClaim | null> {
    return this.sql.begin(async (tx) => {
      await tx`set local lock_timeout = '2s'`;
      // Lock before recording expiry: a concurrent completion or duplicate delivery cannot rewrite history.
      const [previous] = await tx`select lease_token, status, lease_until <= now() as expired
        from public.job_executions where id = ${jobId} and deleted_at is null for update`;
      if (!previous) return null;
      if (previous.status === 'running' && previous.expired)
        await tx`update public.job_execution_attempts set status = 'interrupted',
          error_code = 'LEASE_EXPIRED', finished_at = now(), updated_at = now()
          where job_id = ${jobId} and lease_token = ${previous.lease_token} and status = 'running'`;
      // Expired fifth attempts must end visibly rather than remain stuck in running forever.
      await tx`update public.job_executions set status = 'failed', last_error_code = 'ATTEMPTS_EXHAUSTED',
        lease_token = null, lease_until = null, completed_at = now(), updated_at = now()
        where id = ${jobId} and attempts >= 5 and status = 'running' and lease_until <= now()`;
      const [claim] = await tx<
        ExecutionClaim[]
      >`update public.job_executions j set status = 'running',
        attempts = j.attempts + 1, lease_token = gen_random_uuid(), lease_until = now() + interval '30 seconds',
        started_at = now(), last_error_code = null, updated_at = now()
        from public.outbox_events e where j.id = ${jobId} and j.outbox_event_id = e.id
          and j.deleted_at is null and j.attempts < 5 and j.available_at <= now()
          and (j.status in ('pending', 'retry') or (j.status = 'running' and j.lease_until <= now()))
        returning j.id, j.lease_token, j.attempts, j.firm_id, e.request_id, e.command_id`;
      if (claim)
        await tx`insert into public.job_execution_attempts
          (job_id, firm_id, created_by, attempt_number, lease_token, started_at, lease_until)
          select id, firm_id, created_by, attempts, lease_token, started_at, lease_until
          from public.job_executions where id = ${claim.id}`;
      return claim ?? null;
    });
  }

  async executeClaim(claim: ExecutionClaim) {
    const outcome = await this.sql.begin(async (tx) => {
      await tx`set local lock_timeout = '2s'`;
      await tx`set local statement_timeout = '5s'`;
      const [source] = await tx<
        ExecutionSource[]
      >`select j.firm_id, j.created_by, e.event_type, e.payload, e.deleted_at,
        e.firm_id as event_firm_id, e.created_by as event_actor_id
        from public.job_executions j join public.outbox_events e on e.id = j.outbox_event_id
        where j.id = ${claim.id} and j.status = 'running' and j.lease_token = ${claim.lease_token}
          and j.deleted_at is null and j.lease_until > clock_timestamp() for update of j for share of e`;
      if (!source) return null;
      let errorCode: string | null = null;
      let result:
        { kind: 'firm_profile_verified'; revision: number } | InvitationCheckResult | null = null;
      if (source.deleted_at) errorCode = 'SOURCE_UNAVAILABLE';
      else if (
        source.event_firm_id !== source.firm_id ||
        source.event_actor_id !== source.created_by
      )
        errorCode = 'INVALID_EVENT';
      else if (source.event_type === 'staff.invitation-check-requested.v1') {
        const checked = await checkStaffInvitation(
          tx,
          source.firm_id,
          source.created_by,
          source.payload,
        );
        errorCode = checked.errorCode;
        result = checked.result;
      } else if (
        !['firm.renamed.v1', 'firm.profile-check-requested.v1'].includes(source.event_type)
      )
        errorCode = 'UNSUPPORTED_EVENT';
      else {
        const parsed = firmRenamedEventSchema.safeParse(source.payload);
        if (!parsed.success || parsed.data.firmId !== source.firm_id) errorCode = 'INVALID_EVENT';
        else {
          // Serialize authorization/revision checks with membership and record changes. Future matter handlers require matter grants too.
          const [current] = await tx<
            { revision: number; role: string }[]
          >`select f.revision, fm.role from public.firms f
            join public.firm_members fm on fm.firm_id = f.id
            where f.id = ${source.firm_id} and fm.user_id = ${source.created_by}
              and f.deleted_at is null and fm.deleted_at is null for share of f, fm`;
          if (!current || !['owner', 'admin'].includes(current.role)) errorCode = 'ACCESS_REVOKED';
          else if (current.revision !== parsed.data.revision) errorCode = 'SOURCE_CHANGED';
          else result = { kind: 'firm_profile_verified', revision: parsed.data.revision };
        }
      }
      const changed =
        await tx`update public.job_executions set status = ${errorCode ? 'blocked' : 'succeeded'},
        result = ${result ? tx.json(result) : null}, last_error_code = ${errorCode}, completed_at = now(),
        lease_token = null, lease_until = null, updated_at = now()
        where id = ${claim.id} and lease_token = ${claim.lease_token} and lease_until > clock_timestamp()`;
      if (!changed.count) return null;
      const recorded =
        await tx`update public.job_execution_attempts set status = ${errorCode ? 'blocked' : 'succeeded'},
        error_code = ${errorCode}, finished_at = now(), updated_at = now()
        where job_id = ${claim.id} and lease_token = ${claim.lease_token} and status = 'running'`;
      if (recorded.count !== 1) throw new Error('Execution attempt history is missing');
      return { status: errorCode ? 'blocked' : 'succeeded', errorCode };
    });
    if (outcome)
      this.logger.info({
        event: 'job_finished',
        entryPoint: 'queue_worker',
        jobId: claim.id,
        requestId: claim.request_id,
        commandId: claim.command_id,
        firmId: claim.firm_id,
        attempt: claim.attempts,
        ...outcome,
      });
  }

  async failExecution(claim: ExecutionClaim) {
    const changed = await this.sql.begin(async (tx) => {
      const rows =
        await tx`update public.job_executions set status = ${claim.attempts >= 5 ? 'failed' : 'retry'},
        last_error_code = 'PROCESSING_FAILED', result = null,
        available_at = now() + ${backoffSeconds(claim.attempts)} * interval '1 second',
        completed_at = ${claim.attempts >= 5 ? tx`now()` : null}, lease_token = null, lease_until = null, updated_at = now()
        where id = ${claim.id} and status = 'running' and lease_token = ${claim.lease_token} and lease_until > clock_timestamp()
        returning available_at`;
      if (rows.count) {
        const recorded =
          await tx`update public.job_execution_attempts set status = ${claim.attempts >= 5 ? 'failed' : 'retry'},
          error_code = 'PROCESSING_FAILED', finished_at = now(), updated_at = now()
          where job_id = ${claim.id} and lease_token = ${claim.lease_token} and status = 'running'`;
        if (recorded.count !== 1) throw new Error('Execution attempt history is missing');
      }
      if (rows[0] && claim.attempts < 5)
        await tx`update public.outbox_events set dispatched_at = null,
        available_at = ${rows[0].available_at}, updated_at = now() where id = ${claim.id}`;
      return rows.count;
    });
    if (changed)
      this.logger.warn({
        event: 'job_processing_failed',
        entryPoint: 'queue_worker',
        jobId: claim.id,
        requestId: claim.request_id,
        commandId: claim.command_id,
        firmId: claim.firm_id,
        attempt: claim.attempts,
        errorCode: 'PROCESSING_FAILED',
        terminal: claim.attempts >= 5,
      });
  }

  async process(jobId: string) {
    const claim = await this.claimExecution(jobId);
    if (!claim) return;
    try {
      await this.executeClaim(claim);
    } catch {
      await this.failExecution(claim);
    }
  }
}
