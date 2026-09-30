import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { BrandMark, Button, Divider, Field, Input, Screen, Text } from '@/components/ui';
import { signInWithPassword } from '@/features/auth/hooks';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passwordSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(email, password);
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const faceSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const available =
        (await LocalAuthentication.hasHardwareAsync()) &&
        (await LocalAuthentication.isEnrolledAsync());
      if (!available) {
        setError('Face ID is not set up on this device. Sign in with your password.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Clepso',
        cancelLabel: 'Use password',
      });
      if (!result.success) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace('/');
      else setError('Sign in with your password once to enable Face ID on this device.');
    } catch {
      setError('Face ID could not unlock this session. Use your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen className="justify-center" contentClassName="justify-center">
      <View className="gap-7">
        <View className="gap-3">
          <View className="flex-row items-center gap-2.5">
            <BrandMark size="lg" tone="accent" />
            <Text variant="title-2">Clepso</Text>
          </View>
          <Text variant="display" className="mt-2">
            Welcome back.
          </Text>
          <Text tone="muted">Tran & Okafor LLP · you were last here yesterday at 6:12 PM.</Text>
        </View>
        <Button
          variant="primary"
          size="lg"
          block
          icon="face"
          loading={busy}
          onPress={() => void faceSignIn()}
        >
          Continue with Face ID
        </Button>
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Divider />
          </View>
          <Text variant="caption" tone="muted">
            or
          </Text>
          <View className="flex-1">
            <Divider />
          </View>
        </View>
        <View className="gap-4">
          <Field label="Email">
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="dana@tranokafor.law"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
          </Field>
          <Field label="Password">
            <Input
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="Password"
            />
          </Field>
          {error ? (
            <Text variant="label" tone="danger">
              {error}
            </Text>
          ) : null}
          <Button size="lg" block loading={busy} onPress={() => void passwordSignIn()}>
            Sign in
          </Button>
        </View>
        <Text variant="caption" tone="muted" className="text-center">
          You stay signed in on this device. Sessions lock after 15 minutes in courthouse mode.
        </Text>
      </View>
    </Screen>
  );
}
