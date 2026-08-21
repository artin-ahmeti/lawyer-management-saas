import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card, Screen, SectionHeader, cn } from '@/components/ui';
import { shortDate, useTasks } from '@/mocks/hooks';
import type { MockTask } from '@/mocks/data';

const TODAY = '2026-08-21';
const priorityTone = { high: 'rust', medium: 'accent', low: 'neutral' } as const;

function TaskRow({ task }: { task: MockTask }) {
  // Local-only toggle until the write path lands (API, Phase 2)
  const [done, setDone] = useState(task.done);
  return (
    <Pressable
      onPress={() => setDone((d) => !d)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      className="flex-row items-center gap-3 px-4 py-3.5"
    >
      <View
        className={cn(
          'h-6 w-6 items-center justify-center rounded-full border-2',
          done ? 'border-success bg-success' : 'border-line',
        )}
      >
        {done ? <Ionicons name="checkmark" size={14} color="#1B2632" /> : null}
      </View>
      <View className="flex-1">
        <Text
          className={cn('text-body text-ink', done && 'text-ink-faint line-through')}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {task.matterTitle ? (
          <Text className="mt-0.5 text-caption text-ink-muted" numberOfLines={1}>
            {task.matterTitle}
          </Text>
        ) : null}
      </View>
      <View className="items-end gap-1">
        <Badge tone={priorityTone[task.priority]} label={task.priority} />
        <Text
          className={cn(
            'text-caption',
            task.due <= TODAY && !done ? 'text-danger' : 'text-ink-faint',
          )}
        >
          {shortDate(task.due)}
        </Text>
      </View>
    </Pressable>
  );
}

function Group({ title, items }: { title: string; items: MockTask[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <SectionHeader title={title} />
      <Card className="p-0">
        {items.map((t, i) => (
          <View key={t.id} className={i > 0 ? 'border-t border-line-faint' : ''}>
            <TaskRow task={t} />
          </View>
        ))}
      </Card>
    </>
  );
}

export default function Tasks() {
  const { data } = useTasks();
  const list = data ?? [];
  const overdue = list.filter((t) => !t.done && t.due < TODAY);
  const today = list.filter((t) => !t.done && t.due === TODAY);
  const upcoming = list.filter((t) => !t.done && t.due > TODAY);
  const completed = list.filter((t) => t.done);

  return (
    <Screen scroll>
      <Text className="mt-2 text-display text-ink">Tasks</Text>
      <Group title="Overdue" items={overdue} />
      <Group title="Today" items={today} />
      <Group title="Upcoming" items={upcoming} />
      <Group title="Completed" items={completed} />
    </Screen>
  );
}
