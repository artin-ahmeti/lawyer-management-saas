import { View } from 'react-native';
import { cn } from './cn';
import { Text } from './Text';

export interface StageItem {
  label: string;
  state?: 'done' | 'current' | 'upcoming';
  /** Client variant only: the "Next: …" sentence under the current stage. */
  next?: string;
}

export interface StageTrackerProps {
  stages: StageItem[];
  /** staff = horizontal short labels; client = vertical, plain language, dated next step. */
  variant?: 'staff' | 'client';
  className?: string;
}

/** Where a matter is in its playbook. */
export function StageTracker({ stages, variant = 'staff', className }: StageTrackerProps) {
  if (variant === 'client') {
    return (
      <View className={className}>
        {stages.map((s, i) => {
          const last = i === stages.length - 1;
          return (
            <View key={i} className="flex-row gap-3.5">
              <View className="items-center">
                <View
                  className={cn(
                    'mt-1 h-3.5 w-3.5 rounded-full border-2',
                    s.state === 'done' ? 'border-accent bg-accent' : s.state === 'current' ? 'border-accent bg-surface' : 'border-border bg-surface',
                  )}
                />
                {!last ? <View className={cn('w-0.5 flex-1', s.state === 'done' ? 'bg-accent' : 'bg-border')} /> : null}
              </View>
              <View className={cn('flex-1', !last && 'pb-5')}>
                <Text variant={s.state === 'current' ? 'title-3' : 'body'} tone={s.state === 'current' ? 'default' : 'muted'}>
                  {s.label}
                </Text>
                {s.next ? (
                  <Text variant="body" tone="muted" className="mt-1">
                    {s.next}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    );
  }
  return (
    <View className={cn('flex-row py-1', className)}>
      {stages.map((s, i) => {
        const done = s.state === 'done';
        const current = s.state === 'current';
        const prevDone = i > 0 && (stages[i - 1]?.state === 'done' || stages[i - 1]?.state === 'current');
        return (
          <View key={i} className="flex-1 items-center gap-2">
            <View className="h-3.5 w-full flex-row items-center">
              <View className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done || (current && prevDone) ? 'bg-accent' : 'bg-border')} />
              <View
                className={cn(
                  'h-3.5 w-3.5 rounded-full border-2',
                  done ? 'border-accent bg-accent' : current ? 'border-accent bg-surface' : 'border-border bg-surface',
                )}
                style={current ? { shadowColor: 'transparent' } : undefined}
              />
              <View className={cn('h-0.5 flex-1', i === stages.length - 1 ? 'bg-transparent' : done ? 'bg-accent' : 'bg-border')} />
            </View>
            <Text variant="caption" weight={current ? 'semibold' : 'medium'} tone={current ? 'default' : 'muted'} numberOfLines={1} className="px-0.5">
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
