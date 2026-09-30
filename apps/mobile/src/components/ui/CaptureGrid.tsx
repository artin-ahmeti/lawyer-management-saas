import { Pressable, View } from 'react-native';
import { IconWell } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

export interface CaptureItem {
  key: string;
  label: string;
  icon: IconName;
  accent?: boolean;
  onPress?: () => void;
}

export const DEFAULT_CAPTURE: CaptureItem[] = [
  { key: 'timer', label: 'Start timer', icon: 'play', accent: true },
  { key: 'voice', label: 'Voice memo', icon: 'mic', accent: true },
  { key: 'time', label: 'Log time', icon: 'clock', accent: true },
  { key: 'expense', label: 'Expense', icon: 'camera' },
  { key: 'task', label: 'Task', icon: 'check' },
  { key: 'note', label: 'Note', icon: 'pen' },
];

/** The 3×2 Capture grid: Start timer, Voice memo, Log time (accent), Expense, Task, Note. */
export function CaptureGrid({
  items = DEFAULT_CAPTURE,
  onSelect,
}: {
  items?: CaptureItem[];
  onSelect?: (key: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {items.map((it) => (
        <Pressable
          key={it.key}
          accessibilityRole="button"
          onPress={() => (it.onPress ? it.onPress() : onSelect?.(it.key))}
          className="w-[31%] flex-grow items-center gap-2 rounded-lg border border-hairline bg-surface px-1.5 pb-3 pt-3.5 active:bg-surface-2"
        >
          <IconWell name={it.icon} tone={it.accent ? 'accent' : 'neutral'} size="lg" />
          <Text variant="label" weight="semibold" numberOfLines={1}>
            {it.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
