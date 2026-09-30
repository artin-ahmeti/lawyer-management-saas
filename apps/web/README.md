# apps/web — Clepso staff web app

Next.js 16 (App Router) over the Clepso design system, implemented from
`design/handoff/Clepso Web App.dc.html`. The local export is the canonical blueprint.

The web frontend currently runs on **in-memory demo data**. Changes survive client navigation
and reset on a full page reload. Supabase authentication is connected when its public environment
values are configured. Domain API endpoints, durable file storage, AI generation, message delivery,
and payment processing still need backend integration. The production contract is Supabase + RLS
for reads and **NestJS API for all domain writes**; no service-role key belongs in this app.

## Implemented screens and flows

- Today, Inbox, Matters and all eight matter tabs, Contacts, Calendar, Tasks, Documents,
  Time & expenses, Pre-bill, Invoices, Payments, Trust, Reports and all seven Settings sections.
- Capture: timer start/pause/resume, rounded time entries, expenses, tasks, notes, and microphone
  recording with playback in matter activity. Recording and uploaded files remain local to the
  preview session; transcription and storage services are not connected.
- Billing: narrative review, write-downs, approvals, draft invoice generation, installment plans,
  partial/full payment records and client trust balances. Amounts use integer cents. Repeated
  generation cannot invoice the same captured time or expense twice.
- Search with keyboard navigation, shareable filter/tab URLs, CSV downloads, invoice print/PDF,
  courthouse mode, responsive layouts, reduced motion, loading/error/empty states and Undo.
- Sign-in, sign-up, password recovery, OAuth callback and enrolled TOTP verification. Firm/team
  provisioning still requires the firm API; account creation alone does not create a tenant.

## Run it

```sh
pnpm install
pnpm --filter @lawfirm/ui-web build            # the component library ships compiled ESM + CSS
NEXT_PUBLIC_PREVIEW=1 pnpm --filter @lawfirm/web dev   # http://localhost:3100, no sign-in, mock data
```

Copy `.env.example` to `.env.local` and set the Supabase public values to exercise real sign-in
against the local stack (`pnpm supabase start`). Register `/auth/callback` as an allowed redirect
for email/OAuth and enable the Google provider if needed. Without `NEXT_PUBLIC_PREVIEW=1` the
session proxy (`src/proxy.ts`) keeps signed-out visitors on `/sign-in`, including when authentication
configuration is missing. Preview mode must remain disabled for a deployed staff app.

## Where things live

- `src/app` — routes only. `(app)` is the signed-in frame, `(auth)` the sign-in / sign-up flow.
- `src/features/<area>` — one folder per screen family (today, inbox, matters, billing…), mirroring
  the mobile app's vertical slices.
- `src/components/shell` — sidebar, top bar with the running timer, Capture drawer, ⌘K palette,
  confirm dialog and toast.
- `src/lib/data` — domain types, React Query hooks (`queries.ts`), write hooks (`mutations.ts`) and
  the mock data source (`source.ts` + `fixtures/`). The hooks are the seam: when the API gains the
  domain endpoints, `reads.*` become supabase-js selects and `writes.*` become `@lawfirm/api-client`
  calls; pages do not change.
- `src/stores` — zustand for ephemeral UI state only: the wall-clock timer (persisted, same contract
  as mobile), sidebar preference, overlays.
- Styling: `@lawfirm/ui-web` components + its `clepso.base.css`; Geist is self-hosted through
  `next/font`. Layout glue uses the `cl-*` utilities and tokens; no hex values, no second styling
  system.

## Conventions

- Money is integer cents, durations are minutes, dates are ISO strings; `src/lib/format.ts` renders
  them. While the app runs on fixtures the clock is pinned to 2026-09-29 (`src/lib/clock.ts`) so
  relative labels ("46 days late") stay truthful.
- Theme follows the OS by default; the moon/sun toggle sets a `clepso-theme` cookie and the
  `data-theme` attribute on `<html>`; dark is courthouse mode.
- Modals use native `<dialog>` for focus containment, background isolation and Escape. Confirmations
  state the consequence and name the action. Reversible writes offer Undo; conflicting newer edits
  prevent an older Undo from overwriting them.
- AI outputs in the demo are suggestions and require an explicit action to apply. The workspace
  AI preference controls their visibility. Integration/security switches are preview preferences;
  authentication policy enforcement belongs to Supabase and the firm API.

## Verification

```sh
pnpm --filter @lawfirm/web typecheck
pnpm --filter @lawfirm/web test
pnpm --filter @lawfirm/web build
pnpm exec eslint apps/web/src packages/ui-web/src/components/{Table,Navigation,List,Controls}.tsx
```

Tests cover formatting, financial validation, trust boundaries, exact installment totals, billing
linkage, conflicting Undo and authentication return paths. Local browser checks cover all main
routes, modal keyboard behavior, capture and invoice/payment flows, file downloads, voice playback,
print layout, light/courthouse modes and desktop/tablet/mobile layouts. Actual Supabase login and
external delivery/processing require configured services and credentials.

The design review covers the exported layouts, compact drawer metrics, grouped time and pre-bill
tables, plan cards and responsive navigation. Browser verification includes 17 main views at 1440,
1024 and 390 pixels, plus a 600-pixel-tall Capture drawer with its save action pinned below the
scrolling form. Query loading keeps the server skeleton through hydration to prevent cached shell
queries from causing a page rebuild. A production build with preview disabled also verifies protected
route redirects and public authentication pages.
