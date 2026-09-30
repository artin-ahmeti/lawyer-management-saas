'use client';

import { Icon, Select, type SelectProps } from '@lawfirm/ui-web';
import type { SelectHTMLAttributes } from 'react';

export interface NativeSelectOption {
  value: string;
  label: string;
}

export interface NativeSelectProps
  extends
    Omit<
      SelectHTMLAttributes<HTMLSelectElement>,
      'onChange' | 'value' | 'multiple' | 'size' | 'children'
    >,
    Pick<SelectProps, 'icon' | 'mono' | 'code' | 'dot' | 'placeholder'> {
  options: NativeSelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Displayed text; defaults to the selected option's label. */
  display?: SelectProps['value'];
  label: string;
  appearance?: 'field' | 'chip';
}

/**
 * The design-system Select trigger with a real, transparent <select> on top so
 * keyboard, screen readers and the native picker all work without a custom menu.
 */
export function NativeSelect({
  options,
  value,
  onChange,
  display,
  label,
  appearance = 'field',
  style,
  className,
  icon,
  mono,
  code,
  dot,
  placeholder,
  ...rest
}: NativeSelectProps) {
  const current = options.find((o) => o.value === value);
  return (
    <div
      className={['app-native-select', className].filter(Boolean).join(' ')}
      style={{ position: 'relative', minWidth: 0, ...style }}
    >
      {appearance === 'chip' ? (
        <span className="cl-chip" aria-hidden="true">
          {display ?? current?.label}
          <Icon name="chevron-down" size="sm" />
        </span>
      ) : (
        <Select
          value={display ?? current?.label ?? ''}
          tabIndex={-1}
          aria-hidden
          disabled={rest.disabled}
          style={{ width: '100%' }}
          icon={icon}
          mono={mono}
          code={code}
          dot={dot}
          placeholder={placeholder}
        />
      )}
      <select
        {...rest}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
