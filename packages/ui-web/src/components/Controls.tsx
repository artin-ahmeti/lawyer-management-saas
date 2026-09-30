import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';
import type { IconName } from '../icons';

export interface SegmentedItem {
  value: string;
  label: ReactNode;
  count?: number | string;
}

export interface SegmentedControlProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: SegmentedItem[];
  value: string;
  onChange?: (value: string) => void;
  /** Stretch across the container (Billing tabs). */
  block?: boolean;
  /** Allow horizontal overflow (matter detail tabs). */
  scroll?: boolean;
}

/** Switches between views of the same object; filters that narrow a list use `Chip` instead. */
export function SegmentedControl({
  items,
  value,
  onChange,
  block,
  scroll,
  className,
  ...rest
}: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      className={cx('cl-seg', block && 'cl-seg--block', scroll && 'cl-seg--scroll', className)}
      {...rest}
    >
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          tabIndex={it.value === value ? 0 : -1}
          aria-selected={it.value === value}
          className={cx('cl-seg__item', it.value === value && 'is-active')}
          onClick={() => onChange?.(it.value)}
          onKeyDown={(event) => {
            const index = items.findIndex((item) => item.value === it.value);
            const next =
              event.key === 'ArrowRight'
                ? (index + 1) % items.length
                : event.key === 'ArrowLeft'
                  ? (index + items.length - 1) % items.length
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? items.length - 1
                      : -1;
            if (next < 0) return;
            event.preventDefault();
            onChange?.(items[next]!.value);
            (
              event.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined
            )?.focus();
          }}
        >
          {it.label}
          {it.count !== undefined ? <span className="cl-chip__count">{it.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number | string;
  icon?: IconName;
  /** Trailing affordance: a chevron for dropdown chips, a close for applied filters. */
  trailing?: 'chevron' | 'close';
  children?: ReactNode;
}

/** Filter chip. Selected chips are an ink fill; counts are tabular. */
export function Chip({
  active,
  count,
  icon,
  trailing,
  className,
  children,
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cx('cl-chip', active && 'is-active', className)}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
      {count !== undefined ? <span className="cl-chip__count">{count}</span> : null}
      {trailing === 'chevron' ? <Icon name="chevron-down" /> : null}
      {trailing === 'close' ? <Icon name="x" /> : null}
    </button>
  );
}

export interface ChipGroupProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Horizontal, scrollable row of chips. Keep the first chip "All" with the total. */
export function ChipGroup({ className, children, ...rest }: ChipGroupProps) {
  return (
    <div className={cx('cl-chips', className)} {...rest}>
      {children}
    </div>
  );
}

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  /** Accessible name when no visible label sits beside it. */
  label?: string;
}

/** 44×26 switch for settings rows. */
export function Switch({ checked, onChange, label, className, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cx('cl-switch', checked && 'is-on', className)}
      onClick={() => onChange?.(!checked)}
      {...rest}
    />
  );
}

export interface CheckboxProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  /** `round` (default) for tasks, `square` for forms and table selection. */
  shape?: 'round' | 'square';
  label?: string;
}

/** 22px check: round for tasks (a done task reads as a filled dot), square for forms. */
export function Checkbox({
  checked,
  onChange,
  shape = 'round',
  label,
  className,
  ...rest
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={cx(
        'cl-check',
        shape === 'square' && 'cl-check--square',
        checked && 'is-on',
        className,
      )}
      onClick={() => onChange?.(!checked)}
      {...rest}
    >
      <Icon name="check" />
    </button>
  );
}

export interface RadioProps extends HTMLAttributes<HTMLSpanElement> {
  checked: boolean;
}

/** 22px radio for single choice (account, billing model). */
export function Radio({ checked, className, ...rest }: RadioProps) {
  return (
    <span
      role="radio"
      aria-checked={checked}
      className={cx('cl-radio', checked && 'is-on', className)}
      {...rest}
    />
  );
}

export interface OptionRowProps extends HTMLAttributes<HTMLLabelElement> {
  label: ReactNode;
  /** Caption under the label. */
  hint?: ReactNode;
  /** The control on the right (Switch) or left (Radio/Checkbox). */
  control: ReactNode;
  controlPosition?: 'start' | 'end';
}

/** A 44px settings row: label, optional hint, and a control. */
export function OptionRow({
  label,
  hint,
  control,
  controlPosition = 'end',
  className,
  ...rest
}: OptionRowProps) {
  return (
    <label className={cx('cl-option', className)} {...rest}>
      {controlPosition === 'start' ? control : null}
      <span>
        {label}
        {hint ? (
          <span className="cl-t-caption cl-muted" style={{ display: 'block' }}>
            {hint}
          </span>
        ) : null}
      </span>
      {controlPosition === 'end' ? control : null}
    </label>
  );
}
