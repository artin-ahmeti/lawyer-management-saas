import { describe, expect, it } from 'vitest';
import {
  applyFieldValues,
  createPracticeProfileSchema,
  practiceFieldListSchema,
  practiceStarterKeySchema,
  revisePracticeProfileSchema,
  updateMatterFieldsSchema,
  type PracticeFieldDefinition,
} from './practice-profile.js';
import { practiceStarters } from './practice-profile-starters.js';

const fields: PracticeFieldDefinition[] = [
  { key: 'entity_name', label: 'Entity name', type: 'text', required: true },
  { key: 'summary', label: 'Summary', type: 'long_text', required: false },
  { key: 'deal_size', label: 'Share count', type: 'number', required: false },
  { key: 'target_close', label: 'Target close', type: 'date', required: false },
  { key: 'board_approved', label: 'Board approved', type: 'yes_no', required: false },
  {
    key: 'structure',
    label: 'Structure',
    type: 'choice',
    required: false,
    options: ['Asset purchase', 'Share purchase'],
  },
];

describe('practice field definitions', () => {
  it('accepts every field type and trims labels', () => {
    const parsed = practiceFieldListSchema.parse([
      { key: 'entity_name', label: '  Entity name ', type: 'text', required: true },
      ...fields.slice(1),
    ]);
    expect(parsed[0]).toEqual({
      key: 'entity_name',
      label: 'Entity name',
      type: 'text',
      required: true,
    });
    expect(parsed).toHaveLength(6);
  });

  it('refuses duplicate keys, bad keys, unknown types, empty or duplicate options and over 50 fields', () => {
    const text = (key: string) => ({ key, label: key, type: 'text', required: false });
    for (const bad of [
      [text('a'), text('a')],
      [text('Bad key')],
      [text('1st')],
      [text('x'.repeat(41))],
      [{ ...text('a'), type: 'money' }],
      [{ ...text('a'), type: 'choice', options: [] }],
      [{ ...text('a'), type: 'choice', options: ['Yes', 'yes'] }],
      [{ ...text('a'), options: ['Unused'] }],
      [{ ...text('a'), required: undefined }],
      Array.from({ length: 51 }, (_, i) => text(`f${i}`)),
    ])
      expect(practiceFieldListSchema.safeParse(bad).success).toBe(false);
  });

  it('bounds profile intent and rejects authority fields', () => {
    expect(createPracticeProfileSchema.parse({ name: ' Estate planning ', fields: [] })).toEqual({
      name: 'Estate planning',
      fields: [],
    });
    for (const bad of [
      { name: ' ', fields: [] },
      { name: 'x'.repeat(81), fields: [] },
      { name: 'x', fields: [], firmId: '00000000-0000-4000-a000-000000000001' },
      { name: 'x', fields: [], basedOn: { key: 'tax_court', version: 1 } },
      { name: 'x' },
    ])
      expect(createPracticeProfileSchema.safeParse(bad).success).toBe(false);
    expect(revisePracticeProfileSchema.safeParse({ expectedRevision: 1 }).success).toBe(false);
    expect(
      revisePracticeProfileSchema.safeParse({ expectedRevision: 1, archived: true }).success,
    ).toBe(true);
    expect(
      revisePracticeProfileSchema.safeParse({ expectedRevision: 1, description: null }).success,
    ).toBe(true);
  });

  it('refuses unstorable characters in names, labels, options and help', () => {
    const text = { key: 'a', label: 'A', type: 'text', required: false };
    for (const bad of [
      { name: 'De\u0000als', fields: [] },
      { name: 'Deals', description: 'x\ud800', fields: [] },
      { name: 'Deals', fields: [{ ...text, label: 'A\u0000' }] },
      { name: 'Deals', fields: [{ ...text, help: '\udc00' }] },
      { name: 'Deals', fields: [{ ...text, type: 'choice', options: ['Yes\u0000'] }] },
    ])
      expect(createPracticeProfileSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts only primitive values keyed by field keys in a matter edit', () => {
    expect(
      updateMatterFieldsSchema.safeParse({ expectedRevision: 1, values: { a: { nested: 1 } } })
        .success,
    ).toBe(false);
    expect(
      updateMatterFieldsSchema.safeParse({ expectedRevision: 1, values: { 'Bad key': 'x' } })
        .success,
    ).toBe(false);
    expect(
      updateMatterFieldsSchema.safeParse({ expectedRevision: 1, values: { a: null, b: true } })
        .success,
    ).toBe(true);
  });
});

describe('applyFieldValues', () => {
  it('validates each field type and reports changed keys', () => {
    const result = applyFieldValues(
      fields,
      {},
      {
        entity_name: '  Northwind Holdings ',
        summary: 'Acquisition of a regional distributor.',
        deal_size: 1250.5,
        target_close: '2026-12-15',
        board_approved: false,
        structure: 'Share purchase',
      },
    );
    expect(result).toEqual({
      ok: true,
      values: {
        entity_name: 'Northwind Holdings',
        summary: 'Acquisition of a regional distributor.',
        deal_size: 1250.5,
        target_close: '2026-12-15',
        board_approved: false,
        structure: 'Share purchase',
      },
      changed: [
        'board_approved',
        'deal_size',
        'entity_name',
        'structure',
        'summary',
        'target_close',
      ],
    });
  });

  it('refuses unknown keys, wrong types, invalid dates and options outside the list', () => {
    const result = applyFieldValues(
      fields,
      { entity_name: 'Northwind' },
      {
        court: 'Superior Court',
        deal_size: '1250',
        target_close: '2026-02-30',
        board_approved: 'yes',
        structure: 'Merger',
        summary: ' ',
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((i) => i.key).sort()).toEqual([
      'board_approved',
      'court',
      'deal_size',
      'structure',
      'summary',
      'target_close',
    ]);
    expect(result.issues.find((i) => i.key === 'target_close')?.message).toBe(
      'Target close needs a date (YYYY-MM-DD).',
    );
  });

  it('requires required fields and lets null clear only optional ones', () => {
    const missing = applyFieldValues(fields, {}, { summary: 'No entity yet' });
    expect(missing).toEqual({
      ok: false,
      issues: [{ key: 'entity_name', message: 'Entity name is required.' }],
    });
    const cleared = applyFieldValues(fields, { entity_name: 'A', summary: 'B' }, { summary: null });
    expect(cleared).toEqual({ ok: true, values: { entity_name: 'A' }, changed: ['summary'] });
    expect(applyFieldValues(fields, { entity_name: 'A' }, { entity_name: null }).ok).toBe(false);
  });

  it('reports no change when a patch repeats current values', () => {
    expect(applyFieldValues(fields, { entity_name: 'A' }, { entity_name: 'A' })).toEqual({
      ok: true,
      values: { entity_name: 'A' },
      changed: [],
    });
  });

  it('refuses a value set larger than the stored byte budget, counted in UTF-8', () => {
    const many: PracticeFieldDefinition[] = Array.from({ length: 30 }, (_, i) => ({
      key: `notes_${i}`,
      label: `Notes ${i}`,
      type: 'long_text',
      required: false,
    }));
    // 30 × 5000 three-byte characters passes each field's limit but not the total budget.
    const wide = Object.fromEntries(many.map((f) => [f.key, '漢'.repeat(5000)]));
    expect(applyFieldValues(many, {}, wide)).toEqual({
      ok: false,
      issues: [{ key: '*', message: 'These values are too long to save together.' }],
    });
    const fits = Object.fromEntries(many.slice(0, 10).map((f) => [f.key, '漢'.repeat(5000)]));
    expect(applyFieldValues(many, {}, fits).ok).toBe(true);
  });

  it('refuses text the database cannot store: NUL and lone surrogates', () => {
    for (const bad of ['a\u0000b', 'a\ud800', '\udc00z'])
      expect(applyFieldValues(fields, {}, { entity_name: bad }).ok).toBe(false);
    expect(applyFieldValues(fields, {}, { entity_name: 'Café 漢 😀' }).ok).toBe(true);
  });

  it('enforces required fields whose keys match inherited object properties', () => {
    const inherited: PracticeFieldDefinition[] = [
      { key: 'constructor', label: 'Constructor', type: 'text', required: true },
    ];
    expect(applyFieldValues(inherited, {}, {})).toEqual({
      ok: false,
      issues: [{ key: 'constructor', message: 'Constructor is required.' }],
    });
    expect(applyFieldValues(inherited, {}, { constructor: 'Set' })).toMatchObject({
      ok: true,
      changed: ['constructor'],
    });
  });

  it('rejects non-finite and out-of-range numbers', () => {
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, 1e13])
      expect(applyFieldValues(fields, { entity_name: 'A' }, { deal_size: n }).ok).toBe(false);
  });
});

describe('operational starter catalog', () => {
  it('covers every starter key with a valid, fully optional field set', () => {
    expect(Object.keys(practiceStarters).sort()).toEqual(
      [...practiceStarterKeySchema.options].sort(),
    );
    for (const starter of Object.values(practiceStarters)) {
      expect(starter.version).toBeGreaterThanOrEqual(1);
      expect(practiceFieldListSchema.parse(starter.fields)).toEqual(starter.fields);
      expect(starter.fields.length).toBeGreaterThan(0);
      expect(starter.fields.every((f) => !f.required)).toBe(true);
      expect(
        createPracticeProfileSchema.safeParse({
          name: starter.name,
          description: starter.description,
          fields: starter.fields,
        }).success,
      ).toBe(true);
    }
  });

  it('keeps court, docket and hearing fields out of transactional, advisory and agency starters', () => {
    const litigationOnly = /court|docket|hearing|judge|case.?number/i;
    for (const key of [
      'corporate_transactional',
      'real_estate',
      'intellectual_property',
      'immigration',
    ] as const)
      for (const field of practiceStarters[key].fields)
        expect(`${field.key} ${field.label}`).not.toMatch(litigationOnly);
  });
});
