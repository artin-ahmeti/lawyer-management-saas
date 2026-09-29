import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';
import type { IconName } from '../icons';

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  /** Shows an "Optional" tag beside the label. */
  optional?: boolean;
  /** Help text under the control. */
  help?: ReactNode;
  /** Error text: replaces help, turns the control border red. Say what to do. */
  error?: ReactNode;
  children?: ReactNode;
}

/** Label above, control, help or error below. Wrap `Input`, `Textarea`, `Select`, `Stepper`. */
export function Field({ label, optional, help, error, className, children, ...rest }: FieldProps) {
  return (
    <div className={cx('cl-field', error && 'is-error', className)} {...rest}>
      {label ? (
        <label className="cl-field__label">
          <span>{label}</span>
          {optional ? <span className="opt">Optional</span> : null}
        </label>
      ) : null}
      {children}
      {error || help ? <div className="cl-field__help">{error ?? help}</div> : null}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> {
  /** Leading icon in ink-tertiary. */
  icon?: IconName;
  /** Text before the value ("$"). */
  prefix?: ReactNode;
  /** Text after the value ("/ hr"). */
  suffix?: ReactNode;
  /** Tonal, borderless search field. */
  search?: boolean;
  /** Right-aligned tabular digits for money. */
  amount?: boolean;
  /** Paint the focus ring (for static mockups). */
  focused?: boolean;
  /** Extra classes for the outer box. */
  boxClassName?: string;
}

/** Text input, 48px on mobile and 40 on web. Use `search` for the tonal search field, `amount` with `prefix="$"` for money. */
export function Input({
  icon,
  prefix,
  suffix,
  search,
  amount,
  focused,
  disabled,
  boxClassName,
  className,
  ...rest
}: InputProps) {
  return (
    <div
      className={cx(
        'cl-input',
        search && 'cl-search',
        amount && 'cl-input--amount',
        focused && 'is-focus',
        disabled && 'is-disabled',
        boxClassName,
      )}
    >
      {icon ? <Icon name={icon} /> : null}
      {prefix ? <span className="cl-input__affix">{prefix}</span> : null}
      <input disabled={disabled} className={className} {...rest} />
      {suffix ? (
        <span className="cl-input__affix cl-muted" style={{ fontWeight: 500 }}>
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
}

/** Multi-line input for narratives and messages. */
export function Textarea({ minHeight, className, style, ...rest }: TextareaProps) {
  return (
    <div className="cl-input cl-input--textarea">
      <textarea
        className={className}
        style={minHeight ? { minHeight, ...style } : style}
        {...rest}
      />
    </div>
  );
}

export interface SelectProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** The displayed selection. */
  value?: ReactNode;
  placeholder?: string;
  /** Mono identifier shown after the value (matter number, account suffix). */
  mono?: string;
  /** Mono code shown before the value (UTBMS). */
  code?: string;
  icon?: IconName;
  /** Small status dot before the value (stage pickers). */
  dot?: 'accent' | 'success' | 'warning' | 'danger' | 'info';
}

/** Select trigger styled like a text field with a chevron; on mobile it opens a picker sheet. */
export function Select({
  value,
  placeholder,
  mono,
  code,
  icon,
  dot,
  className,
  type = 'button',
  ...rest
}: SelectProps) {
  return (
    <button type={type} className={cx('cl-input', 'cl-input--select', className)} {...rest}>
      {icon ? <Icon name={icon} /> : null}
      {dot ? <span className={`cl-dot cl-dot--${dot}`} /> : null}
      {code ? <span className="cl-mono cl-mono--ink">{code}</span> : null}
      {value !== undefined ? (
        <span
          className={cx('cl-truncate', code && 'cl-muted')}
          style={code ? { marginLeft: 6 } : undefined}
        >
          {value}
        </span>
      ) : (
        <span className="placeholder">{placeholder}</span>
      )}
      {mono ? (
        <span className="cl-mono" style={{ marginLeft: 8 }}>
          {mono}
        </span>
      ) : null}
    </button>
  );
}

export interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  /** Displayed value, e.g. "1:36". */
  value: string;
  onDecrement?: () => void;
  onIncrement?: () => void;
}

/** Duration stepper (h:mm in 0.1h steps) and other counted values. */
export function Stepper({ value, onDecrement, onIncrement, className, ...rest }: StepperProps) {
  return (
    <div className={cx('cl-stepper', className)} {...rest}>
      <button type="button" aria-label="Less" onClick={onDecrement}>
        −
      </button>
      <span className="cl-stepper__value">{value}</span>
      <button type="button" aria-label="More" onClick={onIncrement}>
        +
      </button>
    </div>
  );
}

export interface FormProps extends HTMLAttributes<HTMLFormElement> {
  children?: ReactNode;
}

/** Vertical form stack (16px gaps). Use `FormRow` for two fields side by side. */
export function Form({ className, children, onSubmit, ...rest }: FormProps) {
  return (
    <form
      className={cx('cl-form', className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(e);
      }}
      {...rest}
    >
      {children}
    </form>
  );
}

export interface FormRowProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Two fields side by side. */
export function FormRow({ className, children, ...rest }: FormRowProps) {
  return (
    <div className={cx('cl-form__row', className)} {...rest}>
      {children}
    </div>
  );
}

export interface AiSuggestionAction {
  label: string;
  /** Secondary styling (Dismiss, Edit). */
  quiet?: boolean;
  onClick?: () => void;
}

export interface AiSuggestionProps extends HTMLAttributes<HTMLDivElement> {
  /** e.g. "Suggested cleanup · not applied". */
  label: ReactNode;
  /** The proposed text. */
  text: ReactNode;
  actions?: AiSuggestionAction[];
}

/**
 * Opt-in AI suggestion under a field: grey, labelled, never auto-applied.
 * Nothing changes until the user taps an action. Carries the disclosure line
 * where a bar rule requires it.
 */
export function AiSuggestion({ label, text, actions, className, ...rest }: AiSuggestionProps) {
  return (
    <div className={cx('cl-ai', className)} {...rest}>
      <Icon name="pen" />
      <div className="cl-ai__body">
        <div className="cl-ai__label">{label}</div>
        <div className="cl-ai__text">{text}</div>
        {actions?.length ? (
          <div className="cl-ai__actions">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                className={cx(a.quiet && 'quiet')}
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
