'use client';

import { createBrowserClient } from '@supabase/ssr';
import { hasSupabase, supabaseAnonKey, supabaseUrl } from '@/lib/env';

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser Supabase client — READ path only (RLS-scoped selects, auth).
 * All writes go through the NestJS API; the `authenticated` role has no
 * insert/update/delete grants, so misuse fails loudly.
 */
export function getSupabaseBrowser() {
  if (!hasSupabase) return null;
  client ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
