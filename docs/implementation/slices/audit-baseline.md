# Audit baseline before M00-S01

Moved verbatim from `STATUS.md` on October 8, 2026. The current state lives in
[`../STATUS.md`](../STATUS.md).

## Audit baseline before M00-S01

- `apps/api/src/app.module.ts` initially imports only health/auth; `auth/me`
  verifies token claims but not current database membership.
- `packages/db/src/schema/tenancy.ts` and the two August migrations initially
  contain only firms, profiles, staff memberships, and practice-area names.
- `apps/worker/src/main.ts` processes only a no-op heartbeat.
- `apps/web/src/lib/data/source.ts`, `store.ts`, and `fixtures/*` supply business
  reads/writes in memory, even outside preview. `source.test.ts` verifies demo
  behavior, not durable operations or provider outcomes.
- `apps/mobile/src/features/h1/H1App.tsx`, `data.ts`, and `src/mocks/*` implement
  preview workflows. The timer persists locally; `features/firm/hooks.ts` has a
  real RLS firm read. Native domain commands/offline reconciliation are absent.
- `packages/api-client/src/index.ts` initially exports only a version constant;
  its manifest has an OpenAPI generation command.
- `.github/workflows/ci.yml` already checks types, lint, formatting, unit tests,
  builds, audit, and separate Supabase tenant isolation. Turbo caches build outputs.
- There is no existing implementation tracker or architecture-decision directory.
