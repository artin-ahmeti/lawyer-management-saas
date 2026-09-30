# Lawyer Management SaaS

Law-firm practice management platform (competing with Clio / Litify / MyCase).
Mobile-first: Expo (iOS + Android) plus the staff web app in apps/web (same data, same
rules); apps/portal (client app) is reserved and purely additive later. Full plan history: see the approved plan in .claude/plans/.

## Layout

- `apps/mobile` — Expo SDK 57 + expo-router + NativeWind, staff app
- `apps/api` — NestJS 11, CommonJS, OpenAPI at /openapi.json, docs at /docs
- `apps/worker` — BullMQ processors (separate container)
- `apps/web` — Next.js 16 staff web app over `@lawfirm/ui-web`; feature slices in `src/features`,
  data hooks in `src/lib/data` (mock source until the API grows the domain endpoints), session
  gate in `src/proxy.ts`; `NEXT_PUBLIC_PREVIEW=1` opens it on mock data without sign-in
- `apps/portal` — reserved, do not scaffold without being asked
- `packages/core` — domain logic + Zod schemas shared by every app (ESM)
- `packages/db` — Drizzle schema; `db:generate` emits SQL into `supabase/migrations/`
- `packages/api-client` — generated from the API's OpenAPI spec
- `packages/ui` — design tokens + Tailwind preset (mobile AND future web)
- `packages/ui-web` — Clepso React DOM components over the design-system stylesheet (future web app,
  client portal, and the Claude Design sync via `/design-sync`; sync inputs in `.design-sync/`)
- `packages/config` — shared tsconfig presets; ESLint flat config lives at repo root
- `design/` — Clepso design system: sources in `design/src`, generated `/design-sync` bundle in
  `design/system` (rebuild with `python3 design/src/build.py`; never edit generated files)

## The write-path rule (never violate)

| Operation                               | Path                                                     |
| --------------------------------------- | -------------------------------------------------------- |
| Plain reads                             | mobile/web → supabase-js → RLS                           |
| **ALL writes**                          | mobile/web → NestJS API → Postgres                       |
| Money / aggregates / cross-entity logic | API only                                                 |
| Documents                               | API issues signed URL → client uploads direct to Storage |

Enforced structurally: the `authenticated` DB role gets `select` only
(insert/update/delete revoked); the service-role key exists only in api/worker env.
Never add a Supabase write from any client app, and never put
`SUPABASE_SERVICE_ROLE_KEY` in an `EXPO_PUBLIC_*` or client-visible variable.

## Schema conventions (Plan §5)

- Every table: `id uuid pk`, `firm_id uuid not null`, `created_at`, `updated_at`,
  `created_by`, `deleted_at` (soft delete). RLS enabled **and forced**.
- Money: `numeric(19,4)` in Postgres, integer cents in code (`@lawfirm/core` money utils).
- Durations: integer minutes.
- `audit_logs` is append-only (update/delete revoked); triggers on business tables.
- Ethical walls: matter access = firm RLS **and** `matter_access` grants.
- Migrations: one history in `supabase/migrations/` (Drizzle emits there; RLS SQL is hand-written alongside).

## Commands

- `pnpm install` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build`
- `pnpm --filter @lawfirm/api dev` — API on :3000
- `pnpm --filter @lawfirm/mobile start` — Expo dev client
- `pnpm --filter @lawfirm/web dev` — web app on :3100 (`NEXT_PUBLIC_PREVIEW=1` for mock data)
- `pnpm --filter @lawfirm/worker dev` — worker
- `pnpm supabase start` — local stack (Postgres :54322)
- `pnpm db:generate` — Drizzle → supabase/migrations

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess` everywhere.
- Zod schemas defined once in `packages/core`, reused on device and server.
- Mobile: server state in React Query only; zustand for ephemeral UI state only.
- Mobile code organized as vertical feature slices under `src/features/`.
- NativeWind classes use tokens from `@lawfirm/ui` — no hard-coded colors.
- Web: `@lawfirm/ui-web` components + `cl-*` utilities + `var(--token)` inline styles; no Tailwind,
  no hex. Server state in React Query, zustand only for the timer and overlay state.
