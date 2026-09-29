import type { PropsWithChildren } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, queryPersister } from '@/lib/queryClient';
import { ThemeProvider } from '@/theme';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
            <ThemeProvider>
              <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
            </ThemeProvider>
          </PersistQueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
