import type { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from './cn';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  className?: string;
}

/** Dark canvas + safe area. Every screen root uses this. */
export function Screen({ children, scroll = false, className }: ScreenProps) {
  const inner = cn('flex-1 px-5', className);
  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      {scroll ? (
        <ScrollView
          className={inner}
          contentContainerStyle={{ paddingBottom: 112 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={inner}>{children}</View>
      )}
    </SafeAreaView>
  );
}
