# supabase/

`supabase/migrations/` is the single source of truth for schema + RLS policies.
Drizzle (`pnpm db:generate` from packages/db) emits SQL here; hand-written RLS
migrations live alongside. Run `pnpm supabase init` once locally, then
`pnpm supabase start` for the local stack (Postgres on :54322, API on :54321).
