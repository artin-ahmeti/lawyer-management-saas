import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (see .env.example)',
  );
}

/**
 * READ path only (Plan §3): RLS-scoped selects and realtime subscriptions.
 * All writes go through the NestJS API — the `authenticated` role has no
 * insert/update/delete grants, so misuse fails loudly.
 *
 * Phase 1 hardening: move the refresh token into expo-secure-store; MMKV keeps
 * only the short-lived access token.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: {
      getItem: (key) => storage.getString(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => {
        storage.remove(key);
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
