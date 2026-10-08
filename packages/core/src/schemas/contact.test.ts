import { expect, it } from 'vitest';
import {
  addMatterPartySchema,
  contactListQuerySchema,
  createContactSchema,
  updateContactSchema,
} from './contact.js';

const id = '00000000-0000-4000-a000-000000000001';
it('bounds contact intent and rejects authority fields and malformed details', () => {
  expect(
    createContactSchema.parse({
      kind: 'person',
      displayName: '  Maria Alvarez ',
      email: ' maria@example.test ',
      phone: ' +1 (415) 555-0100 ext. 12 ',
    }),
  ).toEqual({
    kind: 'person',
    displayName: 'Maria Alvarez',
    email: 'maria@example.test',
    phone: '+1 (415) 555-0100 ext. 12',
  });
  for (const bad of [
    { kind: 'person', displayName: ' ' },
    { kind: 'client', displayName: 'x' },
    { kind: 'person', displayName: 'x', email: 'a@b.test\nBcc: c@d.test' },
    { kind: 'person', displayName: 'x', phone: 'call me' },
    { kind: 'person', displayName: 'x', phone: '+1 555 0100; drop' },
    { kind: 'person', displayName: 'x', firmId: id },
  ])
    expect(createContactSchema.safeParse(bad).success).toBe(false);
});
it('requires a reviewed revision and at least one change, and fixes the kind', () => {
  expect(updateContactSchema.parse({ expectedRevision: 2, email: null })).toEqual({
    expectedRevision: 2,
    email: null,
  });
  for (const bad of [
    { expectedRevision: 2 },
    { expectedRevision: 0, displayName: 'x' },
    { expectedRevision: 2, kind: 'organization' },
    { expectedRevision: 2, displayName: null },
  ])
    expect(updateContactSchema.safeParse(bad).success).toBe(false);
});
it('pairs directory cursors and requires a label for other parties', () => {
  expect(contactListQuerySchema.safeParse({ afterId: id }).success).toBe(false);
  expect(contactListQuerySchema.safeParse({ afterName: 'a', afterId: id }).success).toBe(true);
  expect(contactListQuerySchema.safeParse({ q: ' ' }).success).toBe(false);
  expect(addMatterPartySchema.safeParse({ contactId: id, role: 'other' }).success).toBe(false);
  expect(
    addMatterPartySchema.parse({ contactId: id, role: 'other', label: ' Lender ' }).label,
  ).toBe('Lender');
  expect(addMatterPartySchema.safeParse({ contactId: id, role: 'judge' }).success).toBe(false);
});
