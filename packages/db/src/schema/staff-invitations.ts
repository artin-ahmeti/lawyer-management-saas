import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { firms, profiles, firmMembers, firmRole } from './tenancy.js';

export const staffInvitations = pgTable(
  'staff_invitations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    email: text('email').notNull(),
    role: firmRole('role').notNull(),
    status: text('status').notNull().default('pending'),
    revision: integer('revision').notNull().default(1),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedBy: uuid('accepted_by'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedBy: uuid('revoked_by').references(() => profiles.id),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('staff_invitations_pending_email_uq')
      .on(t.firmId, t.email)
      .where(sql`${t.status} = 'pending' and ${t.deletedAt} is null`),
    index('staff_invitations_firm_cursor_idx').on(t.firmId, t.createdAt, t.id),
    index('staff_invitations_received_idx')
      .on(t.email, t.createdAt, t.id)
      .where(sql`${t.status} = 'pending' and ${t.deletedAt} is null`),
    foreignKey({
      name: 'staff_invitations_accepted_member_fk',
      columns: [t.firmId, t.acceptedBy],
      foreignColumns: [firmMembers.firmId, firmMembers.userId],
    }),
    check('staff_invitations_role', sql`${t.role} <> 'owner'`),
    check(
      'staff_invitations_email',
      sql`${t.email} = lower(btrim(${t.email})) and length(${t.email}) between 3 and 254`,
    ),
    check('staff_invitations_status', sql`${t.status} in ('pending','accepted','revoked')`),
    check('staff_invitations_revision', sql`${t.revision} >= 1`),
    check(
      'staff_invitations_completion',
      sql`case when ${t.status} = 'accepted' then ${t.acceptedBy} is not null and ${t.acceptedAt} is not null and ${t.revokedBy} is null and ${t.revokedAt} is null when ${t.status} = 'revoked' then ${t.revokedBy} is not null and ${t.revokedAt} is not null and ${t.acceptedBy} is null and ${t.acceptedAt} is null else ${t.acceptedBy} is null and ${t.acceptedAt} is null and ${t.revokedBy} is null and ${t.revokedAt} is null end`,
    ),
  ],
);
