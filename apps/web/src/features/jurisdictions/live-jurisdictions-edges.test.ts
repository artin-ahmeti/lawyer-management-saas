import { randomUUID } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import type { ForumRecord, MatterJurisdictionRecord } from '@lawfirm/core';
import {
  emptyReferenceForm,
  forumChanges,
  loadForumList,
  prepareForumCommand,
  prepareReferenceCommand,
  referenceInput,
  submitForumCommand,
  submitReferenceCommand,
} from './live-jurisdictions';

const firmId = randomUUID(),
  matterId = randomUUID(),
  forumId = randomUUID();
const now = new Date().toISOString();
const forum: ForumRecord = {
  id: forumId,
  firmId,
  name: 'Workers Compensation Appeals Board',
  kind: 'agency',
  jurisdiction: 'CA',
  archived: false,
  revision: 2,
  createdAt: now,
  updatedAt: now,
};
const reference: MatterJurisdictionRecord = {
  id: randomUUID(),
  firmId,
  matterId,
  purpose: 'agency',
  jurisdiction: 'CA',
  forum: { id: forumId, name: forum.name, kind: 'agency', archived: false },
  docketNumber: 'ADJ-1',
  label: null,
  automation: 'none',
  createdAt: now,
  endedAt: null,
};

it('treats a case-only rename as a change and padding alone as none', () => {
  expect(forumChanges(forum, { name: `  ${forum.name}  `, archived: false })).toBeNull();
  expect(forumChanges(forum, { name: forum.name.toUpperCase(), archived: false })).toEqual({
    expectedRevision: 2,
    name: forum.name.toUpperCase(),
  });
  // A blank or unstorable name is refused before any request is built.
  for (const name of ['   ', 'Board\u0000', 'Board \ud800'])
    expect(() => forumChanges(forum, { name, archived: false })).toThrow();
});

it('drops a forum and docket the governing-law purpose never takes', () => {
  const form = {
    ...emptyReferenceForm,
    purpose: 'governing_law' as const,
    jurisdiction: 'DE',
    forumId,
    docketNumber: 'X-1',
    label: 'Ignored',
  };
  expect(referenceInput(form)).toEqual({ purpose: 'governing_law', jurisdiction: 'DE' });
  expect(referenceInput({ ...form, purpose: 'agency', docketNumber: '   ' })).toEqual({
    purpose: 'agency',
    jurisdiction: 'DE',
    forumId,
  });
  expect(referenceInput({ ...form, purpose: 'venue', docketNumber: 'X\u0000' })).toBeNull();
  expect(referenceInput({ ...form, purpose: 'venue', jurisdiction: 'ZZ' })).toBeNull();
});

it('retries one forum intent with the same keys and refuses a foreign or different forum', async () => {
  const intent = prepareForumCommand({
    kind: 'update',
    forumId,
    input: { expectedRevision: 2, archived: true },
  });
  const updateForum = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('network'))
    .mockResolvedValue({
      forum: { ...forum, archived: true, revision: 3 },
      commandId: randomUUID(),
    });
  const client = { updateForum, createForum: vi.fn() };
  await expect(submitForumCommand(client, intent, firmId)).rejects.toThrow('network');
  expect((await submitForumCommand(client, intent, firmId)).forum.revision).toBe(3);
  const [first, second] = updateForum.mock.calls;
  expect(second![0]).toBe(forumId);
  expect(second![2].idempotencyKey).toBe(first![2].idempotencyKey);
  expect(second![2].requestId).toBe(first![2].requestId);
  expect(client.createForum).not.toHaveBeenCalled();

  updateForum.mockResolvedValue({ forum: { ...forum, id: randomUUID() }, commandId: randomUUID() });
  await expect(submitForumCommand(client, intent, firmId)).rejects.toThrow(
    'Unexpected forum record',
  );
  updateForum.mockResolvedValue({
    forum: { ...forum, firmId: randomUUID() },
    commandId: randomUUID(),
  });
  await expect(submitForumCommand(client, intent, firmId)).rejects.toThrow(
    'Unexpected forum workspace',
  );
});

it('refuses an ending answered for another firm or matter', async () => {
  const intent = prepareReferenceCommand({
    kind: 'end',
    matterId,
    input: { referenceId: reference.id },
  });
  const endMatterJurisdiction = vi.fn().mockResolvedValue({
    reference: { ...reference, endedAt: now },
    commandId: randomUUID(),
  });
  const client = { endMatterJurisdiction, addMatterJurisdiction: vi.fn() };
  expect((await submitReferenceCommand(client, intent, firmId)).reference.endedAt).toBe(now);
  expect(endMatterJurisdiction.mock.calls[0]![1]).toEqual({ referenceId: reference.id });
  endMatterJurisdiction.mockResolvedValue({
    reference: { ...reference, firmId: randomUUID() },
    commandId: randomUUID(),
  });
  await expect(submitReferenceCommand(client, intent, firmId)).rejects.toThrow(
    'Unexpected matter jurisdiction',
  );
  expect(() =>
    prepareReferenceCommand({ kind: 'end', matterId, input: { referenceId: 'not-a-uuid' } }),
  ).toThrow();
});

it('refuses a forum page that does not match the list contract', async () => {
  const forums = vi.fn().mockResolvedValue({
    items: Array.from({ length: 21 }, () => forum),
    nextCursor: null,
    canCreate: true,
    canManage: false,
  });
  await expect(loadForumList({ forums }, firmId, {})).rejects.toThrow();
  forums.mockResolvedValue({
    items: [forum],
    nextCursor: { afterName: forum.name, afterId: forum.id },
    canCreate: true,
    canManage: false,
  });
  const page = await loadForumList({ forums }, firmId, { jurisdiction: 'CA' });
  expect(page.nextCursor).toEqual({ afterName: forum.name, afterId: forum.id });
  expect(forums).toHaveBeenLastCalledWith({ jurisdiction: 'CA' }, undefined);
});
