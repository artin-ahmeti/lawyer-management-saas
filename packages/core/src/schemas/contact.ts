import { z } from 'zod';
import { uuidSchema } from './common.js';

/**
 * Firm contact directory and matter-party links (M02-S02, D021). Directory entries are
 * visible to live staff of the firm; a party link is visible only through a current
 * matter grant, so contact reads never disclose a walled matter or its count.
 */
export const contactKindSchema = z.enum(['person', 'organization']);
const displayName = z.string().trim().min(1).max(200);
const email = z.string().trim().max(320).pipe(z.email());
const phone = z
  .string()
  .trim()
  .max(40)
  .regex(/^\+?[0-9][0-9().\-\s]{1,30}[0-9)](\s*(x|ext\.?)\s*[0-9]{1,6})?$/i);
const revision = z.number().int().min(1).max(2_147_483_646);

export const createContactSchema = z.strictObject({
  kind: contactKindSchema,
  displayName,
  email: email.optional(),
  phone: phone.optional(),
});
/** Kind is fixed at creation; `null` clears an optional detail. */
export const updateContactSchema = z
  .strictObject({
    expectedRevision: revision,
    displayName: displayName.optional(),
    email: email.nullable().optional(),
    phone: phone.nullable().optional(),
  })
  .refine((v) => v.displayName !== undefined || v.email !== undefined || v.phone !== undefined, {
    message: 'Change at least one contact detail.',
  });
export const contactParamsSchema = z.strictObject({ contactId: uuidSchema });
export const contactListQuerySchema = z
  .strictObject({
    q: z.string().trim().min(1).max(100).optional(),
    afterName: z.string().min(1).max(200).optional(),
    afterId: uuidSchema.optional(),
  })
  .refine((v) => (v.afterName === undefined) === (v.afterId === undefined), {
    message: 'A cursor needs both afterName and afterId.',
  });
export const contactSchema = z.strictObject({
  id: uuidSchema,
  firmId: uuidSchema,
  kind: contactKindSchema,
  displayName: z.string().min(1).max(200),
  email: z.string().max(320).nullable(),
  phone: z.string().max(40).nullable(),
  revision: z.number().int().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const contactListSchema = z.strictObject({
  items: z.array(contactSchema).max(20),
  nextCursor: z.strictObject({ afterName: z.string(), afterId: uuidSchema }).nullable(),
  canEdit: z.boolean(),
});
export const contactDetailSchema = z.strictObject({ contact: contactSchema, canEdit: z.boolean() });
export const contactResultSchema = z.strictObject({
  contact: contactSchema,
  commandId: uuidSchema,
});

export const matterPartyRoleSchema = z.enum(['client', 'adverse_party', 'other']);
export const addMatterPartySchema = z
  .strictObject({
    contactId: uuidSchema,
    role: matterPartyRoleSchema,
    label: z.string().trim().min(1).max(80).optional(),
  })
  .refine((v) => v.role !== 'other' || v.label !== undefined, {
    message: 'Describe the role of an other party.',
    path: ['label'],
  });
export const endMatterPartySchema = z.strictObject({ partyId: uuidSchema });
export const partyPageQuerySchema = z.strictObject({ afterId: uuidSchema.optional() });
export const matterPartySchema = z.strictObject({
  id: uuidSchema,
  firmId: uuidSchema,
  matterId: uuidSchema,
  contactId: uuidSchema,
  contact: z.strictObject({ kind: contactKindSchema, displayName: z.string().min(1).max(200) }),
  role: matterPartyRoleSchema,
  label: z.string().max(80).nullable(),
  createdAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
});
export const matterPartyListSchema = z.strictObject({
  matterId: uuidSchema,
  items: z.array(matterPartySchema).max(20),
  nextCursor: uuidSchema.nullable(),
  canManage: z.boolean(),
});
export const matterPartyResultSchema = z.strictObject({
  party: matterPartySchema,
  commandId: uuidSchema,
});
/** Only matters the reader is currently granted; no total or hidden count. */
export const contactMatterListSchema = z.strictObject({
  contactId: uuidSchema,
  items: z
    .array(
      z.strictObject({
        partyId: uuidSchema,
        matterId: uuidSchema,
        title: z.string().min(1).max(200),
        reference: z.string().max(80).nullable(),
        role: matterPartyRoleSchema,
        label: z.string().max(80).nullable(),
      }),
    )
    .max(20),
  nextCursor: uuidSchema.nullable(),
});

export type ContactKind = z.infer<typeof contactKindSchema>;
export type CreateContact = z.infer<typeof createContactSchema>;
export type UpdateContact = z.infer<typeof updateContactSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
export type ContactRecord = z.infer<typeof contactSchema>;
export type ContactList = z.infer<typeof contactListSchema>;
export type ContactDetail = z.infer<typeof contactDetailSchema>;
export type ContactResult = z.infer<typeof contactResultSchema>;
export type MatterPartyRole = z.infer<typeof matterPartyRoleSchema>;
export type AddMatterParty = z.infer<typeof addMatterPartySchema>;
export type EndMatterParty = z.infer<typeof endMatterPartySchema>;
export type MatterPartyRecord = z.infer<typeof matterPartySchema>;
export type MatterPartyList = z.infer<typeof matterPartyListSchema>;
export type MatterPartyResult = z.infer<typeof matterPartyResultSchema>;
export type ContactMatterList = z.infer<typeof contactMatterListSchema>;
