import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Screen } from '@/components/ui';
import { signInSchema, type SignInInput } from '@/features/auth/schemas';
import { signInWithPassword } from '@/features/auth/hooks';

export default function SignIn() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signInWithPassword(values.email, values.password);
      router.replace('/');
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Sign-in failed');
    }
  });

  return (
    <Screen className="justify-center">
      <View className="mb-10 items-center">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <Ionicons name="scale" size={30} color="#1B2632" />
        </View>
        <Text className="text-display text-ink">Welcome back</Text>
        <Text className="mt-1 text-body text-ink-muted">Sign in to your firm workspace</Text>
      </View>

      <View className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="you@firm.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />
        {serverError ? <Text className="text-caption text-danger">{serverError}</Text> : null}
        <Button size="lg" loading={isSubmitting} onPress={() => void onSubmit()}>
          Sign in
        </Button>
        <Text className="mt-2 text-center text-caption text-ink-faint">
          Local demo: demo@lawfirm.test / demo-password-123
        </Text>
      </View>
    </Screen>
  );
}
