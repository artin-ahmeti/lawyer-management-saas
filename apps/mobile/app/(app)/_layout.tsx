import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1B2632' },
        headerTintColor: '#EEE9DF',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#1B2632' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="matters/[id]" options={{ title: 'Matter' }} />
      <Stack.Screen name="contacts" options={{ title: 'Contacts' }} />
    </Stack>
  );
}
