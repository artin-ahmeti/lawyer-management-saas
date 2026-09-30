import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/hooks';
import { useTheme } from '@/theme';
import { h1Preview } from '@/lib/h1Preview';

export default function Gate() {
  if (h1Preview) return <Redirect href="/(app)/(tabs)/home" />;
  return <AuthenticatedGate />;
}

function AuthenticatedGate() {
  const { session, loading } = useSession();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  return session ? <Redirect href="/(app)/(tabs)/home" /> : <Redirect href="/(auth)/sign-in" />;
}
