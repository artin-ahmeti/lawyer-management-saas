import type { createApiClient, ContactListQuery } from '@lawfirm/api-client';
import {
  addMatterPartySchema,
  contactDetailSchema,
  contactListSchema,
  contactMatterListSchema,
  contactResultSchema,
  createContactSchema,
  endMatterPartySchema,
  matterPartyListSchema,
  matterPartyResultSchema,
  updateContactSchema,
  type AddMatterParty,
  type ContactRecord,
  type CreateContact,
  type EndMatterParty,
  type UpdateContact,
} from '@lawfirm/core';

type Client = ReturnType<typeof createApiClient>;
const action = () => ({ idempotencyKey: crypto.randomUUID(), requestId: crypto.randomUUID() });

export async function loadContactList(
  client: Pick<Client, 'contacts'>,
  firmId: string,
  query: ContactListQuery,
  signal?: AbortSignal,
) {
  const value = contactListSchema.parse(await client.contacts(query, signal));
  if (value.items.some((c) => c.firmId !== firmId)) throw new Error('Unexpected contact workspace');
  return value;
}
export async function loadContact(
  client: Pick<Client, 'contact'>,
  firmId: string,
  id: string,
  signal?: AbortSignal,
) {
  const value = contactDetailSchema.parse(await client.contact(id, signal));
  if (value.contact.firmId !== firmId || value.contact.id !== id)
    throw new Error('Unexpected contact workspace');
  return value;
}
export async function loadContactMatters(
  client: Pick<Client, 'contactMatters'>,
  id: string,
  signal?: AbortSignal,
  afterId?: string,
) {
  const value = contactMatterListSchema.parse(await client.contactMatters(id, signal, afterId));
  if (value.contactId !== id) throw new Error('Unexpected contact record');
  return value;
}
export async function loadMatterParties(
  client: Pick<Client, 'matterParties'>,
  firmId: string,
  matterId: string,
  signal?: AbortSignal,
  afterId?: string,
) {
  const value = matterPartyListSchema.parse(await client.matterParties(matterId, signal, afterId));
  if (
    value.matterId !== matterId ||
    value.items.some((p) => p.firmId !== firmId || p.matterId !== matterId)
  )
    throw new Error('Unexpected matter party record');
  return value;
}

export type ContactForm = { displayName: string; email: string; phone: string };
const optional = (value: string) => value.trim() || null;
/** The reviewed edit: only details that differ from the loaded revision, or null when unchanged. */
export function contactChanges(contact: ContactRecord, form: ContactForm): UpdateContact | null {
  const changes: Omit<UpdateContact, 'expectedRevision'> = {};
  if (form.displayName.trim() !== contact.displayName) changes.displayName = form.displayName;
  if (optional(form.email) !== contact.email) changes.email = optional(form.email);
  if (optional(form.phone) !== contact.phone) changes.phone = optional(form.phone);
  return Object.keys(changes).length
    ? updateContactSchema.parse({ expectedRevision: contact.revision, ...changes })
    : null;
}

export function prepareContactCommand(
  command:
    | { kind: 'create'; input: CreateContact }
    | { kind: 'update'; contactId: string; input: UpdateContact },
) {
  return command.kind === 'create'
    ? { ...command, input: createContactSchema.parse(command.input), ...action() }
    : { ...command, input: updateContactSchema.parse(command.input), ...action() };
}
export type ContactCommand = ReturnType<typeof prepareContactCommand>;
export async function submitContactCommand(
  client: Pick<Client, 'createContact' | 'updateContact'>,
  intent: ContactCommand,
  firmId: string,
  signal?: AbortSignal,
) {
  const keys = { idempotencyKey: intent.idempotencyKey, requestId: intent.requestId, signal };
  const value = contactResultSchema.parse(
    intent.kind === 'create'
      ? await client.createContact(intent.input, keys)
      : await client.updateContact(intent.contactId, intent.input, keys),
  );
  if (value.contact.firmId !== firmId) throw new Error('Unexpected contact workspace');
  if (intent.kind === 'update' && value.contact.id !== intent.contactId)
    throw new Error('Unexpected contact record');
  return value;
}

export function preparePartyCommand(
  command:
    | { kind: 'add'; matterId: string; input: AddMatterParty }
    | { kind: 'end'; matterId: string; input: EndMatterParty },
) {
  return command.kind === 'add'
    ? { ...command, input: addMatterPartySchema.parse(command.input), ...action() }
    : { ...command, input: endMatterPartySchema.parse(command.input), ...action() };
}
export type PartyCommand = ReturnType<typeof preparePartyCommand>;
export async function submitPartyCommand(
  client: Pick<Client, 'addMatterParty' | 'endMatterParty'>,
  intent: PartyCommand,
  firmId: string,
  signal?: AbortSignal,
) {
  const keys = { idempotencyKey: intent.idempotencyKey, requestId: intent.requestId, signal };
  const value = matterPartyResultSchema.parse(
    intent.kind === 'add'
      ? await client.addMatterParty(intent.matterId, intent.input, keys)
      : await client.endMatterParty(intent.matterId, intent.input, keys),
  );
  if (value.party.firmId !== firmId || value.party.matterId !== intent.matterId)
    throw new Error('Unexpected matter party record');
  return value;
}
