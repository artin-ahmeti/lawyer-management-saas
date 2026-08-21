import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, Screen, SectionHeader, cn } from '@/components/ui';
import { hoursLabel, money, useMatters, useTimeEntries } from '@/mocks/hooks';
import { useTimerStore } from '@/features/time/timerStore';

function elapsedLabel(since: number, now: number): string {
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

export default function Time() {
  const { data: entries } = useTimeEntries();
  const { data: matters } = useMatters();
  const timer = useTimerStore();
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!timer.runningSince) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer.runningSince]);

  const openMatters = (matters ?? []).filter((m) => m.status !== 'closed');
  const todays = (entries ?? []).filter((e) => e.date === '2026-08-21');
  const todayMinutes = todays.reduce((s, e) => s + e.minutes, 0);
  const billableValue = todays.reduce(
    (s, e) => (e.billable ? s + Math.round((e.minutes / 60) * e.rateCents) : s),
    0,
  );

  return (
    <Screen scroll>
      <Text className="mt-2 text-display text-ink">Time</Text>

      {/* Timer card */}
      <Card className="mt-4 items-center py-8">
        <Text className="font-mono text-[44px] font-bold tracking-widest text-ink">
          {timer.runningSince ? elapsedLabel(timer.runningSince, now) : '00:00:00'}
        </Text>
        <Text className="mt-1 text-caption text-ink-muted">
          {timer.matterTitle ?? 'No matter selected'}
        </Text>

        {!timer.runningSince ? (
          <>
            <View className="mt-5 w-full flex-row flex-wrap justify-center gap-2">
              {openMatters.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setSelected(m.id)}
                  accessibilityRole="button"
                  className={cn(
                    'rounded-full px-3 py-1.5',
                    selected === m.id ? 'bg-primary' : 'bg-sunken',
                  )}
                >
                  <Text
                    className={cn(
                      'text-caption font-semibold',
                      selected === m.id ? 'text-primary-fg' : 'text-ink-muted',
                    )}
                    numberOfLines={1}
                  >
                    {m.title.length > 24 ? `${m.title.slice(0, 24)}…` : m.title}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="mt-5 w-full px-6">
              <Button
                size="lg"
                disabled={!selected}
                onPress={() => {
                  const m = openMatters.find((x) => x.id === selected);
                  if (m) timer.start(m.id, m.title);
                }}
              >
                Start timer
              </Button>
            </View>
          </>
        ) : (
          <View className="mt-6 w-full px-6">
            <Button size="lg" variant="danger" onPress={() => timer.stop()}>
              Stop & log
            </Button>
          </View>
        )}
      </Card>

      {/* Today summary */}
      <View className="mt-4 flex-row gap-3">
        <Card className="flex-1 items-center py-3">
          <Text className="text-caption text-ink-faint">Logged today</Text>
          <Text className="text-title text-ink">{hoursLabel(todayMinutes)}</Text>
        </Card>
        <Card className="flex-1 items-center py-3">
          <Text className="text-caption text-ink-faint">Billable value</Text>
          <Text className="text-title text-primary">{money(billableValue)}</Text>
        </Card>
      </View>

      {/* Entries */}
      <SectionHeader title="Recent entries" />
      <Card className="p-0">
        {(entries ?? []).map((e, i) => (
          <View
            key={e.id}
            className={cn(
              'flex-row items-center gap-3 px-4 py-3.5',
              i > 0 && 'border-t border-line-faint',
            )}
          >
            <View className="h-9 w-9 items-center justify-center rounded-md bg-primary/15">
              <Ionicons name="time-outline" size={17} color="#FFB162" />
            </View>
            <View className="flex-1">
              <Text className="text-body text-ink" numberOfLines={1}>
                {e.description}
              </Text>
              <Text className="mt-0.5 text-caption text-ink-muted" numberOfLines={1}>
                {e.matterTitle}
              </Text>
            </View>
            <View className="items-end gap-1">
              <Text className="text-body font-semibold text-ink">{hoursLabel(e.minutes)}</Text>
              <Badge
                tone={e.billable ? 'success' : 'neutral'}
                label={e.billable ? 'billable' : 'no charge'}
              />
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
