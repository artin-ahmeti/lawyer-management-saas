import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card, Screen, SectionHeader, StatCard, cn } from '@/components/ui';
import { money, shortDate, useInvoices } from '@/mocks/hooks';

const statusTone = { draft: 'neutral', sent: 'accent', overdue: 'rust', paid: 'success' } as const;

export default function Billing() {
  const { data } = useInvoices();
  const list = data ?? [];
  const outstanding = list
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + i.totalCents, 0);
  const overdue = list.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.totalCents, 0);
  const collected = list.filter((i) => i.status === 'paid').reduce((s, i) => s + i.totalCents, 0);

  return (
    <Screen scroll>
      <Text className="mt-2 text-display text-ink">Billing</Text>

      <View className="mt-4 flex-row gap-3">
        <StatCard
          emphasis
          label="Outstanding"
          value={money(outstanding)}
          hint={`${money(overdue)} overdue`}
        />
        <StatCard label="Collected (90d)" value={money(collected)} />
      </View>

      <SectionHeader title="Invoices" />
      <View className="gap-3">
        {list.map((inv) => (
          <Card key={inv.id}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className={cn(
                    'h-10 w-10 items-center justify-center rounded-md',
                    inv.status === 'overdue' ? 'bg-rust/25' : 'bg-primary/15',
                  )}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={inv.status === 'overdue' ? '#C96A50' : '#FFB162'}
                  />
                </View>
                <View>
                  <Text className="text-body font-semibold text-ink">{inv.number}</Text>
                  <Text className="mt-0.5 text-caption text-ink-muted" numberOfLines={1}>
                    {inv.clientName}
                  </Text>
                </View>
              </View>
              <View className="items-end gap-1">
                <Text className="text-body font-bold text-ink">{money(inv.totalCents)}</Text>
                <Badge tone={statusTone[inv.status]} label={inv.status} />
              </View>
            </View>
            <Text className="mt-3 text-caption text-ink-faint">
              {inv.matterTitle} · issued {shortDate(inv.issuedAt)} · due {shortDate(inv.dueAt)}
            </Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
