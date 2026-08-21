import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { cn } from './cn';

type Variant = 'solid' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const container: Record<Variant, string> = {
  solid: 'bg-primary active:bg-primary-pressed',
  outline: 'border border-line bg-transparent active:bg-surface',
  ghost: 'bg-transparent active:bg-surface',
  danger: 'bg-danger active:bg-rust',
};
const label: Record<Variant, string> = {
  solid: 'text-primary-fg',
  outline: 'text-ink',
  ghost: 'text-primary',
  danger: 'text-canvas',
};
const sizes: Record<Size, { box: string; text: string }> = {
  sm: { box: 'px-3 py-2 rounded-sm', text: 'text-caption font-semibold' },
  md: { box: 'px-5 py-3 rounded-md', text: 'text-body font-semibold' },
  lg: { box: 'px-6 py-4 rounded-md', text: 'text-body font-bold' },
};

interface ButtonProps extends PropsWithChildren {
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({
  children,
  onPress,
  variant = 'solid',
  size = 'md',
  loading,
  disabled,
  className,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-center gap-2',
        container[variant],
        sizes[size].box,
        (disabled || loading) && 'opacity-50',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'solid' ? '#1B2632' : '#FFB162'} />
      ) : (
        <Text className={cn(sizes[size].text, label[variant])}>{children}</Text>
      )}
    </Pressable>
  );
}
