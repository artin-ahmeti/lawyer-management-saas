'use client';
import { MAX_PRACTICE_FIELDS, type PracticeFieldType } from '@lawfirm/core';
import { Button, Field, Input, Textarea } from '@lawfirm/ui-web';
import { draftFrom, fieldTypes, type DraftField } from './field-drafts';
import styles from './PracticeProfiles.module.css';

export function FieldDefinitionEditor({
  drafts,
  onChange,
  disabled,
}: {
  drafts: DraftField[];
  onChange: (drafts: DraftField[]) => void;
  disabled?: boolean;
}) {
  const update = (i: number, patch: Partial<DraftField>) =>
    onChange(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const move = (i: number, by: number) => {
    const next = [...drafts];
    [next[i], next[i + by]] = [next[i + by]!, next[i]!];
    onChange(next);
  };
  return (
    <div className="cl-stack cl-stack--md">
      {!drafts.length && <p className="cl-muted">No fields yet. Matters can still use it.</p>}
      {drafts.map((d, i) => {
        const id = `profile-field-${d.draftId}`;
        const name = d.label.trim() || `Field ${i + 1}`;
        return (
          <fieldset key={d.draftId} className={styles.definition} disabled={disabled}>
            <legend className="cl-t-body-strong">{name}</legend>
            <Field label={<span id={`${id}-label-l`}>Label</span>}>
              <Input
                aria-labelledby={`${id}-label-l`}
                value={d.label}
                maxLength={80}
                required
                onChange={(e) => update(i, { label: e.target.value })}
              />
            </Field>
            <Field
              label={<span id={`${id}-type-l`}>Type</span>}
              help={d.published ? `Key ${d.key}` : undefined}
            >
              <select
                aria-labelledby={`${id}-type-l`}
                className={`cl-input ${styles.select}`}
                value={d.type}
                onChange={(e) => update(i, { type: e.target.value as PracticeFieldType })}
              >
                {fieldTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={d.required}
                onChange={(e) => update(i, { required: e.target.checked })}
              />
              Required on new matters
            </label>
            <Field label={<span id={`${id}-help-l`}>Help text</span>} optional>
              <Input
                aria-labelledby={`${id}-help-l`}
                value={d.help}
                maxLength={200}
                onChange={(e) => update(i, { help: e.target.value })}
              />
            </Field>
            {d.type === 'choice' && (
              <Field
                className={styles.wide}
                label={<span id={`${id}-options-l`}>Options, one per line</span>}
              >
                <Textarea
                  aria-labelledby={`${id}-options-l`}
                  value={d.options}
                  onChange={(e) => update(i, { options: e.target.value })}
                />
              </Field>
            )}
            <div className={`${styles.actions} ${styles.wide}`}>
              <Button
                type="button"
                variant="secondary"
                disabled={i === 0}
                aria-label={`Move ${name} up`}
                onClick={() => move(i, -1)}
              >
                Move up
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={i === drafts.length - 1}
                aria-label={`Move ${name} down`}
                onClick={() => move(i, 1)}
              >
                Move down
              </Button>
              <Button
                type="button"
                variant="secondary"
                aria-label={`Remove ${name}`}
                onClick={() => onChange(drafts.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            </div>
          </fieldset>
        );
      })}
      <div>
        <Button
          type="button"
          disabled={disabled || drafts.length >= MAX_PRACTICE_FIELDS}
          onClick={() =>
            onChange([
              ...drafts,
              draftFrom({ key: 'field', label: '', type: 'text', required: false }, false),
            ])
          }
        >
          Add field
        </Button>
      </div>
    </div>
  );
}
