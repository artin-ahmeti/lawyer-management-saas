import { randomUUID } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import type { ForumRecord, MatterJurisdictionRecord } from '@lawfirm/core';
import {
  emptyReferenceForm,
  forumChanges,
  jurisdictionGroups,
  loadForumList,
  loadMatterJurisdictions,
  prepareForumCommand,
  prepareReferenceCommand,
  purposeLabel,
  referenceDetails,
  referenceInput,
  submitReferenceCommand,
} from './live-jurisdictions';

const firmId = randomUUID(),
  matterId = randomUUID(),
  forumId = randomUUID();
const now = new Date().toISOString();
const forum: ForumRecord = {
  id: forumId,
  firmId,
  name: 'U.S. District Court, S.D.N.Y.',
  kind: 'court',
  jurisdiction: 'US',
  archived: false,
  revision: 3,
  createdAt: now,
  updatedAt: now,
};
const reference: MatterJurisdictionRecord = {
  id: randomUUID(),
  firmId,
  matterId,
  purpose: 'venue',
  jurisdiction: 'US',
  forum: { id: forumId, name: forum.name, kind: 'court', archived: true },
  docketNumber: '1:26-cv-04410',
  label: null,
  automation: 'none',
  createdAt: now,
  endedAt: null,
};

it('groups the catalog for the jurisdiction picker', () => {
  const groups = jurisdictionGroups();
  expect(groups.map((g) => [g.label, g.options.length])).toEqual([
    ['Federal', 1],
    ['States', 50],
    ['District of Columbia', 1],
    ['Territories', 5],
  ]);
  expect(groups[0]!.options[0]).toEqual({ value: 'US', label: 'Federal (United States)' });
});

it('builds only the inputs each purpose accepts', () => {
  const form = {
    ...emptyReferenceForm,
    jurisdiction: 'NY',
    forumId,
    docketNumber: ' 2026-0001 ',
    label: 'Seat',
  };
  expect(referenceInput({ ...form, purpose: 'governing_law' })).toEqual({
    purpose: 'governing_law',
    jurisdiction: 'NY',
  });
  expect(referenceInput({ ...form, purpose: 'venue' })).toEqual({
    purpose: 'venue',
    jurisdiction: 'NY',
    forumId,
    docketNumber: '2026-0001',
  });
  expect(referenceInput({ ...form, purpose: 'other', forumId: '', docketNumber: '' })).toEqual({
    purpose: 'other',
    jurisdiction: 'NY',
    label: 'Seat',
  });
  expect(referenceInput({ ...form, purpose: 'other', label: '  ' })).toBeNull();
  expect(referenceInput({ ...emptyReferenceForm, purpose: 'agency' })).toBeNull();
});

it('describes a reference without implying automation', () => {
  expect(purposeLabel('governing_law')).toBe('Governing law');
  expect(referenceDetails(reference)).toEqual([
    'Federal (United States)',
    'U.S. District Court, S.D.N.Y. (archived)',
    'No. 1:26-cv-04410',
  ]);
  expect(
    referenceDetails({
      ...reference,
      purpose: 'other',
      label: 'Arbitration seat',
      forum: null,
      docketNumber: null,
    }),
  ).toEqual(['Federal (United States)']);
});

it('sends only changed forum details against the loaded revision', () => {
  expect(forumChanges(forum, { name: forum.name, archived: false })).toBeNull();
  expect(forumChanges(forum, { name: ' S.D.N.Y. ', archived: false })).toEqual({
    expectedRevision: 3,
    name: 'S.D.N.Y.',
  });
  expect(forumChanges(forum, { name: forum.name, archived: true })).toEqual({
    expectedRevision: 3,
    archived: true,
  });
  const created = prepareForumCommand({
    kind: 'create',
    input: { name: 'Board', kind: 'agency', jurisdiction: 'CA' },
  });
  expect(created.idempotencyKey).not.toBe(created.requestId);
  expect(() =>
    prepareForumCommand({
      kind: 'create',
      input: { name: '', kind: 'agency', jurisdiction: 'CA' },
    }),
  ).toThrow();
});

it('refuses lists from another workspace or matter', async () => {
  const forums = vi.fn().mockResolvedValue({
    items: [{ ...forum, firmId: randomUUID() }],
    nextCursor: null,
    canCreate: true,
    canManage: true,
  });
  await expect(loadForumList({ forums }, firmId, {})).rejects.toThrow('Unexpected forum');
  const matterJurisdictions = vi.fn().mockResolvedValue({
    matterId,
    items: [{ ...reference, matterId: randomUUID() }],
    canManage: true,
  });
  await expect(loadMatterJurisdictions({ matterJurisdictions }, firmId, matterId)).rejects.toThrow(
    'Unexpected matter jurisdiction',
  );
  matterJurisdictions.mockResolvedValue({ matterId, items: [reference], canManage: false });
  expect((await loadMatterJurisdictions({ matterJurisdictions }, firmId, matterId)).items).toEqual([
    reference,
  ]);
});

it('retries one reference intent with the same keys', async () => {
  const intent = prepareReferenceCommand({
    kind: 'add',
    matterId,
    input: { purpose: 'governing_law', jurisdiction: 'DE' },
  });
  const addMatterJurisdiction = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('network'))
    .mockResolvedValue({
      reference: { ...reference, purpose: 'governing_law' },
      commandId: randomUUID(),
    });
  const client = { addMatterJurisdiction, endMatterJurisdiction: vi.fn() };
  await expect(submitReferenceCommand(client, intent, firmId)).rejects.toThrow('network');
  await submitReferenceCommand(client, intent, firmId);
  const [first, second] = addMatterJurisdiction.mock.calls;
  expect(second![2].idempotencyKey).toBe(first![2].idempotencyKey);
  expect(second![2].requestId).toBe(first![2].requestId);
  addMatterJurisdiction.mockResolvedValue({
    reference: { ...reference, matterId: randomUUID() },
    commandId: randomUUID(),
  });
  await expect(submitReferenceCommand(client, intent, firmId)).rejects.toThrow(
    'Unexpected matter jurisdiction',
  );
});

it('compares identifiers as uuids, whatever their case in the route', async () => {
  const matterJurisdictions = vi
    .fn()
    .mockResolvedValue({ matterId, items: [reference], canManage: true });
  expect(
    (await loadMatterJurisdictions({ matterJurisdictions }, firmId, matterId.toUpperCase())).items,
  ).toEqual([reference]);
});

it('accepts an ending only for the reference it ended', async () => {
  const intent = prepareReferenceCommand({
    kind: 'end',
    matterId,
    input: { referenceId: reference.id },
  });
  const endMatterJurisdiction = vi.fn().mockResolvedValue({
    reference: { ...reference, id: randomUUID(), endedAt: now },
    commandId: randomUUID(),
  });
  const client = { addMatterJurisdiction: vi.fn(), endMatterJurisdiction };
  await expect(submitReferenceCommand(client, intent, firmId)).rejects.toThrow(
    'Unexpected matter jurisdiction',
  );
  endMatterJurisdiction.mockResolvedValue({ reference, commandId: randomUUID() });
  await expect(submitReferenceCommand(client, intent, firmId)).rejects.toThrow(
    'Unexpected matter jurisdiction',
  );
  endMatterJurisdiction.mockResolvedValue({
    reference: { ...reference, endedAt: now },
    commandId: randomUUID(),
  });
  expect((await submitReferenceCommand(client, intent, firmId)).reference.endedAt).toBe(now);
});
