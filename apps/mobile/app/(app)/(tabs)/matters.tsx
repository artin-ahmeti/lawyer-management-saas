import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Badge, Card, EmptyState, Input, Screen, cn } from '@/components/ui';
import { money, shortDate, useMatters } from '@/mocks/hooks';
import type { MockMatter } from '@/mocks/data';

const FILTERS = ['All', 'Open', 'Pending', 'Closed'] as const;
type Filter = (typeof FILTERS)[number];

const statusTone = { open: 'success', pending: 'accent', closed: 'neutral' } as const;

export default function Matters() {
  const { data } = useMatters();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter !== 'All') list = list.filter((m) => m.status === filter.toLowerCase());
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.clientName.toLowerCase().includes(q) ||
          m.number.includes(q),
      );
    }
    return list;
  }, [data, filter, query]);

  return (
    <Screen>
      <Text className="mt-2 text-display text-ink">Matters</Text>
      <View className="mt-4">
        <Input
          placeholder="Search by title, client, or number"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>
      <View className="mt-3 flex-row gap-2">
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            accessibilityRole="button"
            className={cn('rounded-full px-4 py-1.5', filter === f ? 'bg-primary' : 'bg-surface')}
          >
            <Text
              className={cn(
                'text-caption font-semibold',
                filter === f ? 'text-primary-fg' : 'text-ink-muted',
              )}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mt-4 flex-1">
        <FlashList
          data={filtered}
          keyExtractor={(m: MockMatter) => m.id}
          contentContainerStyle={{ paddingBottom: 112 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase-outline"
              title="No matters found"
              body="Try a different search or filter."
            />
          }
          renderItem={({ item: m }) => (
            <Card onPress={() => router.push(`/(app)/matters/${m.id}`)}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-body font-semibold text-ink" numberOfLines={1}>
                    {m.title}
                  </Text>
                  <Text className="mt-0.5 text-caption text-ink-muted">
                    {m.clientName} · #{m.number}
                  </Text>
                </View>
                <Badge tone={statusTone[m.status]} label={m.status} />
              </View>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-caption text-ink-faint">
                  {m.practiceArea} · {m.responsibleAttorney} · opened {shortDate(m.openedAt)}
                </Text>
                {m.unbilledCents > 0 ? (
                  <Text className="text-caption font-semibold text-primary">
                    {money(m.unbilledCents)} unbilled
                  </Text>
                ) : null}
              </View>
            </Card>
          )}
        />
      </View>
    </Screen>
  );
}
