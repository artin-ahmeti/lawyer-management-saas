import { sql } from 'drizzle-orm';
import { jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Phase 1 — tenancy core. Conventions per CLAUDE.md §Schema:
 * every tenant table carries firm_id; RLS is enabled AND forced in the
 * hand-written companion migration (…_rls_and_auth.sql). Writes from the
 * `authenticated` role are revoked there too — clients read, the API writes.
 */

export const firmRole = pgEnum('firm_role', [
  'owner',
  'admin',
  'attorney',
  'paralegal',
  'billing',
  'readonly',
]);

export const firms = pgTable('firms', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  subdomain: text('subdomain').unique(),
  plan: text('plan').notNull().default('trial'),
  stripeCustomerId: text('stripe_customer_id'),
  settings: jsonb('settings')
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

/** Public mirror of auth.users (FK added in the hand-written migration). */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const firmMembers = pgTable(
  'firm_members',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id),
    role: firmRole('role').notNull().default('attorney'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('firm_members_firm_user_uq').on(t.firmId, t.userId)],
);

export const practiceAreas = pgTable(
  'practice_areas',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('practice_areas_firm_name_uq').on(t.firmId, t.name)],
);
