import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from './cn';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text, type TextTone } from './Text';

export interface SectionHeaderProps {
  title: string;
  count?: number | string;
  action?: string;
  onAction?: () => void;
  className?: string;
}

/** Section title with an optional count and a right-aligned action. */
export function SectionHeader({ title, count, action, onAction, className }: SectionHeaderProps) {
  return (
    <View className={cn('mb-2.5 mt-6 flex-row items-baseline justify-between gap-3', className)}>
      <View className="flex-row items-baseline gap-1.5">
        <Text variant="title-3">{title}</Text>
        {count !== undefined ? (
          <Text variant="title-3" tone="faint" weight="medium" tabular>
            {count}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text variant="label" weight="semibold" tone="accent">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export type CardTone = 'default' | 'tint' | 'ink' | 'raised' | 'warning' | 'danger';
const CARD_BG: Record<CardTone, string> = {
  default: 'border border-hairline bg-surface',
  tint: 'bg-accent-tint',
  ink: 'bg-ink',
  raised: 'bg-surface-3 shadow-md',
  warning: 'bg-warning-bg',
  danger: 'bg-danger-bg',
};

export interface CardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  headerLead?: ReactNode;
  tone?: CardTone;
  flush?: boolean;
  footer?: ReactNode;
  onPress?: () => void;
  className?: string;
}

/**
 * A card marks the one thing that isn't a list item: the running timer,
 * Review your day, a deadline, a trust warning. Lists live in List.
 */
export function Card({ title, subtitle, headerAction, headerLead, tone = 'default', flush, footer, onPress, className, children }: CardProps) {
  const inkTone: TextTone = tone === 'ink' ? 'inverse' : 'default';
  const subTone: TextTone = tone === 'ink' ? 'inverse' : tone === 'tint' ? 'accent' : 'muted';
  const hasHead = title || subtitle || headerAction || headerLead;
  const body = (
    <>
      {hasHead ? (
        <View className={cn('flex-row items-center justify-between gap-3', flush && 'px-4 pb-2.5 pt-3.5')}>
          <View className="flex-1 flex-row items-center gap-3">
            {headerLead}
            <View className="flex-1">
              {title ? (
                <Text variant="title-3" tone={inkTone}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text variant="label" tone={subTone} className={tone === 'ink' ? 'opacity-70' : undefined}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
          {headerAction}
        </View>
      ) : null}
      {children}
      {footer ? <View className={cn('mt-3.5 flex-row flex-wrap gap-2', flush && 'mt-2 px-4 pb-3.5')}>{footer}</View> : null}
    </>
  );
  const cls = cn('overflow-hidden rounded-lg', !flush && 'p-4', CARD_BG[tone], className);
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} className={cn(cls, 'active:opacity-90')}>
        {body}
      </Pressable>
    );
  }
  return <View className={cls}>{body}</View>;
}

export interface KpiTileProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaTone?: 'neutral' | 'up' | 'down';
  deltaIcon?: IconName;
  /** 0–100. */
  progress?: number;
  /** Accent-tinted: reserved for the one number the screen exists to move. */
  tint?: boolean;
  onPress?: () => void;
  className?: string;
}

/** KPI tile: label, tabular value, one delta. At most two per phone screen. */
export function KpiTile({ label, value, unit, delta, deltaTone = 'neutral', deltaIcon, progress, tint, onPress, className }: KpiTileProps) {
  const deltaT: TextTone = deltaTone === 'up' ? 'success' : deltaTone === 'down' ? 'danger' : 'muted';
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className={cn('flex-1 gap-1 rounded-lg px-4 py-3.5', tint ? 'bg-accent-tint' : 'border border-hairline bg-surface', className)}
    >
      <Text variant="label" className={tint ? 'text-accent-ink' : 'text-ink-2'}>
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1">
        <Text variant="amount-lg" tabular numberOfLines={1}>
          {value}
        </Text>
        {unit ? (
          <Text variant="body" tone="muted" weight="medium">
            {unit}
          </Text>
        ) : null}
      </View>
      {delta ? (
        <View className="flex-row items-center gap-1">
          {deltaIcon ? <Icon name={deltaIcon} size={12} tone={deltaTone === 'up' ? 'success-ink' : deltaTone === 'down' ? 'danger-ink' : 'ink-2'} bold /> : null}
          <Text variant="caption" tone={deltaT} numberOfLines={1}>
            {delta}
          </Text>
        </View>
      ) : null}
      {progress !== undefined ? <ProgressBar value={progress} className={cn('mt-2', tint && 'bg-accent/20')} /> : null}
    </Wrapper>
  );
}

/** Two KPI tiles side by side. */
export function KpiRow({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <View className={cn('flex-row gap-3', className)}>{children}</View>;
}

/** 4px progress bar. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <View className={cn('h-1 overflow-hidden rounded-[2px] bg-surface-2', className)}>
      <View className="h-full rounded-[2px] bg-accent" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </View>
  );
}

/** 1px hairline. */
export function Divider({ className }: { className?: string }) {
  return <View className={cn('h-px bg-hairline', className)} />;
}

export interface KeyValueItem {
  label: string;
  value: ReactNode;
}

/** Label/value pairs in two columns. */
export function KeyValue({ items, className }: { items: KeyValueItem[]; className?: string }) {
  return (
    <View className={cn('gap-2', className)}>
      {items.map((it, i) => (
        <View key={i} className="flex-row gap-3">
          <Text variant="label" tone="muted" className="w-24 leading-[22px]">
            {it.label}
          </Text>
          <View className="flex-1">{typeof it.value === 'string' ? <Text>{it.value}</Text> : it.value}</View>
        </View>
      ))}
    </View>
  );
}
