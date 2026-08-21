import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

const icon =
  (focused: keyof typeof Ionicons.glyphMap, idle: keyof typeof Ionicons.glyphMap) =>
  ({ color, focused: isFocused }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={isFocused ? focused : idle} size={22} color={color as string} />
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFB162',
        tabBarInactiveTintColor: '#8B94A3',
        tabBarStyle: {
          backgroundColor: '#141d27',
          borderTopColor: '#25334272',
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: icon('grid', 'grid-outline') }}
      />
      <Tabs.Screen
        name="matters"
        options={{ title: 'Matters', tabBarIcon: icon('briefcase', 'briefcase-outline') }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: 'Tasks', tabBarIcon: icon('checkbox', 'checkbox-outline') }}
      />
      <Tabs.Screen
        name="time"
        options={{ title: 'Time', tabBarIcon: icon('timer', 'timer-outline') }}
      />
      <Tabs.Screen
        name="billing"
        options={{ title: 'Billing', tabBarIcon: icon('card', 'card-outline') }}
      />
    </Tabs>
  );
}
