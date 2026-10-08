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
/** Firm directory entry (D021): visible to live staff, never tied to one matter. */
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    kind: text('kind').notNull(),
    displayName: text('display_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    revision: integer('revision').notNull().default(1),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('contacts_firm_id_uq').on(t.firmId, t.id),
    index('contacts_directory_idx')
      .on(t.firmId, sql`lower(${t.displayName})`, t.id)
      .where(sql`${t.deletedAt} is null`),
    check('contacts_kind', sql`${t.kind} in ('person','organization')`),
    check(
      'contacts_display_name',
      sql`length(${t.displayName}) between 1 and 200 and ${t.displayName} = btrim(${t.displayName})`,
    ),
    check(
      'contacts_email',
      sql`${t.email} is null or (length(${t.email}) between 3 and 320 and ${t.email} = btrim(${t.email}))`,
    ),
    check(
      'contacts_phone',
      sql`${t.phone} is null or (length(${t.phone}) between 3 and 40 and ${t.phone} = btrim(${t.phone}))`,
    ),
    check('contacts_revision', sql`${t.revision} >= 1`),
  ],
);
/**
 * A contact's role on one matter. Visibility follows the matter grant; ending a link sets
 * deleted_at and keeps the row as history. At most one current link per contact and matter.
 */
export const matterParties = pgTable(
  'matter_parties',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    matterId: uuid('matter_id').notNull(),
    contactId: uuid('contact_id').notNull(),
    role: text('role').notNull(),
    label: text('label'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: 'matter_parties_matter_fk',
      columns: [t.firmId, t.matterId],
      foreignColumns: [matters.firmId, matters.id],
    }),
    foreignKey({
      name: 'matter_parties_contact_fk',
      columns: [t.firmId, t.contactId],
      foreignColumns: [contacts.firmId, contacts.id],
    }),
    uniqueIndex('matter_parties_current_uq')
      .on(t.firmId, t.matterId, t.contactId)
      .where(sql`${t.deletedAt} is null`),
    index('matter_parties_matter_idx').on(t.firmId, t.matterId, t.id),
    index('matter_parties_contact_idx').on(t.firmId, t.contactId, t.id),
    check('matter_parties_role', sql`${t.role} in ('client','adverse_party','other')`),
    check(
      'matter_parties_label',
      sql`(${t.label} is null and ${t.role} <> 'other') or (${t.label} is not null and length(${t.label}) between 1 and 80 and ${t.label} = btrim(${t.label}))`,
    ),
  ],
);
