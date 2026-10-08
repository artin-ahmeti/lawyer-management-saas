import { describe, expect, it } from 'vitest';
import {
  addMatterJurisdictionSchema,
  createForumSchema,
  forumListQuerySchema,
  forumResultSchema,
  matterJurisdictionListSchema,
  matterJurisdictionSchema,
  updateForumSchema,
} from './jurisdiction.js';

/** Boundaries the database checks also hold: lengths after trimming and storable text. */
const id = '00000000-0000-4000-8000-0000000000aa';
const unstorable = ['A\u0000B', 'A\ud800', '\udc00A', 'A\udbff\udbffB', '\ud800'];
const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success;

describe('forum names', () => {
  const forum = (name: string) => ({ name, kind: 'court', jurisdiction: 'NY' });
  it('accepts exactly 200 characters once surrounding space is trimmed', () => {
    expect(createForumSchema.parse(forum(`  ${'n'.repeat(200)}  `)).name).toHaveLength(200);
    expect(ok(createForumSchema, forum('n'.repeat(201)))).toBe(false);
  });
  it('refuses blank names and every unstorable character on create and rename', () => {
    for (const name of ['   ', '\t\n', ...unstorable]) {
      expect(ok(createForumSchema, forum(name))).toBe(false);
      expect(ok(updateForumSchema, { expectedRevision: 1, name })).toBe(false);
    }
  });
  it('keeps complete surrogate pairs', () => {
    expect(createForumSchema.parse(forum('Court 🏛')).name).toBe('Court 🏛');
  });
});

describe('forum updates', () => {
  it('bounds the expected revision to a positive database integer', () => {
    for (const expectedRevision of [1, 2_147_483_646])
      expect(ok(updateForumSchema, { expectedRevision, archived: false })).toBe(true);
    for (const expectedRevision of [0, -1, 1.5, 2_147_483_647, '1', null])
      expect(ok(updateForumSchema, { expectedRevision, archived: false })).toBe(false);
  });
  it('refuses unknown keys and a missing revision', () => {
    expect(ok(updateForumSchema, { name: 'Court' })).toBe(false);
    expect(ok(updateForumSchema, { expectedRevision: 1, archived: true, deleted: true })).toBe(
      false,
    );
  });
});

describe('forum list queries', () => {
  it('accepts a complete cursor in any identifier case', () => {
    expect(
      forumListQuerySchema.parse({ afterName: 'Bb Court', afterId: id.toUpperCase() }),
    ).toMatchObject({ status: 'active', afterName: 'Bb Court' });
  });
  it('bounds and cleans the cursor name', () => {
    expect(ok(forumListQuerySchema, { afterName: 'n'.repeat(200), afterId: id })).toBe(true);
    for (const afterName of ['', 'n'.repeat(201), ...unstorable])
      expect(ok(forumListQuerySchema, { afterName, afterId: id })).toBe(false);
  });
  it('refuses repeated or unknown parameters', () => {
    expect(ok(forumListQuerySchema, { jurisdiction: ['CA', 'NY'] })).toBe(false);
    expect(ok(forumListQuerySchema, { status: 'all' })).toBe(false);
    expect(ok(forumListQuerySchema, { firmId: id })).toBe(false);
    expect(ok(forumListQuerySchema, { afterId: id })).toBe(false);
  });
});

describe('matter references', () => {
  it('holds docket and label lengths after trimming', () => {
    expect(
      addMatterJurisdictionSchema.parse({
        purpose: 'venue',
        jurisdiction: 'CA',
        docketNumber: ` ${'d'.repeat(100)} `,
      }).docketNumber,
    ).toHaveLength(100);
    expect(
      addMatterJurisdictionSchema.parse({
        purpose: 'other',
        jurisdiction: 'CA',
        label: ` ${'l'.repeat(80)} `,
      }).label,
    ).toHaveLength(80);
    expect(
      ok(addMatterJurisdictionSchema, {
        purpose: 'other',
        jurisdiction: 'CA',
        label: 'l'.repeat(81),
      }),
    ).toBe(false);
  });
  it('refuses unstorable labels', () => {
    for (const label of unstorable)
      expect(ok(addMatterJurisdictionSchema, { purpose: 'other', jurisdiction: 'CA', label })).toBe(
        false,
      );
  });
  it('lets an other reference name a forum and docket, but never governing law a label', () => {
    expect(
      ok(addMatterJurisdictionSchema, {
        purpose: 'other',
        jurisdiction: 'NY',
        forumId: id,
        docketNumber: 'ARB-1',
        label: 'Arbitration seat',
      }),
    ).toBe(true);
    expect(
      ok(addMatterJurisdictionSchema, {
        purpose: 'governing_law',
        jurisdiction: 'NY',
        label: 'Contract law',
      }),
    ).toBe(false);
    expect(
      ok(addMatterJurisdictionSchema, { purpose: 'agency', jurisdiction: 'NY', forumId: 'nope' }),
    ).toBe(false);
  });
  it('never reports automation and caps a list at fifty', () => {
    const now = new Date().toISOString();
    const reference = {
      id,
      firmId: id,
      matterId: id,
      purpose: 'governing_law',
      jurisdiction: 'DE',
      forum: null,
      docketNumber: null,
      label: null,
      automation: 'none',
      createdAt: now,
      endedAt: null,
    };
    expect(ok(matterJurisdictionSchema, reference)).toBe(true);
    expect(ok(matterJurisdictionSchema, { ...reference, automation: 'deadlines' })).toBe(false);
    const list = (n: number) => ({
      matterId: id,
      items: Array.from({ length: n }, () => reference),
      canManage: false,
    });
    expect(ok(matterJurisdictionListSchema, list(50))).toBe(true);
    expect(ok(matterJurisdictionListSchema, list(51))).toBe(false);
  });
  it('refuses a forum result that leaks unknown fields', () => {
    const now = new Date().toISOString();
    const forum = {
      id,
      firmId: id,
      name: 'Court',
      kind: 'court',
      jurisdiction: 'NY',
      archived: false,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    expect(ok(forumResultSchema, { forum, commandId: id })).toBe(true);
    expect(ok(forumResultSchema, { forum: { ...forum, createdBy: id }, commandId: id })).toBe(
      false,
    );
  });
});
