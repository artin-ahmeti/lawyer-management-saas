import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { cn } from './cn';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

export interface SegmentedItem {
  value: string;
  label: string;
  count?: number | string;
}

export interface SegmentedControlProps {
  items: SegmentedItem[];
  value: string;
  onChange?: (value: string) => void;
  /** Allow horizontal overflow (matter detail tabs). */
  scroll?: boolean;
  className?: string;
}

/** Switches between views of the same object; filters use Chip instead. */
export function SegmentedControl({
  items,
  value,
  onChange,
  scroll,
  className,
}: SegmentedControlProps) {
  const inner = (
    <View
      className={cn(
        'flex-row gap-0.5 rounded-md bg-surface-2 p-[3px]',
        !scroll && 'w-full',
        className,
      )}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Pressable
            key={it.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange?.(it.value)}
            className={cn(
              'h-8 flex-row items-center justify-center gap-1.5 rounded-[6px] px-3',
              !scroll && 'flex-1',
              active && 'bg-surface shadow-sm',
            )}
          >
            <Text
              variant="label"
              weight="semibold"
              tone={active ? 'default' : 'muted'}
              numberOfLines={1}
            >
              {it.label}
            </Text>
            {it.count !== undefined ? (
              <Text variant="label" tone="faint" tabular>
                {it.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
  return scroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {inner}
    </ScrollView>
  ) : (
    inner
  );
}

export interface ChipProps {
  active?: boolean;
  count?: number | string;
  icon?: IconName;
  trailing?: 'chevron' | 'close';
  onPress?: () => void;
  children: string;
}

/** Filter chip. Selected chips are an ink fill; counts are tabular. */
export function Chip({ active, count, icon, trailing, onPress, children }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      className={cn(
        'h-8 flex-row items-center gap-1.5 rounded-full border px-3',
        active ? 'border-ink bg-ink' : 'border-border bg-surface active:bg-surface-2',
      )}
    >
      {icon ? <Icon name={icon} size="xs" tone={active ? 'ink-inverse' : 'ink'} /> : null}
      <Text variant="label" weight="medium" tone={active ? 'inverse' : 'default'}>
        {children}
      </Text>
      {count !== undefined ? (
        <Text
          variant="label"
          tone={active ? 'inverse' : 'faint'}
          tabular
          className={active ? 'opacity-70' : undefined}
        >
          {count}
        </Text>
      ) : null}
      {trailing === 'chevron' ? (
        <Icon name="chevron-down" size="xs" tone={active ? 'ink-inverse' : 'ink'} />
      ) : null}
      {trailing === 'close' ? (
        <Icon name="x" size="xs" tone={active ? 'ink-inverse' : 'ink'} />
      ) : null}
    </Pressable>
  );
}

/** Horizontal, scrollable row of chips. Keep the first chip "All" with the total. */
export function ChipGroup({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName={cn('flex-row gap-2 py-0.5', className)}
    >
      {children}
    </ScrollView>
  );
}

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
}

/** 44×26 switch for settings rows. */
export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange?.(!checked)}
      className={cn(
        'h-[26px] w-11 justify-center rounded-full px-[3px]',
        checked ? 'bg-accent' : 'bg-border',
      )}
    >
      <View className={cn('h-5 w-5 rounded-full bg-white shadow-sm', checked && 'self-end')} />
    </Pressable>
  );
}

export interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  /** round (default) for tasks, square for forms. */
  shape?: 'round' | 'square';
  label?: string;
}

/** 22px check: round for tasks, square for forms. */
export function Checkbox({ checked, onChange, shape = 'round', label }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange?.(!checked)}
      hitSlop={8}
      className={cn(
        'h-[22px] w-[22px] items-center justify-center border-[1.5px]',
        shape === 'square' ? 'rounded-[6px]' : 'rounded-full',
        checked ? 'border-accent bg-accent' : 'border-border-strong bg-transparent',
      )}
    >
      {checked ? <Icon name="check" size={14} tone="on-accent" bold /> : null}
    </Pressable>
  );
}

/** 22px radio for single choice. */
export function Radio({ checked }: { checked: boolean }) {
  return (
    <View
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      className={cn(
        'h-[22px] w-[22px] rounded-full',
        checked ? 'border-[7px] border-accent' : 'border-[1.5px] border-border-strong',
      )}
    />
  );
}

export interface OptionRowProps {
  label: string;
  hint?: string;
  control: ReactNode;
  controlPosition?: 'start' | 'end';
  onPress?: () => void;
}

/** A 44px settings row: label, optional hint, and a control. */
export function OptionRow({
  label,
  hint,
  control,
  controlPosition = 'end',
  onPress,
}: OptionRowProps) {
  return (
    <Pressable onPress={onPress} className="min-h-[44px] flex-row items-center gap-3 py-3">
      {controlPosition === 'start' ? control : null}
      <View className="flex-1">
        <Text>{label}</Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      {controlPosition === 'end' ? control : null}
    </Pressable>
  );
}
