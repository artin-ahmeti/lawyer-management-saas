import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { hoursLabel, money, shortDate, useMatter, useTasks, useTimeEntries } from '@/mocks/hooks';

const statusTone = { open: 'success', pending: 'accent', closed: 'neutral' } as const;

export default function MatterDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: matter, isLoading } = useMatter(id);
  const { data: tasks } = useTasks();
  const { data: entries } = useTimeEntries();

  if (isLoading || !matter) {
    return (
      <Screen>
        {!isLoading && <EmptyState icon="briefcase-outline" title="Matter not found" />}
      </Screen>
    );
  }

  const matterTasks = (tasks ?? []).filter((t) => t.matterId === matter.id && !t.done);
  const matterTime = (entries ?? []).filter((e) => e.matterId === matter.id);

  return (
    <>
      <Stack.Screen options={{ title: `#${matter.number}` }} />
      <Screen scroll>
        {/* Header */}
        <View className="mt-2">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-display text-ink">{matter.title}</Text>
            <Badge tone={statusTone[matter.status]} label={matter.status} />
          </View>
          <Text className="mt-1 text-body text-ink-muted">
            {matter.clientName} · {matter.practiceArea}
          </Text>
        </View>

        {/* Key facts */}
        <Card className="mt-5 p-0">
          {[
            ['Billing', matter.billingType, 'card-outline'],
            ['Attorney', matter.responsibleAttorney, 'person-outline'],
            ['Opened', shortDate(matter.openedAt), 'calendar-outline'],
            [
              'Unbilled',
              matter.unbilledCents > 0 ? money(matter.unbilledCents) : '—',
              'cash-outline',
            ],
          ].map(([label, value, icon], i) => (
            <View
              key={label}
              className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line-faint' : ''}`}
            >
              <Ionicons name={icon as never} size={16} color="#8B94A3" />
              <Text className="w-20 text-caption font-semibold text-ink-faint">{label}</Text>
              <Text className="flex-1 text-body capitalize text-ink">{value}</Text>
            </View>
          ))}
        </Card>

        {matter.nextDeadline ? (
          <Card className="mt-3 flex-row items-center gap-3 border border-rust/40 bg-rust/10">
            <Ionicons name="alarm" size={18} color="#C96A50" />
            <View className="flex-1">
              <Text className="text-body font-semibold text-danger">
                {matter.nextDeadline.label}
              </Text>
              <Text className="text-caption text-ink-muted">
                {shortDate(matter.nextDeadline.date)}
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Open tasks */}
        <SectionHeader title={`Open tasks (${matterTasks.length})`} />
        {matterTasks.length ? (
          <Card className="p-0">
            {matterTasks.map((t, i) => (
              <View
                key={t.id}
                className={`flex-row items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-line-faint' : ''}`}
              >
                <View className="h-5 w-5 rounded-full border-2 border-line" />
                <Text className="flex-1 text-body text-ink" numberOfLines={1}>
                  {t.title}
                </Text>
                <Text className="text-caption text-ink-faint">{shortDate(t.due)}</Text>
              </View>
            ))}
          </Card>
        ) : (
          <Card>
            <Text className="text-body text-ink-muted">No open tasks.</Text>
          </Card>
        )}

        {/* Time */}
        <SectionHeader title="Recent time" />
        {matterTime.length ? (
          <Card className="p-0">
            {matterTime.map((e, i) => (
              <View
                key={e.id}
                className={`flex-row items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-line-faint' : ''}`}
              >
                <View className="flex-1">
                  <Text className="text-body text-ink" numberOfLines={1}>
                    {e.description}
                  </Text>
                  <Text className="mt-0.5 text-caption text-ink-faint">{shortDate(e.date)}</Text>
                </View>
                <Text className="text-body font-semibold text-ink">{hoursLabel(e.minutes)}</Text>
              </View>
            ))}
          </Card>
        ) : (
          <Card>
            <Text className="text-body text-ink-muted">No time logged yet.</Text>
          </Card>
        )}

        <View className="mt-6 flex-row gap-3">
          <View className="flex-1">
            <Button variant="outline">Log time</Button>
          </View>
          <View className="flex-1">
            <Button>New task</Button>
          </View>
        </View>
      </Screen>
    </>
  );
}
