import { Pressable, Text, View } from 'react-native';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text className="text-title text-ink">{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text className="text-caption font-semibold text-primary">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
