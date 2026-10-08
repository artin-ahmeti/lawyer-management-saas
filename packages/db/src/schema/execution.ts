import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { firms } from './tenancy.js';

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const commandReceipts = pgTable(
  'command_receipts',
  {
    id: uuid('id').primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    createdBy: uuid('created_by').notNull(),
    command: text('command').notNull(),
    idempotencyKey: uuid('idempotency_key').notNull(),
    requestId: uuid('request_id').notNull(),
    inputHash: text('input_hash').notNull(),
    response: jsonb('response').notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('command_receipts_intent_uq').on(
      t.firmId,
      t.createdBy,
      t.command,
      t.idempotencyKey,
    ),
    uniqueIndex('command_receipts_provision_intent_uq')
      .on(t.createdBy, t.idempotencyKey)
      .where(sql`${t.command} = 'firm.provision.v1'`),
    uniqueIndex('command_receipts_invitation_accept_intent_uq')
      .on(t.createdBy, t.idempotencyKey)
      .where(sql`${t.command} = 'staff.invitation.accept.v1'`),
    uniqueIndex('command_receipts_context_select_intent_uq')
      .on(t.createdBy, t.idempotencyKey)
      .where(sql`${t.command} = 'staff.context.select.v1'`),
  ],
);

/** Deliberately independent of deletable records: an audit survives their eventual closure. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id').notNull(),
    createdBy: uuid('created_by').notNull(),
    commandId: uuid('command_id').notNull(),
    requestId: uuid('request_id').notNull(),
    action: text('action').notNull(),
    recordType: text('record_type').notNull(),
    recordId: uuid('record_id').notNull(),
    before: jsonb('before').notNull(),
    after: jsonb('after').notNull(),
    ...timestamps(),
  },
  (t) => [
    index('audit_logs_firm_created_idx').on(t.firmId, t.createdAt),
    index('audit_logs_matter_access_history_idx')
      .on(t.firmId, t.recordId, t.createdAt, t.id)
      .where(sql`${t.action} = 'matter.access.change.v1' and ${t.recordType} = 'matter'`),
    index('audit_logs_staff_role_history_idx')
      .on(t.firmId, t.createdAt, t.id)
      .where(sql`${t.action} = 'staff.role.change.v1' and ${t.recordType} = 'firm_member'`),
    index('audit_logs_staff_membership_history_idx')
      .on(t.firmId, t.createdAt, t.id)
      .where(
        sql`${t.action} in ('staff.membership.remove.v1', 'staff.membership.restore.v1') and ${t.recordType} = 'firm_member'`,
      ),
  ],
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    createdBy: uuid('created_by').notNull(),
    commandId: uuid('command_id').notNull(),
    requestId: uuid('request_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    attempts: integer('attempts').notNull().default(0),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    dispatchLeaseToken: uuid('dispatch_lease_token'),
    dispatchLeaseUntil: timestamp('dispatch_lease_until', { withTimezone: true }),
    lastErrorCode: text('last_error_code'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('outbox_events_identity_uq').on(t.id, t.firmId, t.createdBy),
    index('outbox_events_firm_created_idx').on(t.firmId, t.createdAt, t.id),
    index('outbox_events_recovery_idx')
      .on(t.dispatchedAt)
      .where(sql`${t.dispatchedAt} is not null and ${t.deletedAt} is null`),
    index('outbox_events_pending_idx')
      .on(t.availableAt)
      .where(sql`${t.dispatchedAt} is null`),
    check('outbox_events_attempts_nonnegative', sql`${t.attempts} >= 0`),
  ],
);

export const jobExecutions = pgTable(
  'job_executions',
  {
    id: uuid('id').primaryKey(),
    outboxEventId: uuid('outbox_event_id')
      .notNull()
      .references(() => outboxEvents.id),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    createdBy: uuid('created_by').notNull(),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    leaseToken: uuid('lease_token'),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    lastErrorCode: text('last_error_code'),
    result: jsonb('result'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('job_executions_event_uq').on(t.outboxEventId),
    uniqueIndex('job_executions_identity_uq').on(t.id, t.firmId, t.createdBy),
    index('job_executions_recovery_idx')
      .on(t.availableAt)
      .where(sql`${t.status} in ('pending', 'retry', 'running')`),
    check(
      'job_executions_status',
      sql`${t.status} in ('pending', 'retry', 'running', 'succeeded', 'blocked', 'failed')`,
    ),
    check('job_executions_attempts', sql`${t.attempts} between 0 and 5`),
    check(
      'job_executions_lease',
      sql`(${t.status} = 'running') = (${t.leaseToken} is not null and ${t.leaseUntil} is not null)`,
    ),
  ],
);

/** Actual execution leases only. Old summary counts are never backfilled as invented history. */
export const jobExecutionAttempts = pgTable(
  'job_execution_attempts',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid('job_id').notNull(),
    firmId: uuid('firm_id').notNull(),
    createdBy: uuid('created_by').notNull(),
    attemptNumber: integer('attempt_number').notNull(),
    leaseToken: uuid('lease_token').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    leaseUntil: timestamp('lease_until', { withTimezone: true }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    status: text('status').notNull().default('running'),
    errorCode: text('error_code'),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: 'job_execution_attempts_identity_fk',
      columns: [t.jobId, t.firmId, t.createdBy],
      foreignColumns: [jobExecutions.id, jobExecutions.firmId, jobExecutions.createdBy],
    }),
    uniqueIndex('job_execution_attempts_number_uq').on(t.jobId, t.attemptNumber),
    uniqueIndex('job_execution_attempts_lease_uq').on(t.leaseToken),
    check('job_execution_attempts_number', sql`${t.attemptNumber} between 1 and 5`),
    check(
      'job_execution_attempts_status',
      sql`${t.status} in ('running', 'retry', 'succeeded', 'blocked', 'failed', 'interrupted')`,
    ),
    check(
      'job_execution_attempts_completion',
      sql`(${t.status} = 'running') = (${t.finishedAt} is null)`,
    ),
    check(
      'job_execution_attempts_dates',
      sql`${t.leaseUntil} > ${t.startedAt} and (${t.finishedAt} is null or ${t.finishedAt} >= ${t.startedAt})`,
    ),
    check(
      'job_execution_attempts_error',
      sql`case
      when ${t.status} in ('running', 'succeeded') then ${t.errorCode} is null
      when ${t.status} = 'interrupted' then ${t.errorCode} is not null and ${t.errorCode} = 'LEASE_EXPIRED'
      when ${t.status} in ('retry', 'failed') then ${t.errorCode} is not null and ${t.errorCode} = 'PROCESSING_FAILED'
      else ${t.errorCode} is not null and ${t.errorCode} in ('ACCESS_REVOKED', 'SOURCE_CHANGED', 'SOURCE_UNAVAILABLE', 'INVALID_EVENT', 'UNSUPPORTED_EVENT') end`,
    ),
  ],
);

/** A reviewed new command, never a reset of the failed execution's bounded attempt budget. */
export const executionRecoveries = pgTable(
  'execution_recoveries',
  {
    id: uuid('id').primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    createdBy: uuid('created_by').notNull(),
    sourceJobId: uuid('source_job_id').notNull(),
    sourceCreatedBy: uuid('source_created_by').notNull(),
    replacementEventId: uuid('replacement_event_id').notNull(),
    requestId: uuid('request_id').notNull(),
    reviewedRevision: integer('reviewed_revision').notNull(),
    reason: text('reason').notNull(),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: 'execution_recoveries_source_fk',
      columns: [t.sourceJobId, t.firmId, t.sourceCreatedBy],
      foreignColumns: [jobExecutions.id, jobExecutions.firmId, jobExecutions.createdBy],
    }),
    foreignKey({
      name: 'execution_recoveries_replacement_fk',
      columns: [t.replacementEventId, t.firmId, t.createdBy],
      foreignColumns: [outboxEvents.id, outboxEvents.firmId, outboxEvents.createdBy],
    }),
    uniqueIndex('execution_recoveries_source_uq').on(t.sourceJobId),
    uniqueIndex('execution_recoveries_replacement_uq').on(t.replacementEventId),
    check('execution_recoveries_revision', sql`${t.reviewedRevision} >= 1`),
    check('execution_recoveries_reason', sql`length(btrim(${t.reason})) between 1 and 500`),
  ],
);
