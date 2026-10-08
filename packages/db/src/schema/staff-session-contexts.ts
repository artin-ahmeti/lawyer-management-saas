import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { firmMembers } from './tenancy.js';

/** Server-selected scope for one Auth session; retained separately from Auth's deletable session. */
export const staffSessionContexts = pgTable(
  'staff_session_contexts',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: uuid('session_id').notNull(),
    firmId: uuid('firm_id').notNull(),
    revision: integer('revision').notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('staff_session_contexts_session_uq').on(t.sessionId),
    foreignKey({
      name: 'staff_session_contexts_member_fk',
      columns: [t.firmId, t.createdBy],
      foreignColumns: [firmMembers.firmId, firmMembers.userId],
    }),
    check('staff_session_contexts_revision', sql`${t.revision} >= 1`),
  ],
);
