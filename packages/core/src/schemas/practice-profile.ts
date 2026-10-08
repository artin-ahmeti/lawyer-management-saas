import { z } from 'zod';
import { uuidSchema } from './common.js';

/**
 * Firm practice profiles and typed matter fields (M02-S03, D022). A profile is firm
 * configuration visible to live staff; each published field set is an immutable version.
 * A matter pins one version and its values follow the matter's grants.
 */
export const practiceFieldTypeSchema = z.enum([
  'text',
  'long_text',
  'number',
  'date',
  'yes_no',
  'choice',
]);
export const practiceFieldKeySchema = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
export const MAX_PRACTICE_FIELDS = 50;
const label = z.string().trim().min(1).max(80);
const fieldBase = {
  key: practiceFieldKeySchema,
  label,
  required: z.boolean(),
  help: z.string().trim().min(1).max(200).optional(),
};
export const practiceFieldDefinitionSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...fieldBase,
    type: z.enum(['text', 'long_text', 'number', 'date', 'yes_no']),
  }),
  z.strictObject({
    ...fieldBase,
    type: z.literal('choice'),
    options: z
      .array(label)
      .min(1)
      .max(50)
      .refine((o) => new Set(o.map((v) => v.toLowerCase())).size === o.length, {
        message: 'Choice options must be distinct.',
      }),
  }),
]);
export const practiceFieldListSchema = z
  .array(practiceFieldDefinitionSchema)
  .max(MAX_PRACTICE_FIELDS)
  .refine((f) => new Set(f.map((d) => d.key)).size === f.length, {
    message: 'Field keys must be distinct.',
  });

/** Generic operational starters (pp34–35); not reviewed for any jurisdiction. */
export const practiceStarterKeySchema = z.enum([
  'civil_litigation',
  'injury_insurance',
  'family',
  'criminal_defense',
  'estates_probate',
  'immigration',
  'bankruptcy',
  'corporate_transactional',
  'real_estate',
  'employment',
  'intellectual_property',
  'regulatory_appellate',
]);
const basedOn = z.strictObject({
  key: practiceStarterKeySchema,
  version: z.number().int().min(1).max(1000),
});
const name = z.string().trim().min(1).max(80);
const description = z.string().trim().min(1).max(300);
const revision = z.number().int().min(1).max(2_147_483_646);

export const createPracticeProfileSchema = z.strictObject({
  name,
  description: description.optional(),
  basedOn: basedOn.optional(),
  fields: practiceFieldListSchema,
});
/** Changing fields publishes the next version; name/description/archive change the profile. */
export const revisePracticeProfileSchema = z
  .strictObject({
    expectedRevision: revision,
    name: name.optional(),
    description: description.nullable().optional(),
    fields: practiceFieldListSchema.optional(),
    archived: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.description !== undefined ||
      v.fields !== undefined ||
      v.archived !== undefined,
    { message: 'Change at least one profile detail.' },
  );
export const practiceProfileParamsSchema = z.strictObject({ profileId: uuidSchema });
export const practiceProfileListQuerySchema = z
  .strictObject({
    status: z.enum(['active', 'archived']).default('active'),
    afterName: z.string().min(1).max(80).optional(),
    afterId: uuidSchema.optional(),
  })
  .refine((v) => (v.afterName === undefined) === (v.afterId === undefined), {
    message: 'A cursor needs both afterName and afterId.',
  });

const profileCore = {
  id: uuidSchema,
  firmId: uuidSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(300).nullable(),
  basedOn: basedOn.nullable(),
  archived: z.boolean(),
  revision: z.number().int().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};
export const practiceProfileVersionSchema = z.strictObject({
  id: uuidSchema,
  version: z.number().int().min(1),
  fields: practiceFieldListSchema,
  createdAt: z.iso.datetime(),
});
export const practiceProfileSummarySchema = z.strictObject({
  ...profileCore,
  currentVersion: z.number().int().min(1),
  fieldCount: z.number().int().min(0).max(MAX_PRACTICE_FIELDS),
});
export const practiceProfileSchema = z.strictObject({
  ...profileCore,
  currentVersion: practiceProfileVersionSchema,
});
export const practiceProfileListSchema = z.strictObject({
  items: z.array(practiceProfileSummarySchema).max(20),
  nextCursor: z.strictObject({ afterName: z.string(), afterId: uuidSchema }).nullable(),
  canManage: z.boolean(),
});
export const practiceProfileDetailSchema = z.strictObject({
  profile: practiceProfileSchema,
  canManage: z.boolean(),
});
export const practiceProfileResultSchema = z.strictObject({
  profile: practiceProfileSchema,
  commandId: uuidSchema,
});

/** One stored value per field type; `null` in an edit clears an optional value. */
export const practiceFieldValueSchema = z.union([z.string().max(5000), z.number(), z.boolean()]);
export const practiceFieldValuesSchema = z
  .record(practiceFieldKeySchema, practiceFieldValueSchema)
  .refine((v) => Object.keys(v).length <= MAX_PRACTICE_FIELDS, { message: 'Too many fields.' });
export const practiceFieldPatchSchema = z
  .record(practiceFieldKeySchema, practiceFieldValueSchema.nullable())
  .refine((v) => Object.keys(v).length <= MAX_PRACTICE_FIELDS, { message: 'Too many fields.' });

export const matterFieldsSchema = z.strictObject({
  matterId: uuidSchema,
  revision: z.number().int().min(1),
  profile: z
    .strictObject({
      id: uuidSchema,
      name: z.string().min(1).max(80),
      archived: z.boolean(),
      version: practiceProfileVersionSchema,
    })
    .nullable(),
  values: practiceFieldValuesSchema,
  canEdit: z.boolean(),
});
/** `profileVersionId` assigns a profile only to a matter without one. */
export const updateMatterFieldsSchema = z.strictObject({
  expectedRevision: revision,
  profileVersionId: uuidSchema.optional(),
  values: practiceFieldPatchSchema,
});
export const matterFieldsResultSchema = z.strictObject({
  fields: matterFieldsSchema,
  commandId: uuidSchema,
});

export type PracticeFieldType = z.infer<typeof practiceFieldTypeSchema>;
export type PracticeFieldDefinition = z.infer<typeof practiceFieldDefinitionSchema>;
export type PracticeFieldValue = z.infer<typeof practiceFieldValueSchema>;
export type PracticeFieldValues = z.infer<typeof practiceFieldValuesSchema>;
export type PracticeFieldPatch = z.infer<typeof practiceFieldPatchSchema>;
export type PracticeStarterKey = z.infer<typeof practiceStarterKeySchema>;
export type CreatePracticeProfile = z.infer<typeof createPracticeProfileSchema>;
export type RevisePracticeProfile = z.infer<typeof revisePracticeProfileSchema>;
export type PracticeProfileListQuery = z.infer<typeof practiceProfileListQuerySchema>;
export type PracticeProfileVersion = z.infer<typeof practiceProfileVersionSchema>;
export type PracticeProfileSummary = z.infer<typeof practiceProfileSummarySchema>;
export type PracticeProfileRecord = z.infer<typeof practiceProfileSchema>;
export type PracticeProfileList = z.infer<typeof practiceProfileListSchema>;
export type PracticeProfileDetail = z.infer<typeof practiceProfileDetailSchema>;
export type PracticeProfileResult = z.infer<typeof practiceProfileResultSchema>;
export type MatterFields = z.infer<typeof matterFieldsSchema>;
export type UpdateMatterFields = z.infer<typeof updateMatterFieldsSchema>;
export type MatterFieldsResult = z.infer<typeof matterFieldsResultSchema>;

/** Per-field problems name the field by key so device and server report the same issue. */
export type FieldValueIssue = { key: string; message: string };
const fieldValueSchema = (field: PracticeFieldDefinition): z.ZodType<PracticeFieldValue> => {
  switch (field.type) {
    case 'text':
      return z.string().trim().min(1).max(500);
    case 'long_text':
      return z.string().trim().min(1).max(5000);
    case 'number':
      return z.number().finite().min(-1e12).max(1e12);
    case 'date':
      return z.iso.date();
    case 'yes_no':
      return z.boolean();
    case 'choice':
      return z.string().refine((v) => field.options.includes(v));
  }
};
const messageFor = (field: PracticeFieldDefinition) =>
  ({
    text: `${field.label} needs 1–500 characters.`,
    long_text: `${field.label} needs 1–5000 characters.`,
    number: `${field.label} needs a number.`,
    date: `${field.label} needs a date (YYYY-MM-DD).`,
    yes_no: `${field.label} needs yes or no.`,
    choice: `${field.label} needs one of its listed options.`,
  })[field.type];

/**
 * Applies a patch to the current values under one pinned field set. Unknown keys, wrong
 * types, options outside the list and missing required values are refused; `null` clears.
 */
export function applyFieldValues(
  fields: readonly PracticeFieldDefinition[],
  current: PracticeFieldValues,
  patch: PracticeFieldPatch,
):
  | { ok: true; values: PracticeFieldValues; changed: string[] }
  | { ok: false; issues: FieldValueIssue[] } {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const issues: FieldValueIssue[] = [];
  const values: PracticeFieldValues = { ...current };
  for (const [key, raw] of Object.entries(patch)) {
    const field = byKey.get(key);
    if (!field) {
      issues.push({ key, message: 'This field is not part of the matter profile.' });
      continue;
    }
    if (raw === null) {
      delete values[key];
      continue;
    }
    const parsed = fieldValueSchema(field).safeParse(raw);
    if (parsed.success) values[key] = parsed.data;
    else issues.push({ key, message: messageFor(field) });
  }
  for (const field of fields)
    if (
      field.required &&
      values[field.key] === undefined &&
      !issues.some((i) => i.key === field.key)
    )
      issues.push({ key: field.key, message: `${field.label} is required.` });
  if (issues.length) return { ok: false, issues };
  const changed = [...new Set([...Object.keys(current), ...Object.keys(values)])]
    .filter((k) => current[k] !== values[k])
    .sort();
  return { ok: true, values, changed };
}
