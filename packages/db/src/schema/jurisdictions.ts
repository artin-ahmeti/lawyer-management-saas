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
import { firms, profiles } from './tenancy.js';
import { matters } from './matters.js';

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
/** Must equal `usJurisdictions` in @lawfirm/core (checked by the API integration suite). */
const codes = sql.raw(
  [
    ...'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(
      ' ',
    ),
    'DC',
    'AS',
    'GU',
    'MP',
    'PR',
    'VI',
    'US',
  ]
    .map((c) => `'${c}'`)
    .join(','),
);
/**
 * A court, agency, tribunal or other body under one catalog jurisdiction (D023): firm
 * configuration visible to live staff. Archived, never soft-deleted; kind and jurisdiction
 * are fixed so references keep their meaning. Only active names are unique.
 */
export const forums = pgTable(
  'forums',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    jurisdiction: text('jurisdiction').notNull(),
    revision: integer('revision').notNull().default(1),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    ...timestamps(),
  },
  (t) => [
    // References name the forum together with its jurisdiction, so they cannot disagree.
    uniqueIndex('forums_firm_id_jurisdiction_uq').on(t.firmId, t.id, t.jurisdiction),
    uniqueIndex('forums_active_name_uq')
      .on(t.firmId, t.jurisdiction, sql`lower(${t.name})`)
      .where(sql`${t.archivedAt} is null`),
    index('forums_list_idx').on(t.firmId, sql`lower(${t.name})`, t.id),
    check('forums_kind', sql`${t.kind} in ('court','agency','tribunal','other')`),
    check('forums_jurisdiction', sql`${t.jurisdiction} in (${codes})`),
    check('forums_name', sql`length(${t.name}) between 1 and 200 and ${t.name} = btrim(${t.name})`),
    check('forums_revision', sql`${t.revision} >= 1`),
    check('forums_not_deleted', sql`${t.deletedAt} is null`),
  ],
);
/**
 * A jurisdiction reference on one matter (D023): governing law, venue, agency or other.
 * Visibility follows the matter grant; ending sets deleted_at and keeps the row as history.
 */
export const matterJurisdictions = pgTable(
  'matter_jurisdictions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    matterId: uuid('matter_id').notNull(),
    purpose: text('purpose').notNull(),
    jurisdiction: text('jurisdiction').notNull(),
    forumId: uuid('forum_id'),
    docketNumber: text('docket_number'),
    label: text('label'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: 'matter_jurisdictions_matter_fk',
      columns: [t.firmId, t.matterId],
      foreignColumns: [matters.firmId, matters.id],
    }),
    // Checked only when a forum is named (MATCH SIMPLE): same firm and same jurisdiction.
    foreignKey({
      name: 'matter_jurisdictions_forum_fk',
      columns: [t.firmId, t.forumId, t.jurisdiction],
      foreignColumns: [forums.firmId, forums.id, forums.jurisdiction],
    }),
    // One current copy of an identical reference, ignoring letter case in docket and label
    // (never empty strings, so coalescing to '' is unambiguous).
    uniqueIndex('matter_jurisdictions_current_uq')
      .on(
        t.firmId,
        t.matterId,
        t.purpose,
        t.jurisdiction,
        sql`coalesce(${t.forumId},'00000000-0000-0000-0000-000000000000'::uuid)`,
        sql`lower(coalesce(${t.docketNumber},''))`,
        sql`lower(coalesce(${t.label},''))`,
      )
      .where(sql`${t.deletedAt} is null`),
    index('matter_jurisdictions_matter_idx').on(t.firmId, t.matterId, t.createdAt, t.id),
    check(
      'matter_jurisdictions_purpose',
      sql`${t.purpose} in ('governing_law','venue','agency','other')`,
    ),
    check('matter_jurisdictions_jurisdiction', sql`${t.jurisdiction} in (${codes})`),
    check(
      'matter_jurisdictions_governing_law',
      sql`${t.purpose} <> 'governing_law' or (${t.forumId} is null and ${t.docketNumber} is null)`,
    ),
    check(
      'matter_jurisdictions_label',
      sql`(${t.purpose} = 'other') = (${t.label} is not null) and (${t.label} is null or (length(${t.label}) between 1 and 80 and ${t.label} = btrim(${t.label})))`,
    ),
    check(
      'matter_jurisdictions_docket',
      sql`${t.docketNumber} is null or (length(${t.docketNumber}) between 1 and 100 and ${t.docketNumber} = btrim(${t.docketNumber}))`,
    ),
  ],
);
