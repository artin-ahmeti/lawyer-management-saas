import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Card, EmptyState, Input, Screen } from '@/components/ui';
import { useContacts } from '@/mocks/hooks';
import { signOut } from '@/features/auth/hooks';

export default function Contacts() {
  const { data } = useContacts();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
  }, [data, query]);

  return (
    <Screen scroll>
      <View className="mt-4">
        <Input placeholder="Search contacts" value={query} onChangeText={setQuery} />
      </View>
      <View className="mt-4 gap-3">
        {filtered.length === 0 ? (
          <EmptyState icon="people-outline" title="No contacts found" />
        ) : (
          filtered.map((c) => (
            <Card key={c.id} className="flex-row items-center gap-3">
              <Avatar name={c.name} />
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-body font-semibold text-ink" numberOfLines={1}>
                    {c.name}
                  </Text>
                  {c.type === 'company' ? (
                    <Ionicons name="business-outline" size={13} color="#8B94A3" />
                  ) : null}
                </View>
                <Text className="mt-0.5 text-caption text-ink-muted" numberOfLines={1}>
                  {c.role} · {c.email}
                </Text>
              </View>
              <Ionicons name="call-outline" size={18} color="#FFB162" />
            </Card>
          ))
        )}
      </View>

      <View className="mt-10">
        <Button variant="outline" onPress={() => void signOut()}>
          Sign out
        </Button>
      </View>
    </Screen>
  );
}
