import { View } from 'react-native';
import { cn } from './cn';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text, type TextTone } from './Text';
import type { ColorToken } from '@lawfirm/ui';

export type PillTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'ink' | 'outline';

const BG: Record<PillTone, string> = {
  neutral: 'bg-surface-2',
  accent: 'bg-accent-tint',
  success: 'bg-success-bg',
  warning: 'bg-warning-bg',
  danger: 'bg-danger-bg',
  info: 'bg-info-bg',
  ink: 'bg-ink',
  outline: 'bg-transparent border border-border',
};
const INK: Record<PillTone, TextTone> = {
  neutral: 'muted',
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'default',
  ink: 'inverse',
  outline: 'muted',
};
const INK_TOKEN: Record<PillTone, ColorToken> = {
  neutral: 'ink-2',
  accent: 'accent-ink',
  success: 'success-ink',
  warning: 'warning-ink',
  danger: 'danger-ink',
  info: 'info-ink',
  ink: 'ink-inverse',
  outline: 'ink-2',
};
const DOT: Record<PillTone, string> = {
  neutral: 'bg-ink-3',
  accent: 'bg-accent',
  success: 'bg-success-dot',
  warning: 'bg-warning-dot',
  danger: 'bg-danger-dot',
  info: 'bg-info-dot',
  ink: 'bg-ink-inverse',
  outline: 'bg-ink-3',
};

export interface PillProps {
  /** accent = open/in progress · success = paid/done · warning = due ≤7d · danger = overdue/at risk · info = court/system · outline = attributes. */
  tone?: PillTone;
  /** Add when the pill is the only status marker in a row. */
  dot?: boolean;
  icon?: IconName;
  size?: 'md' | 'lg';
  children: string;
  className?: string;
}

/** 24px status pill, sentence case, tinted. Describes state, never acts. */
export function Pill({ tone = 'neutral', dot, icon, size = 'md', children, className }: PillProps) {
  const textTone = tone === 'accent' ? undefined : INK[tone];
  return (
    <View
      className={cn(
        'flex-row items-center self-start rounded-full',
        size === 'lg' ? 'h-7 gap-1.5 px-2.5' : 'h-6 gap-1.5 px-2',
        BG[tone],
        className,
      )}
    >
      {dot ? <View className={cn('h-1.5 w-1.5 rounded-full', DOT[tone])} /> : null}
      {icon ? <Icon name={icon} size="xs" tone={INK_TOKEN[tone]} /> : null}
      <Text
        variant={size === 'lg' ? 'label' : 'caption'}
        weight="semibold"
        tone={textTone}
        className={tone === 'accent' ? 'text-accent-ink' : tone === 'info' ? 'text-info-ink' : undefined}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

export function Dot({ tone = 'neutral', className }: { tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'; className?: string }) {
  return <View className={cn('h-2 w-2 rounded-full', DOT[tone], className)} />;
}
