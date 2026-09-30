import type { PropsWithChildren, ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { cn } from './cn';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text, type TextTone } from './Text';

export type BannerTone =
  'neutral' | 'warning' | 'danger' | 'success' | 'info' | 'accent' | 'outline';
const BANNER_BG: Record<BannerTone, string> = {
  neutral: 'bg-surface-2',
  warning: 'bg-warning-bg',
  danger: 'bg-danger-bg',
  success: 'bg-success-bg',
  info: 'bg-info-bg',
  accent: 'bg-accent-tint',
  outline: 'border border-hairline bg-surface',
};
const BANNER_INK: Record<BannerTone, TextTone> = {
  neutral: 'default',
  warning: 'warning',
  danger: 'danger',
  success: 'success',
  info: 'default',
  accent: 'accent',
  outline: 'default',
};

export interface BannerProps {
  tone?: BannerTone;
  icon?: IconName;
  title: string;
  text?: string;
  actions?: ReactNode;
  compact?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  trailing?: ReactNode;
  className?: string;
}

/** Inline, contextual message at the top of the content it concerns. */
export function Banner({
  tone = 'neutral',
  icon,
  title,
  text,
  actions,
  compact,
  dismissible,
  onDismiss,
  trailing,
  className,
}: BannerProps) {
  const iconTone =
    tone === 'warning'
      ? 'warning-ink'
      : tone === 'danger'
        ? 'danger-ink'
        : tone === 'success'
          ? 'success-ink'
          : tone === 'info'
            ? 'info-ink'
            : tone === 'accent'
              ? 'accent-ink'
              : 'ink-2';
  return (
    <View
      className={cn(
        'flex-row gap-3',
        compact ? 'items-center rounded-sm px-3 py-2' : 'items-start rounded-[10px] px-3.5 py-3',
        BANNER_BG[tone],
        className,
      )}
    >
      {icon ? (
        <Icon name={icon} tone={iconTone} className={compact ? undefined : 'mt-0.5'} />
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text
          variant={compact ? 'label' : 'body-strong'}
          weight="semibold"
          tone={BANNER_INK[tone]}
          className={tone === 'info' ? 'text-info-ink' : undefined}
        >
          {title}
        </Text>
        {text ? (
          <Text variant="label" tone="muted">
            {text}
          </Text>
        ) : null}
        {actions ? <View className="mt-2 flex-row flex-wrap gap-1.5">{actions}</View> : null}
      </View>
      {trailing}
      {dismissible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDismiss}
          hitSlop={8}
        >
          <Icon name="x" size="sm" tone="ink-3" />
        </Pressable>
      ) : null}
    </View>
  );
}

export interface ToastProps {
  message: string;
  tone?: 'success' | 'danger';
  action?: string;
  onAction?: () => void;
}

/** One-line confirmation on the inverse surface with an optional Undo. */
export function Toast({ message, tone = 'success', action, onAction }: ToastProps) {
  return (
    <View className="flex-row items-center gap-2.5 self-start rounded-[10px] bg-surface-inverse px-3.5 py-2.5 shadow-lg">
      <Icon
        name={tone === 'danger' ? 'alert' : 'check'}
        size="sm"
        tone={tone === 'danger' ? 'danger-dot' : 'success-dot'}
        bold
      />
      <Text variant="label" weight="medium" tone="inverse" className="shrink">
        {message}
      </Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={6}>
          <Text variant="label" weight="semibold" tone="inverse" className="underline">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export interface DialogProps extends PropsWithChildren {
  visible: boolean;
  title: string;
  text?: string;
  actions?: ReactNode;
  onRequestClose?: () => void;
}

/** Confirmation dialog: the consequence in the body, the verb on the button. */
export function Dialog({ visible, title, text, actions, onRequestClose, children }: DialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onRequestClose}>
      <Pressable
        className="flex-1 items-center justify-center bg-black/45 p-6"
        onPress={onRequestClose}
      >
        <Pressable
          className="w-full max-w-[360px] gap-2.5 rounded-lg bg-surface-3 p-5 shadow-lg"
          onPress={() => undefined}
        >
          <Text variant="title-3">{title}</Text>
          {text ? <Text tone="muted">{text}</Text> : null}
          {children}
          {actions ? <View className="mt-2.5 flex-row justify-end gap-2">{actions}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  text?: string;
  action?: ReactNode;
  large?: boolean;
}

/** Icon in a tonal circle, a title, one sentence, at most one action. */
export function EmptyState({ icon, title, text, action, large }: EmptyStateProps) {
  return (
    <View className="items-center gap-1.5 px-6 py-10">
      {icon ? (
        <View className="mb-2 h-[52px] w-[52px] items-center justify-center rounded-full bg-surface-2">
          <Icon name={icon} size="lg" tone="ink-2" />
        </View>
      ) : null}
      <Text variant={large ? 'title-2' : 'title-3'} className="text-center">
        {title}
      </Text>
      {text ? (
        <Text tone="muted" className="max-w-[30ch] text-center">
          {text}
        </Text>
      ) : null}
      {action ? <View className="mt-3">{action}</View> : null}
    </View>
  );
}

/** Shimmer-free placeholder block (static tone, respects reduced motion by design). */
export function Skeleton({
  width = '100%',
  height = 12,
  circle,
  className,
}: {
  width?: number | string;
  height?: number;
  circle?: boolean;
  className?: string;
}) {
  return (
    <View
      className={cn('bg-surface-2', circle ? 'rounded-full' : 'rounded-[6px]', className)}
      style={{ width: width as number, height }}
    />
  );
}

/** Skeleton shaped like a list row. */
export function SkeletonRow() {
  return (
    <View className="min-h-[60px] flex-row items-center gap-3 px-4 py-2.5">
      <Skeleton width={36} height={36} circle />
      <View className="flex-1 gap-2">
        <Skeleton width="70%" />
        <Skeleton width="45%" height={10} />
      </View>
      <Skeleton width={56} />
    </View>
  );
}
