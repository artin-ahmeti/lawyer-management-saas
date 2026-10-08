import { randomUUID } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import type { PracticeFieldDefinition, PracticeProfileRecord } from '@lawfirm/core';
import {
  fieldForm,
  fieldPatch,
  keyFromLabel,
  loadMatterFields,
  loadProfileList,
  prepareMatterFieldsCommand,
  prepareProfileCommand,
  profileChanges,
  submitMatterFieldsCommand,
} from './live-profiles';
import { definitionsFrom, draftFrom } from './field-drafts';

const firmId = randomUUID(),
  matterId = randomUUID();
const fields: PracticeFieldDefinition[] = [
  { key: 'entity_name', label: 'Entity', type: 'text', required: true },
  { key: 'share_count', label: 'Share count', type: 'number', required: false },
  { key: 'target_close', label: 'Target completion', type: 'date', required: false },
  { key: 'board_approved', label: 'Board approved', type: 'yes_no', required: false },
  {
    key: 'structure',
    label: 'Structure',
    type: 'choice',
    required: false,
    options: ['Asset purchase', 'Share purchase'],
  },
];
const now = new Date().toISOString();
const profile: PracticeProfileRecord = {
  id: randomUUID(),
  firmId,
  name: 'Deals',
  description: null,
  basedOn: null,
  archived: false,
  revision: 2,
  createdAt: now,
  updatedAt: now,
  currentVersion: { id: randomUUID(), version: 1, fields, createdAt: now },
};

it('turns typed form input into a patch and clears only values that were set', () => {
  const current = { entity_name: 'Northwind', share_count: 10, board_approved: true };
  const form = fieldForm(fields, current);
  expect(form).toEqual({
    entity_name: 'Northwind',
    share_count: '10',
    target_close: '',
    board_approved: 'yes',
    structure: '',
  });
  expect(
    fieldPatch(fields, current, {
      ...form,
      share_count: '1250.5',
      board_approved: '',
      structure: 'Share purchase',
    }),
  ).toEqual({ share_count: 1250.5, board_approved: null, structure: 'Share purchase' });
  // Unparseable numbers stay as text so the shared rules name the field.
  expect(fieldPatch(fields, {}, { ...fieldForm(fields, {}), share_count: '12 shares' })).toEqual({
    share_count: '12 shares',
  });
  expect(fieldPatch(fields, current, form)).toEqual({});
});

it('derives stable field keys from labels', () => {
  expect(keyFromLabel('Target completion date')).toBe('target_completion_date');
  expect(keyFromLabel('  1st hearing / venue ')).toBe('f_1st_hearing_venue');
  expect(keyFromLabel('***')).toBe('field');
  expect(keyFromLabel('x'.repeat(60))).toHaveLength(40);
});

it('sends only changed profile details against the loaded revision', () => {
  expect(
    profileChanges(profile, { name: 'Deals', description: '', fields, archived: false }),
  ).toBeNull();
  expect(
    profileChanges(profile, {
      name: ' M&A ',
      description: 'Buy-side work',
      fields,
      archived: false,
    }),
  ).toEqual({ expectedRevision: 2, name: 'M&A', description: 'Buy-side work' });
  expect(
    profileChanges(profile, {
      name: 'Deals',
      description: '',
      fields: fields.slice(1),
      archived: true,
    }),
  ).toEqual({ expectedRevision: 2, fields: fields.slice(1), archived: true });
});

it('keeps one intent per command and binds results to the workspace and matter', async () => {
  const create = prepareProfileCommand({ kind: 'create', input: { name: 'Deals', fields } });
  expect(create.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  expect(() =>
    prepareProfileCommand({ kind: 'create', input: { name: ' ', fields } as never }),
  ).toThrow();
  const intent = prepareMatterFieldsCommand(matterId, {
    expectedRevision: 1,
    values: { entity_name: 'Northwind' },
  });
  const result = {
    fields: {
      matterId,
      revision: 2,
      profile: { id: profile.id, name: 'Deals', archived: false, version: profile.currentVersion },
      values: { entity_name: 'Northwind' },
      canEdit: true,
    },
    commandId: randomUUID(),
  };
  const updateMatterFields = vi.fn().mockResolvedValue(result);
  await expect(submitMatterFieldsCommand({ updateMatterFields }, intent)).resolves.toEqual(result);
  expect(updateMatterFields).toHaveBeenCalledWith(matterId, intent.input, {
    idempotencyKey: intent.idempotencyKey,
    requestId: intent.requestId,
    signal: undefined,
  });
  const foreign = vi.fn().mockResolvedValue({
    ...result,
    fields: { ...result.fields, matterId: randomUUID() },
  });
  await expect(submitMatterFieldsCommand({ updateMatterFields: foreign }, intent)).rejects.toThrow(
    'Unexpected matter record',
  );
  await expect(
    loadMatterFields(
      { matterFields: vi.fn().mockResolvedValue({ ...result.fields, matterId: randomUUID() }) },
      matterId,
    ),
  ).rejects.toThrow('Unexpected matter record');
  await expect(
    loadProfileList(
      {
        practiceProfiles: vi.fn().mockResolvedValue({
          items: [
            {
              ...profile,
              firmId: randomUUID(),
              currentVersion: 1,
              fieldCount: 5,
            },
          ],
          nextCursor: null,
          canManage: false,
        }),
      },
      firmId,
      {},
    ),
  ).rejects.toThrow('Unexpected practice profile workspace');
});

it('keeps published keys, gives new fields unique keys from labels without reusing published ones, and splits options', () => {
  const drafts = [
    draftFrom(fields[0]!, true),
    {
      ...draftFrom({ key: 'x', label: '', type: 'text', required: false }, false),
      label: 'Entity name',
    },
    {
      ...draftFrom({ key: 'x', label: '', type: 'text', required: false }, false),
      label: 'Entity name',
    },
    {
      ...draftFrom({ key: 'x', label: '', type: 'text', required: false }, false),
      label: ' Stage ',
      type: 'choice' as const,
      options: ' Intake \n\n Closing ',
      help: '  ',
    },
  ];
  expect(definitionsFrom(drafts)).toEqual([
    fields[0],
    { key: 'entity_name_2', label: 'Entity name', type: 'text', required: false },
    { key: 'entity_name_3', label: 'Entity name', type: 'text', required: false },
    {
      key: 'stage',
      label: 'Stage',
      type: 'choice',
      required: false,
      options: ['Intake', 'Closing'],
    },
  ]);
  expect(definitionsFrom([draftFrom(fields[4]!, true)])).toEqual([fields[4]]);
});

it('reads only own values, so a field keyed like an object member starts empty', () => {
  const inherited: PracticeFieldDefinition[] = [
    { key: 'constructor', label: 'Constructor', type: 'text', required: false },
  ];
  expect(fieldForm(inherited, {})).toEqual({ constructor: '' });
  expect(fieldPatch(inherited, {}, { constructor: 'Set' })).toEqual({ constructor: 'Set' });
  expect(fieldPatch(inherited, {}, { constructor: '' })).toEqual({});
});
