import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '@/features/auth/hooks';
import { h1Preview } from '@/lib/h1Preview';
import { useTheme } from '@/theme';

export default function AppLayout() {
  if (h1Preview) return <Stack screenOptions={{ headerShown: false }} />;
  return <AuthenticatedAppLayout />;
}

function AuthenticatedAppLayout() {
  const { session, loading } = useSession();
  const { theme } = useTheme();
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
