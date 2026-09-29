import { View } from 'react-native';
import { cn } from './cn';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

export interface TimelineEvent {
  title: string;
  /** Bold lead-in before the title ("Payment received"). */
  strong?: string;
  meta?: string;
  icon?: IconName;
  tone?: 'default' | 'accent';
  quote?: string;
}

/** Vertical activity feed: actor, action, object and time. */
export function Timeline({ events, className }: { events: TimelineEvent[]; className?: string }) {
  return (
    <View className={className}>
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <View key={i} className="flex-row gap-3">
            <View className="items-center">
              <View className={cn('h-7 w-7 items-center justify-center rounded-full border', e.tone === 'accent' ? 'border-transparent bg-accent-tint' : 'border-hairline bg-surface-2')}>
                <Icon name={e.icon ?? 'check'} size={14} tone={e.tone === 'accent' ? 'accent-ink' : 'ink-2'} />
              </View>
              {!last ? <View className="w-0.5 flex-1 bg-hairline" /> : null}
            </View>
            <View className={cn('flex-1 pt-0.5', !last && 'pb-4')}>
              <Text>
                {e.strong ? <Text weight="semibold">{e.strong} </Text> : null}
                {e.title}
              </Text>
              {e.meta ? (
                <Text variant="caption" tone="muted" className="mt-0.5">
                  {e.meta}
                </Text>
              ) : null}
              {e.quote ? (
                <View className="mt-2 rounded-sm bg-surface-2 px-3 py-2.5">
                  <Text variant="label">{e.quote}</Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
