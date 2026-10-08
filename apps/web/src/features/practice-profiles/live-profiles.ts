import type { createApiClient, PracticeProfileListQuery } from '@lawfirm/api-client';
import {
  createPracticeProfileSchema,
  matterFieldsResultSchema,
  matterFieldsSchema,
  practiceFieldListSchema,
  practiceProfileDetailSchema,
  practiceProfileListSchema,
  practiceProfileResultSchema,
  revisePracticeProfileSchema,
  updateMatterFieldsSchema,
  type CreatePracticeProfile,
  type PracticeFieldDefinition,
  type PracticeFieldPatch,
  type PracticeFieldValues,
  type PracticeProfileRecord,
  type RevisePracticeProfile,
  type UpdateMatterFields,
} from '@lawfirm/core';

type Client = ReturnType<typeof createApiClient>;
const action = () => ({ idempotencyKey: crypto.randomUUID(), requestId: crypto.randomUUID() });

export async function loadProfileList(
  client: Pick<Client, 'practiceProfiles'>,
  firmId: string,
  query: PracticeProfileListQuery,
  signal?: AbortSignal,
) {
  const value = practiceProfileListSchema.parse(await client.practiceProfiles(query, signal));
  if (value.items.some((p) => p.firmId !== firmId))
    throw new Error('Unexpected practice profile workspace');
  return value;
}
export async function loadProfile(
  client: Pick<Client, 'practiceProfile'>,
  firmId: string,
  id: string,
  signal?: AbortSignal,
) {
  const value = practiceProfileDetailSchema.parse(await client.practiceProfile(id, signal));
  if (value.profile.firmId !== firmId || value.profile.id !== id)
    throw new Error('Unexpected practice profile workspace');
  return value;
}
export async function loadMatterFields(
  client: Pick<Client, 'matterFields'>,
  matterId: string,
  signal?: AbortSignal,
) {
  const value = matterFieldsSchema.parse(await client.matterFields(matterId, signal));
  if (value.matterId !== matterId) throw new Error('Unexpected matter record');
  return value;
}

/** Form state per field: text for every type; yes/no is '', 'yes' or 'no'. */
export type FieldForm = Record<string, string>;
export function fieldForm(
  fields: readonly PracticeFieldDefinition[],
  values: PracticeFieldValues,
): FieldForm {
  return Object.fromEntries(
    fields.map((f) => {
      const v = Object.hasOwn(values, f.key) ? values[f.key] : undefined;
      return [
        f.key,
        v === undefined ? '' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v),
      ];
    }),
  );
}
/**
 * The typed changes a form makes to the current values. An emptied field clears a value that
 * was set; numbers that do not parse stay as text so the shared rules name the field.
 */
export function fieldPatch(
  fields: readonly PracticeFieldDefinition[],
  current: PracticeFieldValues,
  form: FieldForm,
): PracticeFieldPatch {
  const patch: PracticeFieldPatch = {};
  for (const field of fields) {
    const raw = (Object.hasOwn(form, field.key) ? (form[field.key] ?? '') : '').trim();
    const had = Object.hasOwn(current, field.key);
    if (!raw) {
      if (had) patch[field.key] = null;
      continue;
    }
    const value =
      field.type === 'yes_no'
        ? raw === 'yes'
        : field.type === 'number'
          ? Number.isFinite(Number(raw))
            ? Number(raw)
            : raw
          : raw;
    if (!had || current[field.key] !== value) patch[field.key] = value;
  }
  return patch;
}

/** A key that matches the shared key pattern, derived from a label for new fields. */
export function keyFromLabel(label: string) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const key = !slug ? 'field' : /^[a-z]/.test(slug) ? slug : `f_${slug}`;
  return key.slice(0, 40).replace(/_+$/, '');
}

export type ProfileForm = {
  name: string;
  description: string;
  fields: PracticeFieldDefinition[];
  archived: boolean;
};
/** The reviewed revision: only details that differ, or null when nothing changed. */
export function profileChanges(
  profile: PracticeProfileRecord,
  form: ProfileForm,
): RevisePracticeProfile | null {
  const changes: Omit<RevisePracticeProfile, 'expectedRevision'> = {};
  if (form.name.trim() !== profile.name) changes.name = form.name;
  const description = form.description.trim() || null;
  if (description !== profile.description) changes.description = description;
  // Both sides pass through the shared schema, so key order never reads as a change.
  const fields = practiceFieldListSchema.safeParse(form.fields);
  const same =
    fields.success &&
    JSON.stringify(fields.data) ===
      JSON.stringify(practiceFieldListSchema.parse(profile.currentVersion.fields));
  if (!same) changes.fields = form.fields;
  if (form.archived !== profile.archived) changes.archived = form.archived;
  return Object.keys(changes).length
    ? revisePracticeProfileSchema.parse({ expectedRevision: profile.revision, ...changes })
    : null;
}

export function prepareProfileCommand(
  command:
    | { kind: 'create'; input: CreatePracticeProfile }
    | { kind: 'revise'; profileId: string; input: RevisePracticeProfile },
) {
  return command.kind === 'create'
    ? { ...command, input: createPracticeProfileSchema.parse(command.input), ...action() }
    : { ...command, input: revisePracticeProfileSchema.parse(command.input), ...action() };
}
export type ProfileCommand = ReturnType<typeof prepareProfileCommand>;
export async function submitProfileCommand(
  client: Pick<Client, 'createPracticeProfile' | 'revisePracticeProfile'>,
  intent: ProfileCommand,
  firmId: string,
  signal?: AbortSignal,
) {
  const keys = { idempotencyKey: intent.idempotencyKey, requestId: intent.requestId, signal };
  const value = practiceProfileResultSchema.parse(
    intent.kind === 'create'
      ? await client.createPracticeProfile(intent.input, keys)
      : await client.revisePracticeProfile(intent.profileId, intent.input, keys),
  );
  if (value.profile.firmId !== firmId) throw new Error('Unexpected practice profile workspace');
  if (intent.kind === 'revise' && value.profile.id !== intent.profileId)
    throw new Error('Unexpected practice profile record');
  return value;
}

export function prepareMatterFieldsCommand(matterId: string, input: UpdateMatterFields) {
  return { matterId, input: updateMatterFieldsSchema.parse(input), ...action() };
}
export type MatterFieldsCommand = ReturnType<typeof prepareMatterFieldsCommand>;
export async function submitMatterFieldsCommand(
  client: Pick<Client, 'updateMatterFields'>,
  intent: MatterFieldsCommand,
  signal?: AbortSignal,
) {
  const value = matterFieldsResultSchema.parse(
    await client.updateMatterFields(intent.matterId, intent.input, {
      idempotencyKey: intent.idempotencyKey,
      requestId: intent.requestId,
      signal,
    }),
  );
  if (value.fields.matterId !== intent.matterId) throw new Error('Unexpected matter record');
  return value;
}
