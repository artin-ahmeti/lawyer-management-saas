import type { createApiClient, ForumListQuery } from '@lawfirm/api-client';
import {
  addMatterJurisdictionSchema,
  createForumSchema,
  endMatterJurisdictionSchema,
  forumListSchema,
  forumResultSchema,
  jurisdictionName,
  matterJurisdictionListSchema,
  matterJurisdictionResultSchema,
  updateForumSchema,
  usJurisdictions,
  type AddMatterJurisdiction,
  type CreateForum,
  type EndMatterJurisdiction,
  type ForumKind,
  type ForumRecord,
  type JurisdictionPurpose,
  type MatterJurisdictionRecord,
  type UpdateForum,
} from '@lawfirm/core';

type Client = ReturnType<typeof createApiClient>;
const action = () => ({ idempotencyKey: crypto.randomUUID(), requestId: crypto.randomUUID() });

export const purposes: { value: JurisdictionPurpose; label: string; help: string }[] = [
  {
    value: 'governing_law',
    label: 'Governing law',
    help: 'The law that governs an agreement or question. No forum or docket.',
  },
  { value: 'venue', label: 'Venue or proceeding', help: 'A court, tribunal or other forum.' },
  { value: 'agency', label: 'Agency', help: 'A government agency handling the matter.' },
  { value: 'other', label: 'Other', help: 'Describe it, for example arbitration seat.' },
];
export const purposeLabel = (purpose: JurisdictionPurpose) =>
  purposes.find((p) => p.value === purpose)!.label;
export const forumKinds: { value: ForumKind; label: string }[] = [
  { value: 'court', label: 'Court' },
  { value: 'agency', label: 'Agency' },
  { value: 'tribunal', label: 'Tribunal' },
  { value: 'other', label: 'Other body' },
];
export const forumKindLabel = (kind: ForumKind) => forumKinds.find((k) => k.value === kind)!.label;

/** Picker groups: federal first, then states, DC and territories in catalog order. */
export function jurisdictionGroups() {
  const options = (kind: string) =>
    usJurisdictions.filter((j) => j.kind === kind).map((j) => ({ value: j.code, label: j.name }));
  return [
    { label: 'Federal', options: options('federal') },
    { label: 'States', options: options('state') },
    { label: 'District of Columbia', options: options('district') },
    { label: 'Territories', options: options('territory') },
  ];
}

export type ReferenceForm = {
  purpose: JurisdictionPurpose;
  jurisdiction: string;
  forumId: string;
  docketNumber: string;
  label: string;
};
export const emptyReferenceForm: ReferenceForm = {
  purpose: 'venue',
  jurisdiction: '',
  forumId: '',
  docketNumber: '',
  label: '',
};
/** The add request for the chosen purpose; fields that purpose does not take are left out. */
export function referenceInput(form: ReferenceForm): AddMatterJurisdiction | null {
  const law = form.purpose === 'governing_law';
  const result = addMatterJurisdictionSchema.safeParse({
    purpose: form.purpose,
    jurisdiction: form.jurisdiction,
    ...(!law && form.forumId ? { forumId: form.forumId } : {}),
    ...(!law && form.docketNumber.trim() ? { docketNumber: form.docketNumber } : {}),
    ...(form.purpose === 'other' ? { label: form.label } : {}),
  });
  return result.success ? result.data : null;
}
/** Jurisdiction, forum and docket, in reading order; the purpose and label are shown apart. */
export function referenceDetails(reference: MatterJurisdictionRecord) {
  return [
    jurisdictionName(reference.jurisdiction),
    ...(reference.forum
      ? [`${reference.forum.name}${reference.forum.archived ? ' (archived)' : ''}`]
      : []),
    ...(reference.docketNumber ? [`No. ${reference.docketNumber}`] : []),
  ];
}

export async function loadForumList(
  client: Pick<Client, 'forums'>,
  firmId: string,
  query: ForumListQuery,
  signal?: AbortSignal,
) {
  const value = forumListSchema.parse(await client.forums(query, signal));
  if (value.items.some((f) => f.firmId !== firmId)) throw new Error('Unexpected forum workspace');
  return value;
}
export async function loadMatterJurisdictions(
  client: Pick<Client, 'matterJurisdictions'>,
  firmId: string,
  matterId: string,
  signal?: AbortSignal,
) {
  const value = matterJurisdictionListSchema.parse(
    await client.matterJurisdictions(matterId, signal),
  );
  if (
    value.matterId !== matterId ||
    value.items.some((r) => r.firmId !== firmId || r.matterId !== matterId)
  )
    throw new Error('Unexpected matter jurisdiction record');
  return value;
}

/** The reviewed edit: only details that differ from the loaded revision, or null when unchanged. */
export function forumChanges(
  forum: ForumRecord,
  form: { name: string; archived: boolean },
): UpdateForum | null {
  const changes: Omit<UpdateForum, 'expectedRevision'> = {};
  if (form.name.trim() !== forum.name) changes.name = form.name;
  if (form.archived !== forum.archived) changes.archived = form.archived;
  return Object.keys(changes).length
    ? updateForumSchema.parse({ expectedRevision: forum.revision, ...changes })
    : null;
}
export function prepareForumCommand(
  command:
    | { kind: 'create'; input: CreateForum }
    | { kind: 'update'; forumId: string; input: UpdateForum },
) {
  return command.kind === 'create'
    ? { ...command, input: createForumSchema.parse(command.input), ...action() }
    : { ...command, input: updateForumSchema.parse(command.input), ...action() };
}
export type ForumCommand = ReturnType<typeof prepareForumCommand>;
export async function submitForumCommand(
  client: Pick<Client, 'createForum' | 'updateForum'>,
  intent: ForumCommand,
  firmId: string,
  signal?: AbortSignal,
) {
  const keys = { idempotencyKey: intent.idempotencyKey, requestId: intent.requestId, signal };
  const value = forumResultSchema.parse(
    intent.kind === 'create'
      ? await client.createForum(intent.input, keys)
      : await client.updateForum(intent.forumId, intent.input, keys),
  );
  if (value.forum.firmId !== firmId) throw new Error('Unexpected forum workspace');
  if (intent.kind === 'update' && value.forum.id !== intent.forumId)
    throw new Error('Unexpected forum record');
  return value;
}

export function prepareReferenceCommand(
  command:
    | { kind: 'add'; matterId: string; input: AddMatterJurisdiction }
    | { kind: 'end'; matterId: string; input: EndMatterJurisdiction },
) {
  return command.kind === 'add'
    ? { ...command, input: addMatterJurisdictionSchema.parse(command.input), ...action() }
    : { ...command, input: endMatterJurisdictionSchema.parse(command.input), ...action() };
}
export type ReferenceCommand = ReturnType<typeof prepareReferenceCommand>;
export async function submitReferenceCommand(
  client: Pick<Client, 'addMatterJurisdiction' | 'endMatterJurisdiction'>,
  intent: ReferenceCommand,
  firmId: string,
  signal?: AbortSignal,
) {
  const keys = { idempotencyKey: intent.idempotencyKey, requestId: intent.requestId, signal };
  const value = matterJurisdictionResultSchema.parse(
    intent.kind === 'add'
      ? await client.addMatterJurisdiction(intent.matterId, intent.input, keys)
      : await client.endMatterJurisdiction(intent.matterId, intent.input, keys),
  );
  if (value.reference.firmId !== firmId || value.reference.matterId !== intent.matterId)
    throw new Error('Unexpected matter jurisdiction record');
  return value;
}
