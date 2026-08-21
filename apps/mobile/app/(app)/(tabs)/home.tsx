import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Badge, Card, Screen, SectionHeader, StatCard } from '@/components/ui';
import { useSession } from '@/features/auth/hooks';
import {
  hoursLabel,
  money,
  shortDate,
  timeOfDay,
  useMatters,
  useTasks,
  useTimeEntries,
  useUpcomingEvents,
} from '@/mocks/hooks';

const eventIcon = { court: 'business', meeting: 'people', deadline: 'alarm' } as const;

export default function Home() {
  const { session } = useSession();
  const matters = useMatters();
  const tasks = useTasks();
  const time = useTimeEntries();
  const events = useUpcomingEvents();

  const firstName = session?.user.email?.split('@')[0] ?? 'Counselor';
  const openMatters = (matters.data ?? []).filter((m) => m.status !== 'closed');
  const dueTasks = (tasks.data ?? []).filter((t) => !t.done);
  const todayMinutes = (time.data ?? [])
    .filter((t) => t.date === '2026-08-21')
    .reduce((sum, t) => sum + t.minutes, 0);
  const unbilled = openMatters.reduce((sum, m) => sum + m.unbilledCents, 0);

  return (
    <Screen scroll>
      {/* Header */}
      <View className="mt-2 flex-row items-center justify-between">
        <View>
          <Text className="text-caption text-ink-faint">Thursday, Aug 21</Text>
          <Text className="text-display text-ink">Hi, {firstName}</Text>
        </View>
        <Pressable onPress={() => router.push('/(app)/contacts')} accessibilityRole="button">
          <Avatar name={firstName} size="md" />
        </Pressable>
      </View>

      {/* Stats */}
      <View className="mt-5 flex-row gap-3">
        <StatCard emphasis label="Unbilled" value={money(unbilled)} hint="across open matters" />
        <StatCard
          label="Today"
          value={hoursLabel(todayMinutes)}
          hint={`${dueTasks.length} tasks due`}
        />
      </View>

      {/* Schedule */}
      <SectionHeader title="Coming up" />
      <Card className="gap-0 p-0">
        {(events.data ?? []).slice(0, 3).map((e, i) => (
          <View
            key={e.id}
            className={`flex-row items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-line-faint' : ''}`}
          >
            <View className="h-9 w-9 items-center justify-center rounded-md bg-primary/15">
              <Ionicons name={eventIcon[e.kind]} size={17} color="#FFB162" />
            </View>
            <View className="flex-1">
              <Text className="text-body font-semibold text-ink" numberOfLines={1}>
                {e.title}
              </Text>
              <Text className="text-caption text-ink-muted" numberOfLines={1}>
                {e.matterTitle}
                {e.location ? ` · ${e.location}` : ''}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-caption font-semibold text-primary">{shortDate(e.start)}</Text>
              {e.kind !== 'deadline' ? (
                <Text className="text-caption text-ink-faint">{timeOfDay(e.start)}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </Card>

      {/* Active matters */}
      <SectionHeader
        title="Active matters"
        actionLabel="See all"
        onAction={() => router.push('/(app)/(tabs)/matters')}
      />
      <View className="gap-3">
        {openMatters.slice(0, 3).map((m) => (
          <Card key={m.id} onPress={() => router.push(`/(app)/matters/${m.id}`)}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-body font-semibold text-ink" numberOfLines={1}>
                  {m.title}
                </Text>
                <Text className="mt-0.5 text-caption text-ink-muted">
                  {m.clientName} · #{m.number}
                </Text>
              </View>
              <Badge tone="accent" label={m.practiceArea} />
            </View>
            {m.nextDeadline ? (
              <View className="mt-3 flex-row items-center gap-1.5">
                <Ionicons name="alarm-outline" size={13} color="#C96A50" />
                <Text className="text-caption text-danger">
                  {m.nextDeadline.label} · {shortDate(m.nextDeadline.date)}
                </Text>
              </View>
            ) : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
