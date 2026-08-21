import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/hooks';

export default function Gate() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#FFB162" />
      </View>
    );
  }
  return session ? <Redirect href="/(app)/(tabs)/home" /> : <Redirect href="/(auth)/sign-in" />;
}
