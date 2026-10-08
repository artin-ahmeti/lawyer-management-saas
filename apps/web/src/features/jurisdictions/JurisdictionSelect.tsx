'use client';
import { jurisdictionGroups } from './live-jurisdictions';
import styles from './Jurisdictions.module.css';

const groups = jurisdictionGroups();

/** The US catalog: federal, the states, DC and the territories. */
export function JurisdictionSelect({
  labelledBy,
  value,
  onChange,
  disabled,
  placeholder = 'Choose a jurisdiction',
}: {
  labelledBy: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <select
      aria-labelledby={labelledBy}
      className={`cl-input ${styles.select}`}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
