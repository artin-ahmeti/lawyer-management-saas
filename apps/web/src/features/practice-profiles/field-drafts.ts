import type { PracticeFieldDefinition, PracticeFieldType } from '@lawfirm/core';
import { keyFromLabel } from './live-profiles';

export const fieldTypes: { value: PracticeFieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'yes_no', label: 'Yes or no' },
  { value: 'choice', label: 'Choice from a list' },
];
/** Editor row: published keys stay fixed; a new field's key follows its label until saved. */
export type DraftField = {
  draftId: string;
  key: string;
  published: boolean;
  /** Published fields keep their type; a different type needs a new field. */
  typeLocked: boolean;
  label: string;
  type: PracticeFieldType;
  required: boolean;
  help: string;
  options: string;
};
export const draftFrom = (
  f: PracticeFieldDefinition,
  published: boolean,
  typeLocked = false,
): DraftField => ({
  draftId: crypto.randomUUID(),
  key: f.key,
  published,
  typeLocked,
  label: f.label,
  type: f.type,
  required: f.required,
  help: f.help ?? '',
  options: f.type === 'choice' ? f.options.join('\n') : '',
});
/** Field definitions as the shared contract expects; keys of new fields are made unique. */
export function definitionsFrom(
  drafts: DraftField[],
  reserved: readonly string[] = [],
): PracticeFieldDefinition[] {
  const used = new Set([...reserved, ...drafts.filter((d) => d.published).map((d) => d.key)]);
  return drafts.map((d) => {
    let key = d.key;
    if (!d.published) {
      const base = keyFromLabel(d.label).slice(0, 36);
      key = base;
      for (let n = 2; used.has(key); n++) key = `${base}_${n}`;
      used.add(key);
    }
    const base = {
      key,
      label: d.label.trim(),
      required: d.required,
      ...(d.help.trim() ? { help: d.help.trim() } : {}),
    };
    return d.type === 'choice'
      ? {
          ...base,
          type: 'choice' as const,
          options: d.options
            .split('\n')
            .map((o) => o.trim())
            .filter(Boolean),
        }
      : { ...base, type: d.type };
  });
}
