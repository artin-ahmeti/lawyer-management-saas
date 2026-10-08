import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { firmMembers, firms, profiles } from './tenancy.js';

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
export const matters = pgTable(
  'matters',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    title: text('title').notNull(),
    reference: text('reference'),
    revision: integer('revision').notNull().default(1),
    accessRevision: integer('access_revision').notNull().default(1),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('matters_firm_id_uq').on(t.firmId, t.id),
    index('matters_firm_cursor_idx').on(t.firmId, t.id),
    check(
      'matters_title',
      sql`length(btrim(${t.title})) between 1 and 200 and ${t.title} = btrim(${t.title})`,
    ),
    check(
      'matters_reference',
      sql`${t.reference} is null or (length(${t.reference}) between 1 and 80 and ${t.reference}=btrim(${t.reference}))`,
    ),
    check('matters_revision', sql`${t.revision} >= 1`),
    check('matters_access_revision', sql`${t.accessRevision} >= 1`),
  ],
);
/** Every matter is explicitly granted; a firm owner has no implicit ethical-wall bypass. */
export const matterAccess = pgTable(
  'matter_access',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    matterId: uuid('matter_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: text('role').notNull(),
    revision: integer('revision').notNull().default(1),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: 'matter_access_matter_fk',
      columns: [t.firmId, t.matterId],
      foreignColumns: [matters.firmId, matters.id],
    }),
    foreignKey({
      name: 'matter_access_member_fk',
      columns: [t.firmId, t.userId],
      foreignColumns: [firmMembers.firmId, firmMembers.userId],
    }),
    uniqueIndex('matter_access_grant_uq').on(t.firmId, t.matterId, t.userId),
    index('matter_access_user_cursor_idx')
      .on(t.firmId, t.userId, t.matterId)
      .where(sql`${t.deletedAt} is null`),
    check('matter_access_role', sql`${t.role} in ('reader','manager')`),
    check('matter_access_revision', sql`${t.revision} >= 1`),
  ],
);
