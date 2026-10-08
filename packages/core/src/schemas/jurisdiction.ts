import { z } from 'zod';
import { uuidSchema } from './common.js';
import { storableText } from './practice-profile.js';

/**
 * Jurisdiction, venue and governing-law references (M02-S04, D023). The catalog is code: adding
 * a jurisdiction is a deploy with a migration that widens the two database checks (the API
 * integration suite compares them). Forums are firm configuration; references live on the
 * matter and follow its grants. Nothing here implies jurisdiction-specific automation (p36).
 */
export const jurisdictionKindSchema = z.enum(['state', 'district', 'territory', 'federal']);
const states = [
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
] as const;
const territories = [
  ['AS', 'American Samoa'],
  ['GU', 'Guam'],
  ['MP', 'Northern Mariana Islands'],
  ['PR', 'Puerto Rico'],
  ['VI', 'U.S. Virgin Islands'],
] as const;
/** Codes are stable identifiers stored in the database; names are display text. */
export const usJurisdictions = [
  ...states.map(([code, name]) => ({ code, name, kind: 'state' as const })),
  { code: 'DC', name: 'District of Columbia', kind: 'district' } as const,
  ...territories.map(([code, name]) => ({ code, name, kind: 'territory' as const })),
  { code: 'US', name: 'Federal (United States)', kind: 'federal' } as const,
];
type Code = (typeof usJurisdictions)[number]['code'];
export const jurisdictionCodeSchema = z.enum(
  usJurisdictions.map((j) => j.code) as [Code, ...Code[]],
);
export const jurisdictionName = (code: JurisdictionCode) =>
  usJurisdictions.find((j) => j.code === code)!.name;

export const forumKindSchema = z.enum(['court', 'agency', 'tribunal', 'other']);
/**
 * Names, dockets and labels are one line of display text: no control characters, bidi
 * overrides or isolates (which reorder the rest of a rendered line) and no zero-width
 * characters (which make lookalike names pass the uniqueness rule).
 */
const spoofing = /[\p{Cc}\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/u;
const singleLineText = (schema: z.ZodString) =>
  storableText(schema).refine((v) => !spoofing.test(v), {
    message: 'Contains control or invisible characters.',
  });
const forumName = singleLineText(z.string().trim().min(1).max(200));
const revision = z.number().int().min(1).max(2_147_483_646);
export const createForumSchema = z.strictObject({
  name: forumName,
  kind: forumKindSchema,
  jurisdiction: jurisdictionCodeSchema,
});
/** Kind and jurisdiction are fixed, so existing references never change meaning. */
export const updateForumSchema = z
  .strictObject({
    expectedRevision: revision,
    name: forumName.optional(),
    archived: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.archived !== undefined, {
    message: 'Change the name or archive state.',
  });
export const forumParamsSchema = z.strictObject({ forumId: uuidSchema });
export const forumListQuerySchema = z
  .strictObject({
    status: z.enum(['active', 'archived']).default('active'),
    jurisdiction: jurisdictionCodeSchema.optional(),
    afterName: storableText(z.string().min(1).max(200)).optional(),
    afterId: uuidSchema.optional(),
  })
  .refine((v) => (v.afterName === undefined) === (v.afterId === undefined), {
    message: 'A cursor needs both afterName and afterId.',
  });
export const forumSchema = z.strictObject({
  id: uuidSchema,
  firmId: uuidSchema,
  name: z.string().min(1).max(200),
  kind: forumKindSchema,
  jurisdiction: jurisdictionCodeSchema,
  archived: z.boolean(),
  revision: z.number().int().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const forumListSchema = z.strictObject({
  items: z.array(forumSchema).max(20),
  nextCursor: z.strictObject({ afterName: z.string(), afterId: uuidSchema }).nullable(),
  canCreate: z.boolean(),
  canManage: z.boolean(),
});
export const forumResultSchema = z.strictObject({ forum: forumSchema, commandId: uuidSchema });

/** Governing law names a body of law, never a forum or docket. */
export const jurisdictionPurposeSchema = z.enum(['governing_law', 'venue', 'agency', 'other']);
/** The most current references one matter may hold. */
export const matterJurisdictionLimit = 50;
/** All references a matter may ever hold, ended ones included, so history stays bounded. */
export const matterJurisdictionHistoryLimit = 500;
export const addMatterJurisdictionSchema = z
  .strictObject({
    purpose: jurisdictionPurposeSchema,
    jurisdiction: jurisdictionCodeSchema,
    forumId: uuidSchema.optional(),
    docketNumber: singleLineText(z.string().trim().min(1).max(100)).optional(),
    label: singleLineText(z.string().trim().min(1).max(80)).optional(),
  })
  .refine(
    (v) =>
      v.purpose !== 'governing_law' || (v.forumId === undefined && v.docketNumber === undefined),
    { message: 'Governing law has no forum or docket number.', path: ['forumId'] },
  )
  .refine((v) => (v.purpose === 'other') === (v.label !== undefined), {
    message: 'Describe an other reference, and only an other reference.',
    path: ['label'],
  });
export const endMatterJurisdictionSchema = z.strictObject({ referenceId: uuidSchema });
export const matterJurisdictionSchema = z.strictObject({
  id: uuidSchema,
  firmId: uuidSchema,
  matterId: uuidSchema,
  purpose: jurisdictionPurposeSchema,
  jurisdiction: jurisdictionCodeSchema,
  forum: z
    .strictObject({
      id: uuidSchema,
      name: z.string().min(1).max(200),
      kind: forumKindSchema,
      archived: z.boolean(),
    })
    .nullable(),
  docketNumber: z.string().max(100).nullable(),
  label: z.string().max(80).nullable(),
  /** No jurisdiction-specific behavior is released yet; manual entry stays possible (p36). */
  automation: z.literal('none'),
  createdAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
});
export const matterJurisdictionListSchema = z.strictObject({
  matterId: uuidSchema,
  items: z.array(matterJurisdictionSchema).max(matterJurisdictionLimit),
  canManage: z.boolean(),
});
export const matterJurisdictionResultSchema = z.strictObject({
  reference: matterJurisdictionSchema,
  commandId: uuidSchema,
});

export type JurisdictionCode = z.infer<typeof jurisdictionCodeSchema>;
export type JurisdictionKind = z.infer<typeof jurisdictionKindSchema>;
export type ForumKind = z.infer<typeof forumKindSchema>;
export type CreateForum = z.infer<typeof createForumSchema>;
export type UpdateForum = z.infer<typeof updateForumSchema>;
export type ForumListQuery = z.infer<typeof forumListQuerySchema>;
export type ForumRecord = z.infer<typeof forumSchema>;
export type ForumList = z.infer<typeof forumListSchema>;
export type ForumResult = z.infer<typeof forumResultSchema>;
export type JurisdictionPurpose = z.infer<typeof jurisdictionPurposeSchema>;
export type AddMatterJurisdiction = z.infer<typeof addMatterJurisdictionSchema>;
export type EndMatterJurisdiction = z.infer<typeof endMatterJurisdictionSchema>;
export type MatterJurisdictionRecord = z.infer<typeof matterJurisdictionSchema>;
export type MatterJurisdictionList = z.infer<typeof matterJurisdictionListSchema>;
export type MatterJurisdictionResult = z.infer<typeof matterJurisdictionResultSchema>;
