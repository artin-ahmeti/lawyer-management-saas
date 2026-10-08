# apps/web — Clepso staff web app

Next.js 16 (App Router) over the Clepso design system, implemented from
`design/handoff/Clepso Web App.dc.html`, the layout reference. Product requirements and
module gates come from `docs/product/clepso-implementation-blueprint.pdf`.

Most domain screens still use **in-memory demo data**. Changes survive client navigation
and reset on a full page reload. Supabase authentication is connected when its public environment
values are configured. Domain API endpoints, durable file storage, AI generation, message delivery,
and payment processing still need backend integration. The production contract is Supabase + RLS
for reads and **NestJS API for all domain writes**; no service-role key belongs in this app.

With preview disabled, **Settings → Firm profile** reads the current firm from the API and
persists owner/admin name changes in Postgres. It checks current membership, uses revision
conflicts and retry-safe action keys, and records audit/outbox/receipt rows together.
Settings → Background work shows owners/admins up to 20 recent firm-profile checks from
the authorized execution API. Saving a name refreshes the inspection read. Statuses and
failure reasons come from durable records; refresh only rereads them. A failed/invalid
read hides previous rows, and a current access denial replaces cached results. This panel
does not provide manual job retry, all-job search or provider delivery.
Settings → Processing availability checks current firm access, queue connectivity and
a recent worker processing signal. Owner/admin permission is rechecked after probing.
The snapshot expires within 15 seconds (sooner when its worker evidence is older),
and failed/invalid/denied reads clear the displayed result. The check never reruns work
or establishes delivery. Unconfigured services and missing worker signals remain explicit.
Other Settings controls are unavailable until their services exist. Explicit preview mode retains
the existing seven-section demo. This slice does not complete identity, staff platforms, or M00.

**Settings → Your session → Sign out** exits the current browser's Supabase session.
Logout verifies local session absence, cancels reads and clears query/overlay state,
then loads the sign-in page with a full navigation. Auth events hide the staff frame
in other tabs sharing that session. An Auth error with a removed local session shows
an unconfirmed-revocation notice; it never claims that every issued access token is
invalid. This is local logout, not full device/session policy or native cache parity.
The existing fixture timer remains a demo; protected durable drafts remain M09/M15 work.

**Settings → Your workspaces** reads up to 20 live memberships of the current
confirmed account via `GET /auth/memberships`, with stable membership-ID pagination.
It suppresses revoked/deleted grants and unavailable accounts, and hides warm names
while loading or after errors/denial. **Use workspace → Confirm workspace switch**
selects a live membership for this Auth login through the audited API command.
The staff frame hides during selection; the app clears cached reads and overlays,
renews the real Auth session, and confirms target-firm access before reopening it.
The sidebar and avatar show authorized firm/account/role metadata. Unsaved inputs
close during the change; independent login sessions retain their own workspace.

An interrupted command response retains the original request/key for recovery.
A saved selection with failed Auth renewal or target access shows a recovery state;
retry rechecks access instead of submitting a second selection. Selection revisions
deny old context tokens, including a later return to the same firm. Real sessions
are required to select; existing synthetic/legacy token behavior is preserved.
Native controls, complete matter permissions and device/session policy remain M01/M15
work. Domain metrics and the fixture timer remain previews.

**Matters** now uses the authorized API outside explicit preview mode. Live
owners, admins and attorneys can create a matter with a title and optional internal
reference; court and docket fields are not required. Creation commits the matter,
the creator's manager grant, receipt and audit together. Other staff, including
owners, need an explicit grant to read it. The paginated list and detail page show
current accessible records; refresh/error/denial hides previous results.

If a creation response is interrupted, **Check matter request** recovers the same
intent/key. List refresh failures preserve that unresolved intent until access is
confirmed again. A confirmed access denial clears the form; workspace changes
clear its local state. Reload preserves server records. Inputs/uncertain intents
are currently held in memory; protected drafts and offline/native recovery remain
M15 work. Client sharing, contacts/party links, configurable practice profiles,
search, lifecycle edits and domain tabs are subsequent slices. Explicit preview
retains the original matter screens. The live sidebar omits the fixture matter count.

**Matter details → Staff access** lets a current owner/admin/attorney with an
explicit manager grant choose current firm staff and apply reader/manager access
or remove access with a recorded reason. The server validates live roles, accounts,
membership, matter grants and the reviewed policy revision. Owners/admins need a
grant too. Removing the last eligible manager is refused. Each change commits
grant/policy revisions, receipt and audit together; history survives reload.

**Check access request** retains the original intent/key through an uncertain
response and transient read failure. A later policy change requires reviewing
latest access/history. Permission denial hides the roster/form/history; workspace
changes clear local state. Assignment, staff and history pages contain up to 20
records. Financial and client permissions remain separate. Native controls,
realtime cache invalidation, persistent drafts and full membership management are
subsequent gates; this does not complete M01 or M15.

**Settings → Staff roles** shows current firm staff and recorded role changes to
owners/admins. A role change requires a staffing reason, the membership revision
actually reviewed and a stable request key. Owner-role changes require an owner;
ordinary demotion cannot remove the last available owner or leave a restricted
matter without an eligible manager. Handoff errors reveal no matter identifiers.
Existing matter grants remain separate; a role change does not create a grant.

Unknown results retain the same frozen intent through transient read failures.
Stale review requires loading current staff/history before another change. Current
denial removes the form and warm records; self-demotion refreshes current firm
capabilities. History survives reload. Unknown in-memory intents do not survive
reload; protected offline drafts and staff native controls remain M15 work.
Membership removal/restoration, exceptional recovery and configurable capabilities
remain M01 work. The isolated `RUN_STAFF_ROLES_ONLY=1` browser harness exercises
real Auth/API behavior and failure/recovery states without provider simulation.

## Preview screens and flows

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
- Sign-in, sign-up, password recovery, OAuth callback and enrolled TOTP verification.
  Live Settings supports first-firm provisioning and confirmed staff invitation acceptance
  through the API; account creation alone does not create a tenant. Invitation email delivery
  remains unavailable.

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

For live firm Settings, configure `apps/api/.env` from its example (server database URL,
Supabase issuer/legacy JWT secret as applicable, and explicit staff origins in
`CORS_ALLOWED_ORIGINS`), start the API, and point `NEXT_PUBLIC_API_URL` at it. Build
workspace dependencies first with `pnpm --filter @lawfirm/api... build` and
`pnpm --filter @lawfirm/api-client build`. A confirmed account can create its first firm
or accept a prepared invitation in Settings. Pending outbox records are durable. Run the separate
worker with explicit database/Redis configuration as described in `apps/worker/README.md`
to process firm-profile checks; its receipt does not establish provider delivery.

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
