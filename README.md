# Lawyer Management SaaS

Mobile-first law-firm practice management platform. pnpm + Turborepo monorepo:
Expo (mobile), NestJS (API), BullMQ (worker), Supabase Postgres (RLS multi-tenancy).

## Quick start

```sh
pnpm install
pnpm supabase init   # once
pnpm supabase start  # local Postgres :54322 (needs Docker)
pnpm --filter @lawfirm/api dev       # http://localhost:3000/docs
pnpm --filter @lawfirm/mobile start  # Expo dev client
```

See CLAUDE.md for architecture rules and conventions.
