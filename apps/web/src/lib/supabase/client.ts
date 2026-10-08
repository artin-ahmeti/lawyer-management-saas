'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasSupabase, supabaseAnonKey, supabaseUrl } from '@/lib/env';

let client: SupabaseClient | null = null;

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
