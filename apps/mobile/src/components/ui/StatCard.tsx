import { Text, View } from 'react-native';
import { cn } from './cn';

export function StatCard({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <View className={cn('flex-1 rounded-lg p-4', emphasis ? 'bg-primary' : 'bg-surface')}>
      <Text
        className={cn(
          'text-caption font-semibold',
          emphasis ? 'text-primary-fg/70' : 'text-ink-faint',
        )}
      >
        {label}
      </Text>
      <Text className={cn('mt-1 text-display', emphasis ? 'text-primary-fg' : 'text-ink')}>
        {value}
      </Text>
      {hint ? (
        <Text
          className={cn('mt-0.5 text-caption', emphasis ? 'text-primary-fg/70' : 'text-ink-muted')}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
