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
import { firms, profiles } from './tenancy.js';

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
/**
 * Firm practice profile (D022): configuration visible to live staff. Archiving keeps the
 * profile readable for matters pinned to its versions; only active names are unique.
 */
export const practiceProfiles = pgTable(
  'practice_profiles',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    name: text('name').notNull(),
    description: text('description'),
    basedOnKey: text('based_on_key'),
    basedOnVersion: integer('based_on_version'),
    currentVersion: integer('current_version').notNull().default(1),
    revision: integer('revision').notNull().default(1),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('practice_profiles_firm_id_uq').on(t.firmId, t.id),
    uniqueIndex('practice_profiles_active_name_uq')
      .on(t.firmId, sql`lower(${t.name})`)
      .where(sql`${t.archivedAt} is null`),
    index('practice_profiles_list_idx').on(t.firmId, sql`lower(${t.name})`, t.id),
    check(
      'practice_profiles_name',
      sql`length(${t.name}) between 1 and 80 and ${t.name} = btrim(${t.name})`,
    ),
    check(
      'practice_profiles_description',
      sql`${t.description} is null or (length(${t.description}) between 1 and 300 and ${t.description} = btrim(${t.description}))`,
    ),
    check(
      'practice_profiles_based_on',
      sql`(${t.basedOnKey} is null) = (${t.basedOnVersion} is null) and (${t.basedOnVersion} is null or ${t.basedOnVersion} >= 1)`,
    ),
    check('practice_profiles_current_version', sql`${t.currentVersion} >= 1`),
    check('practice_profiles_revision', sql`${t.revision} >= 1`),
    // Profiles are archived, never soft-deleted: pinned matters must always resolve.
    check('practice_profiles_not_deleted', sql`${t.deletedAt} is null`),
  ],
);
/** One published field set. Versions are immutable; matters pin one by id. */
export const practiceProfileVersions = pgTable(
  'practice_profile_versions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    profileId: uuid('profile_id').notNull(),
    version: integer('version').notNull(),
    fields: jsonb('fields').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: 'practice_profile_versions_profile_fk',
      columns: [t.firmId, t.profileId],
      foreignColumns: [practiceProfiles.firmId, practiceProfiles.id],
    }),
    uniqueIndex('practice_profile_versions_firm_id_uq').on(t.firmId, t.id),
    uniqueIndex('practice_profile_versions_number_uq').on(t.firmId, t.profileId, t.version),
    check('practice_profile_versions_version', sql`${t.version} >= 1`),
    check(
      'practice_profile_versions_fields',
      sql`jsonb_typeof(${t.fields}) = 'array' and jsonb_array_length(${t.fields}) <= 50
        and octet_length(${t.fields}::text) <= 1000000`,
    ),
    check('practice_profile_versions_not_deleted', sql`${t.deletedAt} is null`),
  ],
);
