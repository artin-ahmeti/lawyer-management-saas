import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { useTheme } from '@/theme';
import { cn } from './cn';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text, type TextTone } from './Text';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'tertiary'
  | 'ghost'
  | 'destructive'
  | 'destructive-solid';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BOX: Record<ButtonVariant, string> = {
  primary: 'bg-accent active:bg-accent-pressed',
  secondary: 'bg-surface-2 active:bg-hairline',
  outline: 'bg-surface border border-border active:bg-surface-2',
  tertiary: 'bg-transparent active:bg-accent-tint',
  ghost: 'bg-transparent active:bg-surface-2',
  destructive: 'bg-danger-bg active:bg-danger-bg/70',
  'destructive-solid': 'bg-danger-solid active:opacity-90',
};
const LABEL: Record<ButtonVariant, TextTone> = {
  primary: 'onAccent',
  secondary: 'default',
  outline: 'default',
  tertiary: 'accent',
  ghost: 'muted',
  destructive: 'danger',
  'destructive-solid': 'inverse',
};
const SIZE: Record<ButtonSize, { box: string; variant: 'label' | 'body-strong'; icon: 'sm' | 'md' }> = {
  sm: { box: 'h-9 px-3 rounded-sm gap-1.5', variant: 'label', icon: 'sm' },
  md: { box: 'h-11 px-4 rounded-md gap-2', variant: 'body-strong', icon: 'md' },
  lg: { box: 'h-[52px] px-5 rounded-[10px] gap-2', variant: 'body-strong', icon: 'md' },
};

export interface ButtonProps extends PropsWithChildren, Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  /** Square icon-only button; pass accessibilityLabel. */
  iconOnly?: boolean;
  block?: boolean;
  round?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * The button. Labels are verbs that name the outcome ("Send invoice",
 * "Bill 0.2h"); money in a label always shows cents. One primary per view.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  iconOnly,
  block,
  round,
  loading,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const s = SIZE[size];
  const tone = LABEL[variant];
  const iconColor = tone === 'onAccent' ? theme['on-accent'] : tone === 'inverse' ? theme['ink-inverse'] : tone === 'accent' ? theme.accent : tone === 'danger' ? theme['danger-ink'] : tone === 'muted' ? theme['ink-2'] : theme.ink;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      className={cn(
        'flex-row items-center justify-center',
        s.box,
        BOX[variant],
        iconOnly && (size === 'sm' ? 'w-9 px-0' : size === 'lg' ? 'w-[52px] px-0' : 'w-11 px-0'),
        block && 'w-full',
        round && 'rounded-full',
        (disabled || loading) && 'opacity-45',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={s.icon} color={iconColor} /> : null}
          {children !== undefined && children !== null ? (
            typeof children === 'string' || typeof children === 'number' ? (
              <Text variant={s.variant} tone={tone} weight="semibold" numberOfLines={1}>
                {children}
              </Text>
            ) : (
              <View>{children}</View>
            )
          ) : null}
          {iconRight ? <Icon name={iconRight} size={s.icon} color={iconColor} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** Equal-width button row for sheet and screen footers. */
export function ButtonRow({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <View className={cn('flex-row gap-2 [&>*]:flex-1', className)}>{children}</View>;
}

export interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: IconName;
  label: string;
  badge?: number | string;
  plain?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/** Round 40px icon button for header actions, with an optional count badge. */
export function IconButton({ icon, label, badge, plain, size = 'md', className, ...rest }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn(
        'items-center justify-center rounded-full active:bg-surface-2',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        !plain && 'border border-hairline bg-surface',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 'sm' : 'md'} />
      {badge !== undefined && badge !== '' ? (
        <View className="absolute -right-0.5 -top-0.5 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-bg bg-danger-solid px-1">
          <Text variant="caption" tone="inverse" weight="semibold" className="text-[11px] leading-[14px] text-danger-on">
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** The 56px round accent Capture action: the only raised, filled, round control. */
export function CaptureButton({ onPress, label = 'Capture', size = 56 }: { onPress?: () => void; label?: string; size?: number }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center justify-center rounded-full bg-accent shadow-lg active:bg-accent-pressed"
      style={{ width: size, height: size, shadowColor: theme.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
    >
      <Icon name="plus" size={size > 52 ? 26 : 24} color={theme['on-accent']} bold />
    </Pressable>
  );
}
