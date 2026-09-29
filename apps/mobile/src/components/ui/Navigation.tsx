import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from './cn';
import { Icon } from './Icon';
import { Text } from './Text';

export interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  /** Extra bottom padding for content under a docked footer. */
  bottomInset?: number;
  className?: string;
  contentClassName?: string;
}

/** Canvas + safe area. Every screen root uses this; 20px gutters. */
export function Screen({ children, scroll, bottomInset = 24, className, contentClassName }: ScreenProps) {
  return (
    <SafeAreaView className={cn('flex-1 bg-bg', className)} edges={['top']}>
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={cn('px-5', contentClassName)}
          contentContainerStyle={{ paddingBottom: bottomInset }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View className={cn('flex-1 px-5', contentClassName)}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
  className?: string;
}

/** Large-title header for root tabs (title-1) with an eyebrow and round icon actions. */
export function ScreenHeader({ eyebrow, title, actions, className }: ScreenHeaderProps) {
  return (
    <View className={cn('flex-row items-end justify-between gap-3 pb-1 pt-1.5', className)}>
      <View className="flex-1">
        {eyebrow ? (
          <Text variant="label" tone="muted" className="mb-0.5">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="title-1" numberOfLines={2}>
          {title}
        </Text>
      </View>
      {actions ? <View className="flex-row items-center gap-2 pb-0.5">{actions}</View> : null}
    </View>
  );
}

export interface NavBarProps {
  back?: string;
  onBack?: () => void;
  title?: string;
  mono?: boolean;
  actions?: ReactNode;
}

/** Compact nav bar for detail screens: back label, mono identifier, plain icon actions. */
export function NavBar({ back, onBack, title, mono, actions }: NavBarProps) {
  return (
    <View className="-mx-2 h-11 flex-row items-center justify-between px-1">
      {back ? (
        <Pressable accessibilityRole="button" onPress={onBack} className="flex-row items-center pr-2" hitSlop={8}>
          <Icon name="chevron-left" tone="accent" />
          <Text tone="accent">{back}</Text>
        </Pressable>
      ) : (
        <View />
      )}
      {title ? (
        <View className="absolute left-0 right-0 items-center" pointerEvents="none">
          <Text variant={mono ? 'mono-id' : 'body-strong'} tone="default" tabular={mono}>
            {title}
          </Text>
        </View>
      ) : null}
      <View className="flex-row gap-0.5">{actions}</View>
    </View>
  );
}
