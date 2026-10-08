import { describe, expect, it } from 'vitest';
import {
  addMatterJurisdictionSchema,
  createForumSchema,
  forumListQuerySchema,
  jurisdictionCodeSchema,
  jurisdictionName,
  updateForumSchema,
  usJurisdictions,
} from './jurisdiction.js';

const forumId = '00000000-0000-4000-8000-000000000001';

describe('US jurisdiction catalog', () => {
  it('covers the 50 states, DC, the five inhabited territories and federal once each', () => {
    const codes = usJurisdictions.map((j) => j.code);
    expect(new Set(codes).size).toBe(codes.length);
    const count = (kind: string) => usJurisdictions.filter((j) => j.kind === kind).length;
    expect([count('state'), count('district'), count('territory'), count('federal')]).toEqual([
      50, 1, 5, 1,
    ]);
    expect(codes).toEqual(expect.arrayContaining(['CA', 'NY', 'TX', 'DC', 'US']));
    expect(usJurisdictions.filter((j) => j.kind === 'territory').map((j) => j.code)).toEqual([
      'AS',
      'GU',
      'MP',
      'PR',
      'VI',
    ]);
  });
  it('names each jurisdiction and refuses codes outside the catalog', () => {
    expect(jurisdictionName('DC')).toBe('District of Columbia');
    expect(jurisdictionName('US')).toBe('Federal (United States)');
    expect(jurisdictionName('MP')).toBe('Northern Mariana Islands');
    for (const code of ['XX', 'ca', 'UK', '', 'USA'])
      expect(jurisdictionCodeSchema.safeParse(code).success).toBe(false);
  });
});

describe('matter jurisdiction references', () => {
  it('accepts governing law alone, with no forum or docket', () => {
    expect(
      addMatterJurisdictionSchema.parse({ purpose: 'governing_law', jurisdiction: 'DE' }),
    ).toEqual({ purpose: 'governing_law', jurisdiction: 'DE' });
  });
  it('refuses a forum or docket on a governing-law reference', () => {
    for (const extra of [{ forumId }, { docketNumber: '1:24-cv-0001' }])
      expect(
        addMatterJurisdictionSchema.safeParse({
          purpose: 'governing_law',
          jurisdiction: 'NY',
          ...extra,
        }).success,
      ).toBe(false);
  });
  it('accepts a venue or agency reference with an optional forum and a trimmed docket', () => {
    expect(
      addMatterJurisdictionSchema.parse({
        purpose: 'venue',
        jurisdiction: 'US',
        forumId,
        docketNumber: '  3:24-cv-01234  ',
      }),
    ).toEqual({ purpose: 'venue', jurisdiction: 'US', forumId, docketNumber: '3:24-cv-01234' });
    expect(
      addMatterJurisdictionSchema.safeParse({ purpose: 'agency', jurisdiction: 'PR' }).success,
    ).toBe(true);
  });
  it('needs a label only for an other reference', () => {
    expect(
      addMatterJurisdictionSchema.safeParse({ purpose: 'other', jurisdiction: 'GU' }).success,
    ).toBe(false);
    expect(
      addMatterJurisdictionSchema.parse({
        purpose: 'other',
        jurisdiction: 'GU',
        label: ' Arbitration seat ',
      }).label,
    ).toBe('Arbitration seat');
    expect(
      addMatterJurisdictionSchema.safeParse({
        purpose: 'venue',
        jurisdiction: 'GU',
        label: 'Not for venues',
      }).success,
    ).toBe(false);
  });
  it('refuses unknown keys, oversized or unstorable dockets and blank labels', () => {
    for (const input of [
      { purpose: 'venue', jurisdiction: 'CA', court: 'Superior Court' },
      { purpose: 'venue', jurisdiction: 'CA', docketNumber: 'x'.repeat(101) },
      { purpose: 'venue', jurisdiction: 'CA', docketNumber: 'A\u0000B' },
      { purpose: 'venue', jurisdiction: 'CA', docketNumber: '   ' },
      { purpose: 'other', jurisdiction: 'CA', label: '   ' },
      { purpose: 'lex_fori', jurisdiction: 'CA' },
    ])
      expect(addMatterJurisdictionSchema.safeParse(input).success).toBe(false);
  });
});

describe('firm forums', () => {
  it('trims names and requires a kind and catalog jurisdiction', () => {
    expect(
      createForumSchema.parse({
        name: '  U.S. District Court, N.D. Cal.  ',
        kind: 'court',
        jurisdiction: 'US',
      }),
    ).toEqual({ name: 'U.S. District Court, N.D. Cal.', kind: 'court', jurisdiction: 'US' });
    for (const input of [
      { name: 'Board', kind: 'board', jurisdiction: 'CA' },
      { name: 'Board', kind: 'agency', jurisdiction: 'XX' },
      { name: '', kind: 'agency', jurisdiction: 'CA' },
      { name: 'x'.repeat(201), kind: 'agency', jurisdiction: 'CA' },
      { name: 'A\ud800', kind: 'agency', jurisdiction: 'CA' },
    ])
      expect(createForumSchema.safeParse(input).success).toBe(false);
  });
  it('changes only the name or archive state, with a reviewed revision', () => {
    expect(updateForumSchema.safeParse({ expectedRevision: 1 }).success).toBe(false);
    expect(updateForumSchema.safeParse({ expectedRevision: 1, archived: true }).success).toBe(true);
    for (const fixed of [{ kind: 'court' }, { jurisdiction: 'NY' }])
      expect(updateForumSchema.safeParse({ expectedRevision: 1, ...fixed }).success).toBe(false);
  });
  it('pages forums with a complete cursor and filters by jurisdiction', () => {
    expect(forumListQuerySchema.parse({})).toEqual({ status: 'active' });
    expect(forumListQuerySchema.safeParse({ afterName: 'Court' }).success).toBe(false);
    expect(forumListQuerySchema.safeParse({ jurisdiction: 'ZZ' }).success).toBe(false);
  });
});

describe('single-line text', () => {
  it('refuses control, bidi and zero-width characters that spoof names or reorder a line', () => {
    for (const bad of [
      'Superior\u200B Court',
      'Court \u202Etrohs',
      'Line\nbreak',
      'Bell\u0007',
      'Iso\u2066late',
      'Co\uFEFFurt',
    ])
      expect(
        createForumSchema.safeParse({ name: bad, kind: 'court', jurisdiction: 'CA' }).success,
      ).toBe(false);
    expect(
      addMatterJurisdictionSchema.safeParse({
        purpose: 'venue',
        jurisdiction: 'CA',
        docketNumber: 'SECRET-\u202E1',
      }).success,
    ).toBe(false);
    expect(
      addMatterJurisdictionSchema.safeParse({
        purpose: 'other',
        jurisdiction: 'CA',
        label: 'Seat\u200D',
      }).success,
    ).toBe(false);
    // A leading byte-order mark is whitespace to trim, so nothing invisible is stored.
    expect(
      createForumSchema.parse({ name: '\uFEFFCourt', kind: 'court', jurisdiction: 'CA' }).name,
    ).toBe('Court');
    expect(
      createForumSchema.safeParse({
        name: 'Tribunal de Distrito \u2696\uFE0F',
        kind: 'court',
        jurisdiction: 'PR',
      }).success,
    ).toBe(true);
  });
});
