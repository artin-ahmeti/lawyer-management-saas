import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  contactChanges,
  loadContact,
  loadContactList,
  loadContactMatters,
  loadMatterParties,
  prepareContactCommand,
  submitContactCommand,
  submitPartyCommand,
  preparePartyCommand,
} from './live-contacts';

const firmId = randomUUID(),
  id = randomUUID(),
  matterId = randomUUID();
const now = new Date().toISOString();
const contact = {
  id,
  firmId,
  kind: 'person' as const,
  displayName: 'Maria Alvarez',
  email: 'maria@example.test',
  phone: null,
  revision: 2,
  createdAt: now,
  updatedAt: now,
};
const party = {
  id: randomUUID(),
  firmId,
  matterId,
  contactId: id,
  contact: { kind: 'person' as const, displayName: 'Maria Alvarez' },
  role: 'client' as const,
  label: null,
  createdAt: now,
  endedAt: null,
};

it('binds directory, contact, contact-matter and party reads to the requested workspace and record', async () => {
  const foreign = { ...contact, firmId: randomUUID() };
  await expect(
    loadContactList(
      { contacts: async () => ({ items: [foreign], nextCursor: null, canEdit: true }) },
      firmId,
      {},
    ),
  ).rejects.toThrow('workspace');
  await expect(
    loadContact(
      { contact: async () => ({ contact: { ...contact, id: randomUUID() }, canEdit: true }) },
      firmId,
      id,
    ),
  ).rejects.toThrow('contact');
  await expect(
    loadContactMatters(
      {
        contactMatters: async () => ({ contactId: randomUUID(), items: [], nextCursor: null }),
      },
      id,
    ),
  ).rejects.toThrow('contact');
  await expect(
    loadMatterParties(
      {
        matterParties: async () => ({
          matterId,
          items: [{ ...party, matterId: randomUUID() }],
          nextCursor: null,
          canManage: true,
        }),
      },
      firmId,
      matterId,
    ),
  ).rejects.toThrow('matter');
});

it('sends only changed contact details against the reviewed revision', () => {
  expect(
    contactChanges(contact, {
      displayName: ' Maria Alvarez ',
      email: '',
      phone: '+1 415 555 0100',
    }),
  ).toEqual({ expectedRevision: 2, email: null, phone: '+1 415 555 0100' });
  expect(
    contactChanges(contact, { displayName: 'Maria Alvarez', email: contact.email, phone: '' }),
  ).toBeNull();
});

it('keeps one contact intent across an uncertain response and rejects a foreign receipt', async () => {
  const intent = prepareContactCommand({
    kind: 'create',
    input: { kind: 'person', displayName: 'Maria' },
  });
  const attempts: unknown[] = [];
  let fail = true;
  const client = {
    createContact: async (input: unknown, action: unknown) => {
      attempts.push({ input, action });
      if (fail) {
        fail = false;
        throw new Error('response lost');
      }
      return { contact, commandId: randomUUID() };
    },
    updateContact: async () => ({
      contact: { ...contact, firmId: randomUUID() },
      commandId: randomUUID(),
    }),
  };
  await expect(submitContactCommand(client, intent, firmId)).rejects.toThrow('response lost');
  expect((await submitContactCommand(client, intent, firmId)).contact.id).toBe(id);
  expect(attempts[0]).toEqual(attempts[1]);
  const update = prepareContactCommand({
    kind: 'update',
    contactId: id,
    input: { expectedRevision: 2, phone: null },
  });
  await expect(submitContactCommand(client, update, firmId)).rejects.toThrow('workspace');
});

it('keeps one party intent and rejects a result for another matter', async () => {
  const intent = preparePartyCommand({
    kind: 'add',
    matterId,
    input: { contactId: id, role: 'client' },
  });
  const ending = preparePartyCommand({ kind: 'end', matterId, input: { partyId: party.id } });
  const client = {
    addMatterParty: async () => ({ party, commandId: randomUUID() }),
    endMatterParty: async () => ({
      party: { ...party, matterId: randomUUID() },
      commandId: randomUUID(),
    }),
  };
  expect((await submitPartyCommand(client, intent, firmId)).party.id).toBe(party.id);
  await expect(submitPartyCommand(client, ending, firmId)).rejects.toThrow('matter');
  expect(() =>
    preparePartyCommand({ kind: 'add', matterId, input: { contactId: id, role: 'other' } }),
  ).toThrow();
});

it('treats a case-only rename as a change and blank details as cleared', () => {
  expect(
    contactChanges(contact, { displayName: 'maria alvarez', email: contact.email, phone: '' }),
  ).toEqual({ expectedRevision: 2, displayName: 'maria alvarez' });
  expect(
    contactChanges(
      { ...contact, phone: '+1 415 555 0100' },
      {
        displayName: contact.displayName,
        email: '   ',
        phone: ' \t ',
      },
    ),
  ).toEqual({ expectedRevision: 2, email: null, phone: null });
});
