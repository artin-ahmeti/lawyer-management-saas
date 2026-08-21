import type { PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from './cn';

interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  className?: string;
}

export function Card({ children, onPress, className }: CardProps) {
  const base = cn('rounded-lg bg-surface p-4', className);
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={cn(base, 'active:opacity-80')}>
        {children}
      </Pressable>
    );
  }
  return <View className={base}>{children}</View>;
}
