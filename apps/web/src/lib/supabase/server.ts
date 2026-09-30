import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { hasSupabase, supabaseAnonKey, supabaseUrl } from '@/lib/env';

/** Server Supabase client bound to the request cookies (Server Components, Route Handlers). */
export async function getSupabaseServer() {
  if (!hasSupabase) return null;
  const store = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all) => {
        try {
          all.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are refreshed by the proxy instead.
        }
      },
    },
  });
}
