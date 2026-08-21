import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  body,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
}) {
  return (
    <View className="items-center justify-center px-8 py-16">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-surface">
        <Ionicons name={icon} size={26} color="#C9C1B1" />
      </View>
      <Text className="text-center text-title text-ink">{title}</Text>
      {body ? <Text className="mt-1 text-center text-body text-ink-muted">{body}</Text> : null}
    </View>
  );
}
