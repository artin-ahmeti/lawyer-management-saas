'use client';
import type { PracticeFieldDefinition } from '@lawfirm/core';
import { Field, Input, Textarea } from '@lawfirm/ui-web';
import type { FieldForm } from './live-profiles';
import styles from './PracticeProfiles.module.css';

/** One labelled control per field of a pinned version; every control has a visible label. */
export function FieldValueInputs({
  fields,
  form,
  onChange,
  idPrefix,
  disabled,
  issues = {},
}: {
  fields: readonly PracticeFieldDefinition[];
  form: FieldForm;
  onChange: (form: FieldForm) => void;
  idPrefix: string;
  disabled?: boolean;
  issues?: Record<string, string>;
}) {
  if (!fields.length) return <p className="cl-muted">This profile has no fields.</p>;
  return (
    <div className={styles.inputs}>
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`,
          value = form[field.key] ?? '',
          issue = issues[field.key];
        const set = (next: string) => onChange({ ...form, [field.key]: next });
        const common = {
          id,
          disabled,
          'aria-labelledby': `${id}-label`,
          'aria-invalid': issue ? true : undefined,
          'aria-describedby': issue || field.help ? `${id}-help` : undefined,
        };
        const options =
          field.type === 'yes_no'
            ? [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]
            : field.type === 'choice'
              ? field.options.map((o) => ({ value: o, label: o }))
              : null;
        return (
          <Field
            key={field.key}
            className={field.type === 'long_text' ? styles.wide : undefined}
            label={<span id={`${id}-label`}>{field.label}</span>}
            optional={!field.required}
            error={issue && <span id={`${id}-help`}>{issue}</span>}
            help={field.help && <span id={`${id}-help`}>{field.help}</span>}
          >
            {options ? (
              <select
                {...common}
                className={`cl-input ${styles.select}`}
                value={value}
                required={field.required}
                onChange={(e) => set(e.target.value)}
              >
                <option value="">Not set</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'long_text' ? (
              <Textarea
                {...common}
                value={value}
                maxLength={5000}
                required={field.required}
                onChange={(e) => set(e.target.value)}
              />
            ) : (
              <Input
                {...common}
                type={field.type === 'date' ? 'date' : 'text'}
                inputMode={field.type === 'number' ? 'decimal' : undefined}
                value={value}
                maxLength={field.type === 'text' ? 500 : undefined}
                required={field.required}
                onChange={(e) => set(e.target.value)}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}

/** Read-only display of a stored value. */
export function displayValue(field: PracticeFieldDefinition, value: unknown) {
  if (value === undefined) return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (field.type === 'date' && typeof value === 'string') {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString();
  }
  return String(value);
}
