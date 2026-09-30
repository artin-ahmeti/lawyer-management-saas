/**
 * Runtime configuration. Only `NEXT_PUBLIC_*` values reach the browser; the
 * Supabase service-role key is never configured here (write-path rule).
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000';

/** Supabase Auth is wired only when both public values are present. */
export const hasSupabase = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

/**
 * `NEXT_PUBLIC_PREVIEW=1` opens the app without signing in so the H1 design can
 * be reviewed against mock data. It never grants data access: reads still go
 * through RLS and writes through the API once those are connected.
 */
export const previewMode = process.env.NEXT_PUBLIC_PREVIEW === '1';

/**
 * Where reads come from. The domain endpoints do not exist yet, so every
 * query resolves from the in-memory fixtures in `@/lib/data/fixtures`. Flip to
 * `live` when `@lawfirm/api-client` gains matters/billing and the hooks in
 * `@/lib/data/queries` swap their `queryFn`.
 */
export const dataMode: 'mock' | 'live' = 'mock';
