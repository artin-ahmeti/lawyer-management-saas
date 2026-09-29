import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme';
import { cn } from './cn';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

export interface FieldProps extends PropsWithChildren {
  label?: string;
  optional?: boolean;
  help?: string;
  /** Replaces help, turns the control border red. Say what to do. */
  error?: string;
  className?: string;
}

const FieldContext = { error: false };
export { FieldContext };

/** Label above, control, help or error below. Wraps Input, Textarea, Select, Stepper. */
export function Field({ label, optional, help, error, className, children }: FieldProps) {
  return (
    <View className={cn('gap-1.5', className)}>
      {label ? (
        <View className="flex-row justify-between">
          <Text variant="label" tone="muted">
            {label}
          </Text>
          {optional ? (
            <Text variant="label" tone="faint">
              Optional
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
      {error || help ? (
        <Text variant="caption" tone={error ? 'danger' : 'muted'}>
          {error ?? help}
        </Text>
      ) : null}
    </View>
  );
}

export interface InputProps extends TextInputProps {
  icon?: IconName;
  prefix?: string;
  suffix?: string;
  /** Tonal, borderless search field. */
  search?: boolean;
  /** Right-aligned tabular digits for money. */
  amount?: boolean;
  error?: boolean;
  disabled?: boolean;
  /** Multi-line narrative. */
  multiline?: boolean;
  minHeight?: number;
  className?: string;
}

/** Text input, 48px tall. `search` for the tonal search field, `amount` with `prefix="$"` for money. */
export function Input({ icon, prefix, suffix, search, amount, error, disabled, multiline, minHeight, className, onFocus, onBlur, style, ...rest }: InputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      className={cn(
        'flex-row items-center gap-2.5 px-3.5',
        multiline ? 'items-start py-3' : 'h-12',
        search ? 'rounded-[10px] border border-transparent bg-surface-2' : 'rounded-md border border-border bg-surface',
        focused && 'border-accent',
        focused && search && 'bg-surface',
        error && 'border-danger-dot',
        disabled && 'bg-surface-2',
        className,
      )}
      style={multiline && minHeight ? { minHeight } : undefined}
    >
      {icon ? <Icon name={icon} tone="ink-3" /> : null}
      {prefix ? (
        <Text variant="body-strong" tone="muted">
          {prefix}
        </Text>
      ) : null}
      <TextInput
        editable={!disabled}
        multiline={multiline}
        placeholderTextColor={theme['ink-3']}
        selectionColor={theme.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        className={cn('flex-1 font-sans text-body text-ink', amount && 'text-right font-sans-semibold', disabled && 'text-ink-disabled')}
        style={[amount ? { fontVariant: ['tabular-nums'] } : null, multiline ? { textAlignVertical: 'top', lineHeight: 22 } : null, style]}
        {...rest}
      />
      {suffix ? (
        <Text variant="body" tone="muted" weight="medium">
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

export interface SelectProps {
  value?: string;
  placeholder?: string;
  /** Mono identifier after the value (matter number, account suffix). */
  mono?: string;
  /** Mono code before the value (UTBMS). */
  code?: string;
  icon?: IconName;
  dot?: 'accent' | 'success' | 'warning' | 'danger' | 'info';
  onPress?: () => void;
  className?: string;
}

const DOT_BG = { accent: 'bg-accent', success: 'bg-success-dot', warning: 'bg-warning-dot', danger: 'bg-danger-dot', info: 'bg-info-dot' } as const;

/** Select trigger styled like a text field with a chevron; opens a picker sheet. */
export function Select({ value, placeholder, mono, code, icon, dot, onPress, className }: SelectProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn('h-12 flex-row items-center gap-2.5 rounded-md border border-border bg-surface px-3.5 active:bg-surface-2', className)}
    >
      {icon ? <Icon name={icon} tone="ink-3" /> : null}
      {dot ? <View className={cn('h-2 w-2 rounded-full', DOT_BG[dot])} /> : null}
      {code ? (
        <Text variant="mono-id" tone="default">
          {code}
        </Text>
      ) : null}
      {value !== undefined ? (
        <Text className="flex-1" tone={code ? 'muted' : 'default'} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <Text className="flex-1" tone="faint" numberOfLines={1}>
          {placeholder}
        </Text>
      )}
      {mono ? <Text variant="mono-id" tone="muted">{mono}</Text> : null}
      <Icon name="chevron-down" size="sm" tone="ink-2" />
    </Pressable>
  );
}

export interface StepperProps {
  value: string;
  onDecrement?: () => void;
  onIncrement?: () => void;
  className?: string;
}

/** Duration stepper (h:mm in 0.1h steps) and other counted values. */
export function Stepper({ value, onDecrement, onIncrement, className }: StepperProps) {
  return (
    <View className={cn('h-12 flex-row items-stretch overflow-hidden rounded-md border border-border bg-surface', className)}>
      <Pressable accessibilityRole="button" accessibilityLabel="Less" onPress={onDecrement} className="w-11 items-center justify-center active:bg-surface-2">
        <Text variant="title-3">−</Text>
      </Pressable>
      <View className="min-w-[84px] items-center justify-center border-x border-hairline px-2">
        <Text variant="mono-id" className="text-[17px]" tabular>
          {value}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={onIncrement} className="w-11 items-center justify-center active:bg-surface-2">
        <Text variant="title-3">+</Text>
      </Pressable>
    </View>
  );
}

export interface AiSuggestionAction {
  label: string;
  quiet?: boolean;
  onPress?: () => void;
}

export interface AiSuggestionProps {
  label: string;
  text: string;
  actions?: AiSuggestionAction[];
  trailing?: ReactNode;
}

/** Opt-in AI suggestion under a field: grey, labelled, never auto-applied. */
export function AiSuggestion({ label, text, actions, trailing }: AiSuggestionProps) {
  return (
    <View className="flex-row gap-2.5 rounded-sm border border-hairline bg-surface-2 px-3 py-2.5">
      <Icon name="pen" size="sm" tone="ink-2" className="mt-0.5" />
      <View className="flex-1 gap-0.5">
        <Text variant="caption" weight="semibold">
          {label}
        </Text>
        <Text variant="label">{text}</Text>
        {actions?.length ? (
          <View className="mt-1.5 flex-row gap-3">
            {actions.map((a) => (
              <Pressable key={a.label} accessibilityRole="button" onPress={a.onPress} hitSlop={6}>
                <Text variant="caption" weight="semibold" tone={a.quiet ? 'muted' : 'accent'}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
