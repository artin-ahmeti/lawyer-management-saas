# Clepso implementation status

Latest locally complete slice (October 8, 2026): **M01-S06a audited staff role changes**.
Prerequisites: M00 receipt/audit foundation, M01 live account/session/firm context,
and M01-S05b explicit matter access management. PDF p12/p26/p39/p40.
Outcome: current owners/admins review live staff and change a role with a reason,
reviewed membership revision, durable history and same-intent recovery. Owner
changes require an owner; the last available owner and last eligible matter
manager remain protected. Restricted matter names/counts are not disclosed by
firm administration. Membership removal/restoration and exceptional recovery are
subsequent slices. M01/M15 remain partial; first-five whole completion is 0/5.

Verified slice tasks:

1. [x] Establish failing API outcome tests for current roles, cross-firm targets,
       replay, concurrent review, last-owner/manager protection and live revocation.
2. [x] Add reversible membership revision/history index; strict shared contracts,
       bounded server reads/command, atomic membership/receipt/audit and ordered
       firm-before-membership locks. Verify clean/upgrade/down and isolation.
3. [x] Connect Settings staff list, role/reason form, durable history and recovery;
       verify browser loading, errors, denial, keyboard and responsive states.
4. [x] Run repository checks/integration tests, review against session snapshot,
       update evidence/decisions/tracker and identify the next dependency-ready slice.

The slice passes local functional checks. The dependency audit remains a release
blocker; no whole module or core release is complete. Next: **M01-S06b audited
membership removal/restoration and explicit restricted-matter recovery**. Preserve
the no-bypass boundary; exceptional recovery policy needs its own recorded review.
Then continue M02 contacts/party links and configurable profiles. M22 stays deferred.

Product authority: `docs/product/clepso-implementation-blueprint.pdf`, v1.1,
October 1, 2026. All 44 pages were read from that file for this audit on
October 6, 2026. No module or core release is complete.

The immediate surface is staff web; shared contracts must support staff native
and client web/native. M22 stays post-core, with no voice-provider decision.
The PDF supersedes older README statements describing the client portal as v2.

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

## Module matrix

Statuses describe the whole module. A completed slice does not satisfy a module gate.
PDF module pages are M00=11 through M22=33. Dependencies below are the PDF graph.

| Module / status                        | Actual code and tests                                                                                                                                                                                 | Missing behavior / acceptance gate                                                                                                                                                        | Prerequisites                               | Next small vertical slice                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| M00 partial                            | `apps/worker/src/{execution,queue,main}.ts`, firm commands/inspection, execution migrations; worker/command/RLS/migration tests/CI; live Settings background-work/availability/attempt-history panels | Broader command/job coverage, domain recovery, aggregate metrics, deployment probes and backup restoration; long-processing/load/recovery gates (p11,p40)                                 | None                                        | Operational search, monitoring and restoration evidence                                 |
| M01 partial                            | Live firm/session authorization, provisioning/invitations/selection; audited revisioned matter grants/revocation and staff role changes; API/RLS/migration/browser tests                              | Membership removal/restoration and exceptional recovery, configurable capabilities, financial/client/publication boundaries, MFA/device policies, files/AI/worker/cache revocation; p12   | M00                                         | Audited membership removal/restoration and explicit restricted-matter recovery          |
| M02 partial                            | `schema/matters.ts`, `modules/matters/*`, shared/generated contracts, live create/list/detail; API/RLS/migration/browser tests; contacts/profiles remain previews                                     | Contacts/organizations/aliases, multiple clients/party roles, configurable profiles/fields, jurisdictions, lifecycle/history and authorized search; full p13 gate                         | M01                                         | Universal contacts and matter-party links, then published practice profiles             |
| M03 demo-only                          | Integration fixtures and local `toggleIntegration`; no adapter/OAuth/sync records                                                                                                                     | Ownership/scopes/encrypted credentials, external mappings, verified replay-safe ingress, cursor/backfill and health; missed-event/private-email tests (p14)                               | M00,M01,M02                                 | Persist disconnected connection descriptors and explicit unavailable status             |
| M04 demo-only                          | `features/documents/*`, upload/local source methods, browser object URLs                                                                                                                              | Durable versions/files, authorized upload/download, interrupted receipt/scan states, extraction provenance, signatures; failed scan must not expose file (p15)                            | M01,M02,M03                                 | Authorized upload reservation and completion/scan-pending records                       |
| M05 demo-only                          | Inbox/activity fixtures; `setInvoiceState` simulates email/SMS outcomes                                                                                                                               | Durable recipients/threads/drafts, approvals, consent/preferences, delivery attempts/status, replay-safe reminders and Outlook filing (p16)                                               | M02,M03,M04                                 | Create an authorized message draft; sending unavailable without adapter                 |
| M06 demo-only                          | Calendar/task screens and local writes; fixture/prose deadline descriptions                                                                                                                           | Sourced obligations, trigger facts/timezones/rules versions, review/override, preparation dependencies and sync; changed-order/DST/unsupported-rule tests (p17)                           | M02,M03,M04,M05                             | Manual sourced obligation with owner and explicit date-review history                   |
| M07 not started                        | Inbox lead examples only; no intake/conflict/engagement server model                                                                                                                                  | Leads/related-party conflict search, attorney decisions, consultation/engagement/decline/onboarding; fuzzy match never clears and replay creates one matter (p18)                         | M02,M04,M05,M06                             | Persist an inquiry and prospective party with an attorney review queue                  |
| M08 demo-only                          | Playbook fixture toggles and matter stage arrays                                                                                                                                                      | Draft/test/publish versions, pinned runs, approved triggers/actions, review gates, upgrade previews, retry history; no silent upgrades or duplicate effects (p19)                         | M02–M07                                     | Publish an operational playbook version and instantiate a pinned run                    |
| M09 demo-only                          | Web/native local timer, capture and time/expense source; core money/format and demo tests                                                                                                             | Durable measured/confirmed duration, rounding/rates, receipts/audio, protected offline drafts, conflict/revocation revalidation; app-kill/overlap tests (p20)                             | M02,M04,M05,M06                             | Save manual confirmed-duration time through an idempotent command                       |
| M10 demo-only                          | Prebill/invoice screens, demo generation/linkage/installment tests                                                                                                                                    | Fee arrangements, durable reviewed issuance/adjustments/receivables, one debt per invoice, UTBMS/LEDES/QBO, delivery; exact totals/double-billing tests (p21)                             | M04,M05,M07,M09                             | Persist reviewed prebill inputs and issue one linked invoice                            |
| M11 demo-only                          | `features/trust/TrustPage.tsx`, payment and trust fixture writes/tests                                                                                                                                | Balanced postings/client allocations, provider states/refunds/disputes, independent bank evidence and signed reconciliation; replay and cross-client allocation tests (p22)               | M03,M05,M06,M10                             | Model operating/trust accounts and balanced posting commands before provider activation |
| M12 demo-only                          | Fixture AI text, demo review actions and local settings; no retrieval/proposal service                                                                                                                | Current permission-filtered sources, untrusted-content boundary, structured proposals/revisions, execution revalidation, evaluations/usage; injection/stale/restricted-source tests (p23) | M01,M02,M04,M05,M08                         | Source-linked proposal inspection with execution disabled until domain command exists   |
| M13 demo-only                          | Today/review/matter progress demos; source actions mutate local records                                                                                                                               | All seven complete durable journeys (pp37–38), grouped review, completeness/blocker explanations, approved publication, partial-execution recovery (p24)                                  | M06,M08–M12                                 | Document request → receipt → staff completeness review → confirmed next step            |
| M14 not started                        | Document screens illustrate content; no comparison/chronology/research/DOCX backend                                                                                                                   | Template/version drafting, cited review/differences, uncertain chronology, licensed research and Word/export; correct source version and visible contradictions (p25)                     | M04,M08,M12                                 | Deterministic approved-template artifact with source/version inputs                     |
| M15 partial                            | Live Settings/session selection/shell, durable Matters create/list/detail and staff access/history; shared/generated client and responsive/recovery/browser evidence                                  | Remaining production domains, protected offline/deep links/push/recovery, accessibility and web/iOS/Android parity for every journey (p26)                                                | Alongside M01–M14                           | Continue durable domain interfaces and native parity                                    |
| M16 not started                        | `apps/portal/README.md` reserved; design references only                                                                                                                                              | Separate client grants/publication, web and shared iOS/Android apps, requests/messages/files/signatures/payments/receipts; internal content excluded and consistent platforms (p27)       | M01,M04–M06,M08,M10–M13                     | Published case-view contract and client-grant permission tests before portal UI         |
| M17 demo-only                          | `features/reports/ReportsPage.tsx`, `fixtures/reports.ts`, local CSV export                                                                                                                           | Server aggregates/drill-down with matter/financial permission filters, source reconciliation, budgets/workload/schedules/completeness timestamps (p28)                                    | M06,M08–M13                                 | One authorized workload metric reconciled to durable tasks                              |
| M18 demo-only                          | Closed six-value `PracticeArea`, California sample firm and six demo playbooks                                                                                                                        | Every-family extensible catalog, operational versus reviewed rules, pack versions/coverage/upgrade history; transactional/agency fields optional (p29,pp34–36)                            | M02,M04,M06–M14; design starts with M02/M08 | Extensible profile contracts with independent jurisdiction references                   |
| M19 demo-only                          | Browser CSV/download utilities and Clio integration toggle; no import/closure/retention backend                                                                                                       | Staged mappings, exceptions/reconciliation/acceptance, closure/final accounting, legal holds/retention and complete exit export; no automatic publication (p30)                           | M02,M04,M07,M10,M11                         | Dry-run contact/matter import with preserved source IDs and exceptions                  |
| M20 demo-only                          | Plan/usage fixtures and local `changePlan`; prices/allowances are examples only                                                                                                                       | Verified subscriptions/entitlements, deduplicated attributed usage, caps/opt-in overage, cancellation/export and supplier reconciliation (p31)                                            | M01,M03,M10–M14                             | Deduplicated usage event and explicit unconfigured allowance/cap                        |
| M21 not started                        | Build/test tooling only; no pilot or recovery evidence                                                                                                                                                | M00–M20 gates, all required platforms/providers, nationwide coverage, 50-lawyer load, pilots/baselines, restore/rollback/runbooks and seven journeys (p32,pp39–41)                        | M00–M20                                     | Record reproducible foundation integration/recovery results as modules land             |
| M22 not started, deliberately deferred | No voice architecture/provider in runtime                                                                                                                                                             | All later evaluation and voice gates remain deferred (p33)                                                                                                                                | Stable core; M01,M05–M08,M16,M20            | None before M21/core stability                                                          |

## Previous slice: M00-S01 / M01 prerequisite / M15 staff Settings

Outcome: an existing firm's owner/admin can persist a firm-name change; staff can
read their current firm. A lost-response retry cannot repeat the update/audit/event.
This does not implement firm provisioning, matter permissions, or full Settings.

Records: existing firms/memberships plus firm revision, command receipts,
append-only audit logs and durable outbox events. Authorization uses verified JWT
actor/active-firm identifiers and current database membership, not claimed roles.
Permissions: current staff may read the profile; only owner/admin may rename it.
Deleted firms/memberships and cross-firm actors are denied, including receipt replay.

Relevant PDF cases: p11 command replay; p12 cross-firm/revocation; p39 authorization
and no duplicate effects; p40 database outage must not appear successful. Dispatch
crash recovery and backup restoration are not claimed by this slice.

Implemented and functionally verified locally. M00/M01/M15 remain partial; the
repository dependency-security gate is still failing. Tasks:

1. [x] Shared firm/command contracts and failing validation/authorization tests.
2. [x] Additive execution-record and live-membership migrations; clean/upgrade/down checks.
3. [x] Bounded GET/PATCH firm endpoints, transactional idempotency/audit/outbox,
       structured request errors/logging and generated OpenAPI client.
4. [x] Staff Settings live firm-name form, retry/conflict/permission/unavailable
       states; preserve existing preview functionality behind explicit preview mode.
5. [x] Focused and broader checks, runtime inspection, diff review, evidence update.

Next M00 slices: dispatch committed outbox events into bounded jobs with leases,
retry/result records and crash/replay tests; operational readiness/inspection;
deployment and backup restoration rehearsal. M01 provisioning/invites/context and
matter grants follow their execution prerequisites.

## Blockers and unverified gates

- Current `pnpm audit --audit-level high --json` exits 1: 35 high, 20 moderate,
  2 low, 0 critical (October 8 S05b rerun). The refreshed feed identified a critical proxy-addr advisory;
  its 2.0.8 patch and regression are now applied (D006). Remaining high advisories
  include fast-uri, @xmldom/xmldom, braces, source-map-js and compression. D006 previously changed
  proxy-addr 2.0.7 → 2.0.8. The worker links to existing postgres/Vitest versions;
  S05b changes no dependencies. Resolve other advisories through
  focused verified upgrades; no audit gate was suppressed.
- Local Docker/Supabase now runs. Only local and test-owned disposable databases
  were changed. No production/staging database was used. Deployment and full
  backup restoration are still unverified.
- No configured provider contracts/credentials have been established for Microsoft,
  Google, signatures, payments/accounting, maintained rules, licensed research,
  AI processing/retention, push or native distribution. Implement local contracts
  with truthful unavailable states; do not fabricate success.
- No jurisdiction policy validation, nationwide specialist coverage, pilots,
  measured performance targets, final prices/allowances or release dates exist.
- Chrome DevTools MCP is unavailable. An isolated installed Chrome/CDP profile
  verified the live Settings flow; native platforms, whole-shell accessibility,
  production-browser targets and all seven flagship journeys remain unverified.
- Staff identity and selected-firm metadata are live; the timer and other domain
  counters/screens still use fixtures even outside preview. This is a
  development slice, not a deployable whole staff application.

## Changed paths and durable contracts

- API: `apps/api/src/common/auth/supabase-auth.guard{,.test}.ts`,
  `common/database/database.module.ts`, `common/http.ts`, `modules/firms/firm.{dto,service,controller,module}.ts`,
  `modules/auth/auth.module.ts`, `app.module.ts`, `main.ts`, `.env.example`,
  `package.json`, `tsconfig.json`, `vitest{,.integration}.config.ts`,
  `test/firm-command.integration.test.ts`, `test/firm-settings.browser.mjs`.
- Database: `packages/db/src/schema/{tenancy,execution,index}.ts`,
  `test/{rls-isolation,migrations}.test.ts`;
  `supabase/migrations/20261006002359_careful_zzzax.sql`,
  `20261006002400_execution_security.sql`, `meta/20261006002359_snapshot.json`,
  `meta/_journal.json`, `supabase/rollbacks/20261006_execution_foundation.sql`.
  Existing August migrations remain unchanged. New tables: command_receipts,
  audit_logs and outbox_events; firms gains revision. RLS stays forced, business
  writes stay denied to client roles, and audit mutation/truncation is denied.
- Shared contracts: `packages/core/src/schemas/firm{,.test}.ts`, `src/index.ts`;
  `packages/api-client/src/index.ts`, `src/generated/schema.d.ts`, `package.json`,
  `scripts/copy-contract.mjs`. Build copies generated declarations into dist;
  `apps/web/src/lib/firm-api.type-test.ts` fails if consumer contracts become any.
  GET `/firms/current`; PATCH `/firms/current/name` accepts name/expectedRevision,
  UUID Idempotency-Key and optional UUID X-Request-Id. Actor/firm come from verified
  authentication. API returns a firm profile and durable command ID, with 401/403,
  validation and conflict errors. A caller retains the same key for the same retry.
- Staff web: `apps/web/src/features/settings/{SettingsPage,LiveFirmSettings}.tsx`,
  `src/lib/{firm-session,firm-api.test}.ts`, `src/lib/supabase/client.ts`,
  `package.json`, `tsconfig.contracts.json`, `README.md`. Live profile never reads fixtures; draft/revision
  survives background refresh; explicit reload resolves conflicts; denied reads
  replace prior data. Other Settings controls are unavailable outside preview.
- CI/notes: `.github/workflows/ci.yml` adds the API build/integration steps to its
  existing local Supabase job. `pnpm-lock.yaml` adds only the workspace link relative
  to the session-start snapshot. `docs/implementation/{STATUS,DECISIONS}.md` records
  evidence/decisions. No commits, staging, merge or deployment were performed.

## PDF scenarios exercised and remaining

- p11 command retry: concurrent HTTP requests and an actual lost-response browser
  retry yield one update/audit/event/receipt per intent. Payload mismatch and stale
  revision conflict rather than silently overwriting. Post-commit dispatch crash
  recovery and full backup restoration remain unverified.
- p12 / p39 authorization: forged firm context, stale claimed owner role, current
  role downgrade, deleted firm, revoked membership and replay after revocation are
  denied. Existing RLS reads no longer trust stale claims alone. Client business
  writes and access to execution tables are denied; audit rows are immutable.
  Ethical walls, client representatives, signed files, AI retrieval and report
  aggregates require future domain records and tests.
- p40 operations: injected outbox insert failure rolls back the update, receipt
  and audit; retry after repair succeeds. Read connection failure and unknown write
  response show recovery controls, not success. A literal Postgres outage, queue
  failure, long job, usage cap and restored backup are still unverified.
- p40 platform scope: desktop 1440×1000 and mobile-width 390×844 staff web were
  inspected. Loading, error/retry, read-only, conflict, response-loss recovery and
  revoked access were exercised with local real auth/API/DB. No runtime/console
  errors or warnings were observed in the final focused browser run. Accessible
  field name and no horizontal overflow were checked; this is not full WCAG or
  staff/client native parity certification.

All seven pp37–38 flagship sequences remain unverified end to end:

| Journey                                  | Required durable outcome still missing                                                                                                                             | Modules                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| Revised order to reviewed work           | Correct matter/version, source-located facts, coherent reviewed task/date/publication proposals, authorized execution, sync and visible failures                   | M02–M06,M08,M12–M16         |
| Document request to complete next step   | Structured request/items, upload receipt, extraction exceptions, staff completeness, configured reminders, confirmed workflow and published next step              | M04–M08,M13,M16             |
| Voice memo to coordinated follow-through | Preserved audio/note, grouped matter/task/date/time drafts, confirmed duration, reviewed commands, native offline retry without repeats                            | M04–M06,M08,M09,M12,M13,M15 |
| Explainable blocker detection            | Current next step, owner, prerequisites and external requests; distinguish missing facts/overdue action; resolve/reassign/explain override                         | M06–M08,M12,M13,M15         |
| Verified activity to client update       | Reviewed change/next action/date/client/cost facts, staff-approved publication, same published record on client web/native                                         | M05,M08,M10–M13,M16         |
| Actual work to accurate billing          | Confirmed activity/deduplication, reviewed fee/narrative/expense/write-downs, durable invoice/delivery, provider outcomes and single allocation, accurate balances | M09–M11,M13,M15,M16         |
| Preparation and handoff brief            | Current reader-authorized facts, changes, obligations, gaps/discrepancies and source links                                                                         | M02,M04–M06,M08,M12–M15     |

Remaining pp39–40 scenario families also include nationwide non-court/agency/multi-
jurisdiction profiles, workflow repeat/interrupt/upgrade/override/changed-order,
upload/scan/version/share/signature failures, all fee models/receivable math,
payment refunds/disputes/replays/client allocation, independent reconciliation,
AI injection/staleness/contradictions/citations, expired integration/backfill,
wrong-recipient/delivery/reminder/approval failures, app-kill/offline/revoked caches,
client invitation/request/signature/message/payment parity, migration reconciliation,
50-lawyer load and later receptionist consent/transfer/access cases. None is claimed
complete because firm Settings works.

## M00-S01 verification commands and results (prior session)

Final local verification is complete. The security audit remains a failing release
gate; no check was disabled. Remote GitHub CI has not been run.

| Command                                                                                                                                                  | Result                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm supabase start`                                                                                                                                    | PASS local stack started                                                                                                                                                                                                       |
| `pnpm --filter @lawfirm/db db:generate`                                                                                                                  | PASS generated SQL/snapshot                                                                                                                                                                                                    |
| `pnpm supabase migration up --local`                                                                                                                     | PASS additive upgrade of existing local schema                                                                                                                                                                                 |
| `pnpm supabase migration repair 20261006030000 --status reverted --local`, then `pnpm supabase migration repair 20261006002400 --status applied --local` | PASS corrected only this session's unpublished companion timestamp, no business-data change                                                                                                                                    |
| `pnpm supabase migration list --local`                                                                                                                   | PASS August history plus 20261006002359/20261006002400 match local applied history                                                                                                                                             |
| `pnpm --filter @lawfirm/db db:check`                                                                                                                     | PASS snapshot history valid                                                                                                                                                                                                    |
| `pnpm --filter @lawfirm/db test`                                                                                                                         | PASS 15 tests; actual PostgREST isolation, clean temporary DB, old-schema upgrade preserving firms/settings, empty-history down/reapply and refusal to discard audit history                                                   |
| `pnpm --filter @lawfirm/api test:integration`                                                                                                            | PASS all 6 tests after restoring the permission guard                                                                                                                                                                          |
| `pnpm --filter @lawfirm/api... build`                                                                                                                    | PASS exact CI build command                                                                                                                                                                                                    |
| `pnpm --filter @lawfirm/api-client exec openapi-typescript http://127.0.0.1:3300/openapi.json -o src/generated/schema.d.ts`                              | PASS generated from running API, then repository formatting                                                                                                                                                                    |
| `pnpm typecheck`                                                                                                                                         | PASS all 15 tasks, including staff native, worker and strict API-client consumer types                                                                                                                                         |
| `pnpm --filter @lawfirm/web exec tsc --noEmit -p tsconfig.contracts.json`                                                                                | PASS; removing the built OpenAPI declaration made this check FAIL with TS2307; restored declaration passed                                                                                                                     |
| `pnpm --filter '!@lawfirm/db' test`                                                                                                                      | PASS 36 tests: core 12, API 4, staff web 20                                                                                                                                                                                    |
| `pnpm lint`                                                                                                                                              | PASS                                                                                                                                                                                                                           |
| `pnpm format:check`                                                                                                                                      | PASS all matched files; earlier formatting failures corrected                                                                                                                                                                  |
| `pnpm build`                                                                                                                                             | PASS all 9 tasks; unrelated landing metadataBase warning remains                                                                                                                                                               |
| `node apps/api/test/firm-settings.browser.mjs`                                                                                                           | PASS real local auth/API/DB; loading, save/reload, lost-response retry, preserved draft/conflict review, read-error retry, current role/revocation, responsive/AX checks; final run also passed against rebuilt API/current UI |
| `pnpm audit --audit-level high --json`                                                                                                                   | FAIL exit 1: 32 high, 15 moderate, 1 low, 0 critical; pre-existing external graph, release blocker                                                                                                                             |
| Review mutation: `pnpm --filter @lawfirm/api test:integration -t 'reads the current firm'`                                                               | Baseline PASS; inverted permission guard made expected 403 return 200 and test FAIL; original guard restored immediately; final full suite passed                                                                              |

Tests first failed on real stale-JWT reads/refresh, permissive actor/expiry checks,
missing HTTP routes, missing client transport and NUL-name validation. Their fixes
were tested instead of weakening assertions. Type errors came from unvalidated
response parsing, indexed-array narrowing and Supabase ReturnType inference; fixed
with schemas/narrowing and an explicit SupabaseClient type. Browser input selection
and hydration readiness were corrected in the test harness. No tests were deleted
or skipped in the normal full suites. Focused filters were used only during development.

Final package review also found that tsc did not copy the OpenAPI .d.ts input into
dist. A conditional type assertion alone was insufficient under skipLibCheck;
the focused consumer tsconfig now checks dependency declarations. Reproducing the
missing built artifact fails with TS2307, and restoring/building it passes.
The client build copies the declaration, and staff typecheck enforces this gate
without changing the repository's existing framework declaration settings.

## Skills applied

| Workflow                           | Application                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| @context-engineering               | Read instructions, installed stack, full PDF and actual implementation before selecting work       |
| @planning-and-task-breakdown       | Dependency matrix and a few vertical tasks in this tracker                                         |
| @incremental-implementation        | One real existing-firm command through DB/API/contracts/staff web; whole modules stay partial      |
| @test-driven-development           | Meaningful red authorization/HTTP/contract/transport tests, then fixes                             |
| @api-and-interface-design          | Bounded typed command, revision/idempotency/error contract and provider-independent client         |
| @source-driven-development         | Installed versions and official Postgres/Nest/Supabase/Zod/Next/CDP documentation                  |
| @frontend-ui-engineering           | Existing Clepso components/tokens, accessible form and real interaction states                     |
| @browser-testing-with-devtools     | Isolated browser inspection/security workflow; direct CDP fallback because MCP is unavailable      |
| @security-and-hardening            | Verified claims, live membership/roles, forced RLS, denied client writes, safe logs and revocation |
| @debugging-and-error-recovery      | Diagnosed type/build/test-harness failures and corrected causes                                    |
| @deprecation-and-migration         | Additive schema, fixture Settings isolation, clean/upgrade/down/history-preservation checks        |
| @documentation-and-adrs            | Material boundaries/tradeoffs recorded in DECISIONS; no duplicate spec                             |
| @observability-and-instrumentation | Correlated safe request/command outcomes and durable pending-event evidence                        |
| @code-review-and-quality           | Five-axis review, draft/cache corrections and deliberate authorization mutation check              |
| @git-workflow-and-versioning       | Session-start diff snapshot, focused edits and preserved unrelated changes; no staging/commit      |
| @ci-cd-and-automation              | New API integration suite joins the existing Supabase CI gate                                      |

## Next dependency-ready work

M00-S03d reviewed replacement checks, M01-S01 live staff context and M01-S02
first-firm provisioning are locally implemented and verified. The next slice is
M01-S03: durable staff invitations with verified-account acceptance, live role
authorization and truthful delivery state; then explicit active-firm selection,
matter grants and revocation.
M00 remains partial: wider failed-work search/metrics, production monitoring,
dependency remediation and staging restoration/load/recovery gates stay open.
M02/M18 universal profiles/contacts/parties/matters follow those authorization
prerequisites, then M03 adapters and M04 controlled versioned documents.

### Runtime evidence and preservation

The API was run from its final build with local Supabase/database configuration,
`PORT=3300`, and `CORS_ALLOWED_ORIGINS=http://localhost:3100,http://127.0.0.1:3100`:
`node apps/api/dist/main.js`. Staff web used `NEXT_PUBLIC_PREVIEW=0`, local Supabase
public configuration and `NEXT_PUBLIC_API_URL=http://127.0.0.1:3300`:
`pnpm --filter @lawfirm/web dev`. An isolated headless Chrome profile used
`--remote-debugging-port=9223`; the scripted test exercised actual forms and HTTP
commands. Test-created memberships/firms/users/receipts/outbox rows were cleaned up;
immutable test audit rows survive until an explicit local reset. The disposable
migration database was dropped. No personal browser profile was used.
The isolated Chrome process was closed after verification; local API, staff web
and Supabase remain running for inspection.

Screenshots: [loading](evidence/m00-s01/loading.png),
[owner profile](evidence/m00-s01/owner.png), [conflict](evidence/m00-s01/conflict.png),
[read error](evidence/m00-s01/error.png), [mobile read-only](evidence/m00-s01/mobile-readonly.png).
These show the still-mock surrounding shell; only firm Settings is durable.

Five-axis review found and corrected draft replacement on background refresh and
cached-data retention after permission denial. Permission-guard mutation was
detected by the integration test. Queries, payloads, timeouts and API responses
are bounded; production telemetry/session/backup gates remain tracked above.
The 14 unrelated pre-existing tracked edits are byte-identical to the initial
snapshot. Original CI content is preserved; the only lockfile change since that
snapshot is the web's workspace API-client link. Untracked landing/design/product
work was not edited. No changes were staged or committed.

Next session: read this tracker and verify actual code/Git state. Use M00/M01's
relevant module pages and pp39–40 gates; continue the remaining M00-S03 tasks without reconstructing
the specification or repeating the complete PDF audit.

## Previous slice: M00-S02 — durable dispatch and execution

Functionally implemented and verified locally on October 6, 2026. M00/M01/M15
remain partial; the dependency audit still blocks release. No other module or
platform is complete, and M22 remains untouched.

Outcome: the existing firm-name command now reaches a recoverable background
execution receipt. An owner/admin can inspect its truthful current state through
the API. A committed event can survive interrupted dispatch, lost queue state,
expired leases and replay. This internal receipt sends no provider request and
makes no external delivery claim. The staff Settings interface remains the M00-S01
form; operational dashboard UI and native/client consumption remain unimplemented.

Prerequisites: M00-S01's atomic command/receipt/audit/outbox and live M01 membership.
Records: additive job_executions; outbox dispatch lease/error metadata and query
indexes. Permissions: server-only forced-RLS execution tables, current owner/admin
membership and source revision at execution, owner/admin-only inspection of explicitly
allowlisted firm events. Neither Redis nor a claimed role supplies authorization.

Blueprint evidence: p11 committed-event/dispatch interruption recovery; p12 and p39
current membership/capabilities; p40 queue failure/failed work/DB transaction failure
without apparent completion. Runtime and tests exercise this small internal path,
not the entire module gate or any of the seven flagship journeys.

Completed tasks:

1. [x] Add execution/lease records while preserving old commands and pending events;
       verify clean/upgrade/down/reapply and refusal to discard job evidence.
2. [x] Bound dispatch/processing, fence concurrent claims and stale executors, retain
       retries/failures, recover Redis state loss and revalidate access/revisions.
3. [x] Add an allowlisted inspection API/shared client, real Redis tests/CI, runtime
       and browser evidence, and review the full slice.

Changed paths this session:

- Worker: `apps/worker/src/{main,execution,queue,config,config.test}.ts`,
  `test/{database.ts,execution.integration.test.ts,queue.integration.test.ts}`,
  `vitest{,.integration}.config.ts`, `tsconfig.test.json`, `package.json`, `README.md`.
- Database: `packages/db/src/schema/execution.ts`, `test/migrations.test.ts`;
  `supabase/migrations/20261006013633_dry_nebula.sql`,
  `20261006013634_job_execution_security.sql`, `20261006014446_cold_lizard.sql`,
  their two generated snapshots/journal entries;
  `supabase/rollbacks/20261006_job_execution.sql`. Applied earlier migrations are
  unchanged. The rollback refuses to discard execution evidence.
- Contracts/API: `packages/core/src/schemas/execution{,.test}.ts`, `src/index.ts`;
  `apps/api/src/modules/firms/firm.{controller,dto,service}.ts`,
  `test/firm-command.integration.test.ts`, `test/firm-settings.browser.mjs`;
  `packages/api-client/src/{index.ts,generated/schema.d.ts}`;
  `apps/web/src/lib/firm-api{.test,.type-test}.ts`.
- CI: `.github/workflows/ci.yml` adds local Redis and the worker integration gate
  without removing existing checks. The worker manifest links existing postgres
  and Vitest versions; `pnpm-lock.yaml` preserves the original external graph
  except the separate proxy-address patch.
- Security correction: `apps/api/src/common/auth/proxy-trust.test.ts`,
  `pnpm-workspace.yaml` and `pnpm-lock.yaml`; D006 records the single-version
  patch, source review, old-version failure and fixed-version verification.
- Evidence/docs: this tracker, `DECISIONS.md` D005/D006, and
  `evidence/m00-s02/worker-runtime.jsonl` and
  `evidence/m00-s02/{loading,owner,conflict,error,mobile-readonly}.png`.

Verification:

| Command                                                                                                                                                            | Final outcome                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @lawfirm/db db:generate`                                                                                                                            | PASS, additive SQL/snapshots; August/M00-S01 history retained                                                                            |
| `pnpm supabase migration up --local`                                                                                                                               | PASS, all three new migrations applied without resetting local data                                                                      |
| `pnpm supabase migration list --local`                                                                                                                             | PASS, all seven local/applied timestamps match                                                                                           |
| `pnpm --filter @lawfirm/db db:check`                                                                                                                               | PASS                                                                                                                                     |
| `pnpm --filter @lawfirm/db test`                                                                                                                                   | PASS 15; RLS and clean/upgrade/down/reapply/history-refusal checks                                                                       |
| `pnpm --filter @lawfirm/worker test:integration`                                                                                                                   | PASS 17; disposable Postgres DBs and real Redis, no skipped cases                                                                        |
| `pnpm --filter @lawfirm/api test:integration`                                                                                                                      | PASS 9; bounded/status-only inspection, current capability/revocation/cross-firm denial plus prior command gates                         |
| `pnpm --filter '!@lawfirm/db' test`                                                                                                                                | PASS 41: core 14, API 5, web 21, worker 1                                                                                                |
| `pnpm typecheck`                                                                                                                                                   | PASS 15 tasks, including native/worker tests and strict client declaration checks                                                        |
| `pnpm lint`                                                                                                                                                        | PASS                                                                                                                                     |
| `pnpm format:check`                                                                                                                                                | PASS                                                                                                                                     |
| `pnpm build`                                                                                                                                                       | PASS 9 tasks; existing landing metadataBase warning remains                                                                              |
| `pnpm --filter @lawfirm/api test src/common/auth/proxy-trust.test.ts`                                                                                              | PASS after patch; 2.0.7 first failed by trusting an unrelated IPv4 peer                                                                  |
| `pnpm audit --audit-level high --json`                                                                                                                             | FAIL exit 1: 34 high, 16 moderate, 1 low, 0 critical after patch                                                                         |
| `env RUN_WORKER=1 REDIS_URL=redis://127.0.0.1:6389 BROWSER_ARTIFACT_DIR=/private/tmp/clepso-m00-s02-iqzikemh/browser node apps/api/test/firm-settings.browser.mjs` | PASS actual sign-in/save/lost-response replay/outbox/Redis/result/inspection, plus prior conflict/error/revocation/mobile/AX checks      |
| `node /private/tmp/clepso-m00-s02-iqzikemh/runtime-probe.mjs`                                                                                                      | PASS built worker on disposable DB: correlated receipt, invalid envelope rejection, no private-name/email logs, graceful shutdown exit 0 |
| Review mutation: `pnpm --filter @lawfirm/worker test:integration -t 'blocks downgraded'`                                                                           | Role inversion made the test FAIL; source restored and full 17-case suite passed                                                         |
| `git diff --check`                                                                                                                                                 | PASS                                                                                                                                     |

Total: 82 passing tests plus browser and built-worker runtime checks. Remote GitHub
CI and production/staging recovery were not executed.

Meaningful initial failures covered the missing processor, HTTP inspection routes,
shared transport method and vulnerable proxy matching. Test response.json() values
were explicitly parsed with the authoritative schema; an array entry was narrowed
before key inspection. No type suppression, weakened expectation or skipped full
suite was introduced. The first review-mutation filter selected the revocation
case, which does not exercise role matching; the correct downgrade case detected
the role mutation. No product assertion was changed to make the mutation pass.

Five-axis review checked bounded claims/queries, lease fencing and lock order,
current authority, safe fields/logs, source schema validation, explicit terminal
outcomes, migration retention and dependency provenance. Tests and runtime verified
new behavior. Query indexes were added for firm inspection/recovery; representative
history/load query-plan measurement remains unverified.

Skills read/applied this session:

| Skill                              | Why it applied                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| @context-engineering               | Tracker, actual dirty state, repository instructions, worker/schema/API and relevant PDF pages              |
| @git-workflow-and-versioning       | Session-start hashes/diff, narrow edits, preservation; no staging/commit/merge/deploy                       |
| @planning-and-task-breakdown       | Three dependency-ordered tasks in this existing tracker                                                     |
| @incremental-implementation        | One bounded event path, first contracts/tests, then worker and inspection                                   |
| @test-driven-development           | Red processor/HTTP/transport/security regression, durable outcome and failure tests                         |
| @api-and-interface-design          | ID-only queue boundary and allowlisted typed inspection/OpenAPI contract                                    |
| @security-and-hardening            | Current membership/source checks, server-only records, untrusted queue validation and dependency correction |
| @source-driven-development         | Installed BullMQ/ioredis/Postgres APIs, official connection/idempotency/locking and patch docs              |
| @deprecation-and-migration         | Additive schema, pending-event preservation, safe down path, replacement of heartbeat skeleton              |
| @observability-and-instrumentation | Correlated safe job/dispatch outcomes, runtime verification and operational first checks                    |
| @documentation-and-adrs            | D005 recovery tradeoffs/runbook and D006 security patch; no duplicate product specification                 |
| @ci-cd-and-automation              | Worker recovery/Redis suite joins the existing blocking Supabase CI job                                     |
| @debugging-and-error-recovery      | Localized response typing/index narrowing and corrected mutation filter                                     |
| @code-review-and-quality           | Five-axis review, authorization mutation, dependency diff and preservation checks                           |
| @browser-testing-with-devtools     | Actual browser-to-worker regression with isolated Chrome; direct CDP because DevTools MCP is unavailable    |

Remaining cases: manual failed-work resolution, per-attempt operational history,
long-running/provider processors, job dashboard UI, RED/USE metrics/traces/alerts,
staging queue/outage/backup drills, 50-lawyer scale and every full connected journey.
Provider credentials/contracts, jurisdiction validation, pilot evidence and native/
client parity remain external or subsequent gates. No M22 architecture was selected.

Preservation: session-start hash comparison found no removed file and only the
listed slice/shared/tracker/security paths modified. Prior staff layout/design,
landing, money/duration and earlier migration edits remain intact. No files were
staged or committed, and no merge/deployment was performed.

Runtime cleanup: browser-owned workers and the disposable runtime probe stopped
cleanly. The isolated Chrome profile and test Redis container are closed after
verification; local Supabase, staff web (:3100) and the rebuilt patched API (:3300)
remain available. Start the worker with explicit DATABASE_URL/REDIS_URL as documented
in `apps/worker/README.md`; no production service was activated.

## Previous slice: M00-S03a — staff background-work inspection

Implemented and verified locally October 6, 2026. M00/M01/M15 remain partial. Outcome: an owner/admin
can inspect the latest 20 authorized firm-profile checks from live Settings,
understand pending/failed/blocked outcomes and explicitly refresh the read.
The shared execution contract/API and durable records already exist (M00-S02).
No business write, provider action, migration or privileged client key is needed.

Permissions/risks: live API capability checks remain authoritative; actor/firm
scoped cache, denial clears visible data, context changes cancel/remove queries.
Untrusted/malformed responses fail visibly instead of appearing empty/successful.
Manual job retry, resolution, readiness and per-attempt history remain later tasks.

Blueprint: p11 structured monitoring/job dashboards; p12 revocation including
local caches; p26 staff loading/error/permission/accessibility; pp39–40 capability
and failed-service cases. This is only the existing internal firm-profile path,
not a completed module or flagship journey.

Tasks/checkpoints (existing tracker is the planning target):

1. [x] Add failing read-boundary/presentation tests, validate the shared contract,
       map truthful states/reasons without provider-delivery claims. Verify focused
       web tests; touch the new firm-executions helper/tests only.
2. [x] Add a focused accessible panel using Clepso components, authenticated client
       and existing firm context/cache namespace. Verify types and live Settings
       with loading/empty/error/denied, refresh, revocation and mobile states.
3. [x] Extend actual browser regression for durable outcomes/current-role denial
       and responsive/keyboard/AX states; run applicable checks, review diff and
       mutation, document results and next task. Preserve all session-start edits.

Deferred M00-S03 tasks: DB/queue/worker readiness; retained attempt history and
bounded audited recovery commands; metrics/staging backup/outage drills.

Changed paths in M00-S03a:

- `apps/web/src/features/settings/FirmBackgroundWork.tsx` and its scoped `.module.css`: permission-filtered, read-only operational panel.
- `apps/web/src/features/settings/firm-executions.ts` and `.test.ts`: validated read boundary and exhaustive state/error presentation; eight tests.
- `apps/web/src/features/settings/LiveFirmSettings.tsx`: mount only for the current owner/admin hint and invalidate inspection after a saved command. The API is the authority.
- `apps/api/test/firm-settings.browser.mjs`: real worker result in Settings, seeded DB-state presentation, warm-cache denial, read-only refresh, keyboard/AX and viewport checks.
- `apps/web/README.md`, this tracker, `DECISIONS.md` D007 and seven `evidence/m00-s03a/*.png` screenshots.

No migration, wire schema, API implementation, worker processor, dependency/lockfile
or CI change was required; M00-S02's generated client and authoritative contract are
reused by this slice. Native consumption and platform parity are still future work.

Verification commands and outcomes:

| Command                                                                                                                                                                                                 | Outcome                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm --filter @lawfirm/web test src/features/settings/firm-executions.test.ts`                                                                                                                         | RED missing module, then GREEN 8 tests; restored-source GREEN after review mutation                   |
| `pnpm --filter @lawfirm/web typecheck`                                                                                                                                                                  | PASS                                                                                                  |
| `pnpm typecheck`                                                                                                                                                                                        | PASS 15 tasks, including shared/native contracts                                                      |
| `pnpm --filter '!@lawfirm/db' test`                                                                                                                                                                     | PASS 49: core 14, API 5, web 29, worker 1                                                             |
| `pnpm --filter @lawfirm/api test:integration`                                                                                                                                                           | PASS 9: includes current capability/revocation/cross-firm denial, event allowlist and 20-result bound |
| `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/worker test:integration`                                                                                                                   | PASS 17, real Redis and disposable Postgres                                                           |
| `pnpm --filter @lawfirm/db test`                                                                                                                                                                        | PASS 15; tenant isolation and clean/upgrade/down/reapply checks; no schema changes                    |
| `pnpm build`                                                                                                                                                                                            | PASS 9 tasks; repeated after final CSS adjustment; existing landing metadataBase warning              |
| `pnpm lint`                                                                                                                                                                                             | PASS; final verification completed after browser formatting                                           |
| `pnpm format:check`                                                                                                                                                                                     | PASS                                                                                                  |
| `pnpm audit --audit-level high --json`                                                                                                                                                                  | FAIL exit 1: 34 high, 16 moderate, 1 low, 0 critical; graph unchanged                                 |
| `env RUN_WORKER=1 REDIS_URL=redis://127.0.0.1:6389 BROWSER_ARTIFACT_DIR=/var/folders/np/k8cp22194s7g4208dsj7wvgm0000gp/T/clepso-m00-s03a-mq3mcsv9/browser node apps/api/test/firm-settings.browser.mjs` | PASS final stricter viewport check and save-triggered invalidation                                    |
| Review mutation: remove 403 from the new read's denial branch and run its focused suite                                                                                                                 | FAIL at warm-access denial test; source restored in finally and all 8 passed                          |
| `git diff --check`                                                                                                                                                                                      | PASS                                                                                                  |

The initial browser RED demonstrated the missing panel. Subsequent harness failures
were localized to mixed preflight/profile holds, offscreen coordinate clicks and
missing Enter virtual-key/text fields; the harness now uses sequential inspection
holds, CDP scroll-into-view and a complete native key event. No UI assertion was
removed to get past those failures.

Visual review caught an overly permissive viewport assertion (`scrollWidth <=
innerWidth` can pass after Chrome autoscaling) and a screenshot during the sidebar
transition. The new panel's assertion waits for the rail to settle and requires its
right edge to fit the requested viewport and its scroll width to fit its client
width at 320/768/1024/1440. Its refresh control wraps and expanded references break
within the row. This validates the new panel, not all of the existing staff shell.

PDF scenarios exercised: p11 inspection/tracing of the existing internal request;
p12/p39 current permission denial, including warm visible results and the existing
API cross-firm/matter-event exclusion tests; p26 loading/empty/error/permission/
responsive/keyboard/AX states; p40 failed reads and unfinished processing remain
visible as such. Real browser save/response-loss retry/Redis/worker completion is
end-to-end. Pending/retry/running/blocked/failed UI cases use deliberately controlled
test-owned Postgres records with future eligibility, read through the actual API.
Those UI fixtures do not establish provider delivery or a complete recovery journey.

Review: five axes checked. The existing authenticated client/session namespace is
reused; all external response data passes strict Zod validation; no server error
text/payload/result is rendered. 401/403 returns a new denial value, replacing
authorized data. The panel hides old rows while checking or on any failure, uses
zero cache retention after unmount, and refresh invokes only GET. Queries/list DOM
remain bounded at 20. Styles/components are scoped to this feature; no design tokens,
money/duration conventions, business writes or migration history are changed.

Skills read/applied:

| Skill                          | Application                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| @using-agent-skills            | Select only the relevant phase/risk workflows                                                    |
| @context-engineering           | Actual tracker/dirty state, source and relevant original PDF pages                               |
| @git-workflow-and-versioning   | Session-start hashes/diff; preserve pre-existing edits without staging                           |
| @planning-and-task-breakdown   | Three ordered tasks/checkpoints in this tracker                                                  |
| @incremental-implementation    | One recent-firm-check path through the existing durable service                                  |
| @test-driven-development       | Red boundary/browser tests, green outcomes and mutation proof                                    |
| @api-and-interface-design      | Reuse generated/shared contracts; validate the read boundary                                     |
| @security-and-hardening        | Current server authority, denial/cache handling and untrusted responses                          |
| @frontend-ui-engineering       | Clepso list/card/pill controls, truthful states, scoped wrapping and accessible interaction      |
| @source-driven-development     | Installed Next 16.3.6/React 19.2.8/Query 5.104.0, shipped Next guide and official Query/CDP APIs |
| @browser-testing-with-devtools | Isolated Chrome/direct CDP fallback; no DevTools MCP is available                                |
| @debugging-and-error-recovery  | Localize SDK extraction/tool failures and browser preflight/scroll/key/viewport issues           |
| @code-review-and-quality       | Five-axis review and denial mutation test                                                        |
| @documentation-and-adrs        | D007 cache/read policy, README and this evidence record                                          |

Remaining gates: full failed-work search/pagination, per-attempt history, audited
resolution/retry, readiness/telemetry, representative performance/50-lawyer scale,
full staging queue/DB/backup recovery, every flagship and native/client parity.
Automated axe/VoiceOver and all surrounding shell layouts were not verified. The
current shell may autoscale at very narrow widths outside this panel's bounds;
that remains M15 work. Provider credentials/contracts, validated jurisdictions and
pilot/staging evidence remain external prerequisites. M22 remains untouched.

Next dependency-ready slice is M00-S03b readiness, followed by retained attempts
and authorized recovery; then M01 provisioning/invites/context and matter grants.
No external credentials are required for the next local slice.

Total verified tests: 90 (49 unit, 9 API integration, 17 worker integration and
15 database tests), plus the actual browser journey. Remote CI, staging/deployment
and provider services were not activated. Session-start preservation verification found only the listed feature/test/docs
paths modified, with no deleted file. The lockfile, prior migrations, unrelated
UI/design/landing and earlier changes are byte-identical to the initial snapshot.
No files were staged, committed, merged or deployed. Browser-owned workers stopped
cleanly and test-owned DB records were removed (immutable command audits retained).
The isolated Chrome profile and temporary Redis are closed after verification;
local Supabase, staff web (:3100) and API (:3300) remain available.

## Previously completed local slice: M00-S03b — processing availability

Scope: current owner/admin can inspect a live, bounded availability snapshot in
Settings. Existing firm-profile reads/commands and M00-S02 dispatch are prerequisites.
No business records or permissions change; reads recheck current membership and
capability before and after infrastructure probes. No provider delivery or manual
job retry is introduced. PDF p11 health/readiness; p12/p39 authorization/revocation;
p26 protected staff states; p40 queue/database outage and truthful unfinished work.

Tasks, in dependency order:

1. [x] Strict shared readiness contract; expiry/unknown/failure tests establish RED.
2. [x] Existing worker publishes short-lived operational evidence only after a
       successful bounded DB poll and live consumer/queue checks; API probes privately,
       denies absent/revoked/cross-firm authority, and exposes allowlisted states only.
3. [x] Generated client and live staff Settings show availability, timestamps,
       unavailable/stale/error/denied states and read-only refresh. No cached ready
       result survives expiry, failed reads or context/revocation checks.
4. [x] Focused and broader checks, real Redis/DB/API/browser failure recovery,
       diff/security review, exact evidence and remaining gates recorded.

Design constraints: operational heartbeat is ephemeral evidence, never job/business
state; Postgres remains authoritative. No new business tables or migration required.
API/worker must share the deployment's private Redis and database connection target.
No raw endpoint, credentials, provider payload or other firm's data reaches staff.
Probe failures cannot report ready, manufacture an empty history, or retry work.

Implemented and locally verified; the repository dependency-security gate remains
failing. M00, M01 and M15 remain partial; no module/core release is complete.
The prior preview domains, native/client gaps and deferred M22 classification remain.

Changed paths:

- API: `apps/api/src/modules/firms/{firm.controller,firm.dto,firm.module,firm.service}.ts`,
  `processing-readiness.service.ts`, `processing-readiness.service.test.ts`;
  `apps/api/test/{firm-command.integration.test.ts,processing-readiness.integration.test.ts,firm-settings.browser.mjs}`;
  `apps/api/package.json`, `apps/api/.env.example`.
- Worker: `apps/worker/src/{main.ts,readiness.ts,readiness.test.ts}`,
  `apps/worker/README.md`. Existing dispatch/execution business behavior remains.
- Contracts: `packages/core/src/{index.ts,schemas/readiness.ts,schemas/readiness.test.ts}`;
  `packages/api-client/src/{index.ts,generated/schema.d.ts}`. OpenAPI response DTO,
  authenticated generated-client read, expiry/contradiction validation; no breaking
  change to existing firm reads/commands or job-envelope contracts.
- Server namespace: `packages/db/src/{index.ts,readiness.ts}`, `packages/db/test/readiness.test.ts`,
  `packages/db/package.json`, `packages/db/tsconfig.json`. No migration/schema/history
  modification. Node types support the shared server-only hashing helper.
- Web: `apps/web/src/features/settings/{ProcessingAvailability.tsx,processing-readiness.ts,processing-readiness.test.ts,LiveFirmSettings.tsx}`;
  `apps/web/src/lib/{firm-api.test.ts,firm-api.type-test.ts}`, `apps/web/README.md`.
  Reuses existing scoped background-work CSS, components and protected query namespace.
- `pnpm-lock.yaml`: only API ioredis 6.0.0 and DB @types/node 26.2.0 importer references;
  zero external version/transitive graph changes from the session-start lockfile.
- Tracker/decision: this file and `docs/implementation/DECISIONS.md` D008.
  Runtime screenshots in `docs/implementation/evidence/m00-s03b/`.

Verification commands and results:

| Command                                                                                                                                                                                                               | Result                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --offline --ignore-scripts`                                                                                                                                                                             | PASS; no downloads/new versions or lifecycle scripts; existing peer/deprecation warnings retained                                                                                                       |
| `pnpm --filter @lawfirm/core test src/schemas/readiness.test.ts`                                                                                                                                                      | PASS, 3 tests; initial missing implementation RED; expiry-boundary mutation fails and original restored                                                                                                 |
| `pnpm --filter '!@lawfirm/db' test`                                                                                                                                                                                   | PASS, 60 tests: core 17, API 7, web 34, worker 2                                                                                                                                                        |
| `REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/api test:integration`                                                                                                                                        | PASS, 15 tests; absent/cross-firm/current-role/revoked access, revocation during probe, expired revalidation evidence, response no-store/no business writes, actual Redis and refused DB connection     |
| `REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/worker test:integration`                                                                                                                                     | PASS, 17 tests; real Redis plus disposable databases, existing dispatch/replay/crash/revocation/source/retry gates preserved                                                                            |
| `pnpm --filter @lawfirm/db test`                                                                                                                                                                                      | PASS, 16 tests; 14 tenant/RLS tests, clean/upgrade/rollback/reapply/history-preservation migration test, server namespace isolation test                                                                |
| `pnpm typecheck`                                                                                                                                                                                                      | PASS, 15 tasks including native/shared/generated contracts                                                                                                                                              |
| `pnpm lint`                                                                                                                                                                                                           | PASS; no suppressions introduced                                                                                                                                                                        |
| `pnpm build`                                                                                                                                                                                                          | PASS, 9 tasks; existing landing metadataBase warning remains                                                                                                                                            |
| `pnpm format:check`                                                                                                                                                                                                   | PASS                                                                                                                                                                                                    |
| `pnpm audit --audit-level high --json`                                                                                                                                                                                | FAIL, exit 1: 34 high, 16 moderate, 1 low, 0 critical; identical counts to the prior baseline, unresolved release blocker                                                                               |
| `RUN_WORKER=1 REDIS_URL=redis://127.0.0.1:6389 READINESS_REDIS_CONTAINER=clepso-m00-s03b-redis BROWSER_ARTIFACT_DIR=/private/tmp/clepso-m00-s03b-lv5l_gej/browser-final node apps/api/test/firm-settings.browser.mjs` | PASS; actual final-build API, local Supabase, real Redis/worker and isolated Chrome CDP; queue pause/unpause, worker stop/expiry/restart, loading/error/malformed/revoked/keyboard/AX/responsive states |
| `git diff --check`                                                                                                                                                                                                    | PASS                                                                                                                                                                                                    |

Total passing tests: 108, plus the real browser journey. Focused RED tests also
caught an expired observation causing a 500 after final access revalidation, and
missing response Cache-Control. Both now pass without relaxing validation.
The API integration test initially read process REDIS_URL while simulating an
unconfigured service; explicit empty test configuration fixes that isolation.
The DB utility exposed absent Node type declarations; its existing-version dev
reference/types resolve the compiler error. No check or assertion was disabled.
A targeted Prettier command included .env.example (unsupported parser); configuration
stays ordinary env text, and the actual repository format gate is run separately.

PDF scenarios exercised: p11 bounded operational inspection/readiness; p12/p39
current firm/capability checks and cross-firm/revocation, including during network
I/O and warm UI data; p26 loading/error/invalid/expired/denied/keyboard/AX/responsive
states; p40 actual test Redis pause/unpause, worker stop/expiry/restart and failed
DB access without invented successful processing. The existing browser command →
Postgres/outbox → Redis → durable worker result continues to pass. Controlled
Postgres UI records exercise other statuses and do not prove provider delivery.
No provider, full staging DB outage/backup restoration, pilot, load or native/client
journey is claimed. The new panel is bounded at 320/768/1024/1440; the surrounding
preview shell and automated axe/VoiceOver remain unverified M15 work.

Review: correctness/readability/architecture/security/performance checked. Bounded
Redis commands, parameterized DB authorization, no locks during network probes,
no-store response, fresh permission checks, strict allowlisted wire data and no
raw Redis errors/URLs/instance IDs/tenant records in the UI. Existing request IDs,
HTTP duration/status and safe availability-state logs are retained. Aggregate
RED/USE metrics, traces, alert sinks and deployment-ready probes remain M00 gates.
One expiry comparison was mutated from >= to >; the exact-boundary test failed,
the original bytes were restored and focused tests passed.

Skills read/applied: @using-agent-skills and @context-engineering for narrow current
context; @git-workflow-and-versioning for preservation/reviewable uncommitted work;
@planning-and-task-breakdown and @incremental-implementation for the tracked vertical
slice; @test-driven-development for failing expiry/access/probe tests;
@api-and-interface-design and @security-and-hardening for current authorization and
shared contracts; @observability-and-instrumentation for operational questions and
safe evidence; @source-driven-development for installed BullMQ/ioredis/Next APIs;
@frontend-ui-engineering and @browser-testing-with-devtools for protected Clepso UI
and real isolated CDP verification (MCP unavailable); @debugging-and-error-recovery
for build/config/expiry/native-click investigation; @code-review-and-quality for
five-axis review and mutation; @documentation-and-adrs for D008 and current runbooks.
No duplicate skill planning docs or blueprint rewrite; no sub-agents used.

Next slice: M00-S03c retained execution attempts followed by authorized audited
recovery; M01 provisioning/invites/context remains the next domain prerequisite.
The next local slice requires no external credentials. Provider contracts/credentials,
validated jurisdiction policy, staging restore, pilot evidence and native distribution
remain unestablished external prerequisites. M22 stays deferred without architecture
or provider selection. Final runtime cleanup/preservation evidence follows below.

Final runtime/preservation: the final browser run passed with the final API build,
including fresh-page native input assertions, actual Redis pause/unpause, stopped
worker expiry, restored worker evidence, both read-only keyboard controls and seven
saved screenshots. Test-owned workers drained/stopped, temporary business records
were removed (immutable audit evidence retained), and paused Redis was always resumed
before the test-owned container was stopped/removed. Isolated Chrome :9223 closed;
its endpoint is no longer listening. Existing local Supabase and staff web :3100
remain; the refreshed API :3300 remains available. Redis :6389 was test-owned and
is now stopped, so the API truthfully reports queue unavailable until Redis is run.
No production/staging/provider runtime was activated.

All 759 session-start files remain. Hash verification found exactly 23 intended
pre-existing paths changed and no removed/unrelated path; prior migrations and
unrelated UI/design/landing edits are preserved. No file was staged, committed,
merged or deployed. Generated declarations needed the ordinary Prettier pass; the
repository format check now passes. Full command logs, mutation evidence and
preservation manifest are in /private/tmp/clepso-m00-s03b-lv5l_gej; durable relevant
results and screenshots are retained in this tracker/evidence directory.

## Completed local slice — M00-S03c: retained execution attempts (October 6, 2026)

Outcome: an active owner/admin can inspect each actual firm-profile execution
attempt, including interrupted leases, without losing earlier outcomes or
mistaking historical counters for recorded evidence. Prerequisites: M00-S01/S02
and S03a/S03b; all remain partial module work. Records: job executions and a new
server-only attempt table. Staff membership is rechecked; matter/provider work
remains excluded until domain authorization exists. PDF: p11 bounded jobs,
retry/outcome/inspection and interruption recovery; p39 no access disclosure or
lost history; p40 truthful processing/queue failure/cap reached.

Small tasks: (1) failing durable tests, additive schema/security/rollback and
atomic worker claim/outcome history; (2) bounded authenticated history read with
shared Zod/OpenAPI contract, explicit unrecorded historical attempts and Settings
details; (3) clean/upgrade migration and isolation tests, browser interruption
inspection, completion checks, five-axis review and tracker/decision update.
Current code: apps/worker/src/execution.ts, packages/db/src/schema/execution.ts,
apps/api/src/modules/firms/firm.*, packages/core/src/schemas/execution.ts and
apps/web/src/features/settings/FirmBackgroundWork.tsx. Manual retry/resolution is
the next slice; this read does not execute work. No provider dependency or M22 work.

### M00-S03c outcome and verification

**Slice complete locally; M00 and M15 remain partial.** What existed: authoritative
job summaries, leased retries/recovery, fresh availability and read-only Settings
inspection. Missing: individual attempt evidence; historical counters had no
retained details. Now every new worker claim creates a durable attempt, and its
outcome commits with the job result/retry. Expired claims retain an interrupted
outcome; stale/duplicate workers cannot overwrite it. Finishing/claim failures
roll back both sides. The five-attempt cap still holds. No historical details are
fabricated, no provider success is claimed and no manual rerun command is added.

Staff journey now verified: save a firm-profile edit through the API, recover a
lost response, dispatch through real Redis, persist a worker result, then open
Processing details to inspect attempts. Controlled process interruption creates
an interrupted first attempt and a completed second one through the real worker
service and authorized API. Empty work, legacy counters, removed sources,
loading, errors, denial and refresh are distinct states. The published history
contract is available to future native/client consumers; this is not native or
client-platform completion and none of the seven flagship journeys is complete.

Changed paths (preserving session-start edits):

- Database: `packages/db/src/schema/execution.ts`,
  `packages/db/test/{migrations,rls-isolation}.test.ts`,
  `supabase/migrations/20261006191117_silly_nicolaos.sql`,
  `20261006191118_attempt_history_security.sql`,
  `meta/{_journal.json,20261006191117_snapshot.json}`,
  `supabase/rollbacks/20261006_attempt_history.sql`.
  New table `job_execution_attempts`; composite job/firm/actor identity,
  bounded status/date/error constraints, terminal-update protection and forced
  server-only RLS. Existing migrations are untouched.
- Worker: `apps/worker/src/execution.ts`,
  `apps/worker/test/execution.integration.test.ts`.
- API: `apps/api/src/modules/firms/firm.{controller,dto,service}.ts`,
  `apps/api/test/firm-command.integration.test.ts`,
  `apps/api/test/{firm-settings,execution-history}.browser.mjs`.
  New bounded authenticated `GET /firms/current/executions/{jobId}/attempts`;
  existing list and command wire contracts remain unchanged.
- Shared contracts/client: `packages/core/src/schemas/execution.ts`,
  `execution-history.test.ts`, `packages/api-client/src/index.ts`,
  `src/generated/schema.d.ts` (generated from the running API and formatted).
- Staff web: `apps/web/src/features/settings/{FirmBackgroundWork.tsx,
FirmBackgroundWork.module.css,firm-executions.ts,ExecutionAttemptHistory.tsx,
execution-history.ts,execution-history.test.ts}`. Reuses Clepso tokens/components,
  existing actor/firm cache namespace and cancellation boundary; history fetches
  only when its disclosure is open, max five rows, no automatic execution/polling.
- Separate M00 dependency-quality follow-up: `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
  `apps/mobile/package.json`, `apps/mobile/test/dependency-security.test.mjs`.
  The newly reported critical shell-quote advisory was reproduced then patched;
  the native Node regression runs under the existing workspace test command.
- Tracker/decisions: this file and `DECISIONS.md` D009/D010. Eight screenshots in
  `docs/implementation/evidence/m00-s03c/`: recovered/mobile/loading/network/
  malformed/denied/unavailable/legacy history.

Commands and actual results:

| Command                                                                                                                                     | Result                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:generate`                                                                                                                          | PASS generated additive schema; fixed new FK/index ordering before application                                                                                                                                                                                          |
| `pnpm supabase migration up --local`                                                                                                        | PASS two new migrations; no reset or business-data loss                                                                                                                                                                                                                 |
| `pnpm supabase migration list --local`                                                                                                      | PASS nine local/applied timestamps match                                                                                                                                                                                                                                |
| `pnpm --filter @lawfirm/db db:check`                                                                                                        | PASS migration snapshots consistent                                                                                                                                                                                                                                     |
| `pnpm --filter @lawfirm/db test`                                                                                                            | PASS 17 tests: real Supabase member/forged/anon history denial and client writes, service-role delete denial, clean schema, upgrade with old counters and no synthetic rows, composite tenant FK, unused rollback/reapply, evidence-preserving rollback refusal         |
| `pnpm --filter @lawfirm/worker exec vitest run --config vitest.integration.config.ts test/execution.integration.test.ts`                    | RED for missing history; GREEN 17 focused cases after implementation. Initial incorrectly forwarded argument also ran the Redis suite before its owned Redis existed; corrected the invocation and started local Redis. No tests disabled                               |
| `pnpm --filter @lawfirm/core exec vitest run src/schemas/execution-history.test.ts`                                                         | RED absent contract; GREEN malformed/private/impossible/duplicate/out-of-order/coverage/date checks                                                                                                                                                                     |
| `pnpm --filter @lawfirm/web exec vitest run src/features/settings/execution-history.test.ts`                                                | RED absent read helper; GREEN validated transport, cancellation, mismatched/unsafe references, denial/removal/offline and truthful interruption                                                                                                                         |
| `pnpm --filter @lawfirm/api exec vitest run --config vitest.integration.config.ts test/firm-command.integration.test.ts` (local Redis 6389) | RED absent endpoint and removed-job falsely empty; GREEN fixed both and checked current roles/revocation, authorized other-firm 404, matter-source 404, private-field exclusion, legacy coverage and no-store                                                           |
| `pnpm --filter @lawfirm/api... build`                                                                                                       | PASS service/dependency build before contract generation                                                                                                                                                                                                                |
| `pnpm --filter @lawfirm/api-client exec openapi-typescript http://localhost:3300/openapi.json -o src/generated/schema.d.ts`                 | PASS; generated declaration formatted and API-client build copies it                                                                                                                                                                                                    |
| `pnpm --filter '!@lawfirm/db' test`                                                                                                         | PASS 67 tests (core 19, API 7, web 38, worker 2, native dependency 1)                                                                                                                                                                                                   |
| `REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/api test:integration`                                                              | PASS 17 tests, repeated after pnpm's Redis peer-snapshot normalization                                                                                                                                                                                                  |
| `pnpm --filter @lawfirm/worker test:integration` (local Redis 6389)                                                                         | PASS 19 tests including real opaque Redis dispatch/removal/replay; repeated after dependency normalization                                                                                                                                                              |
| `pnpm typecheck`                                                                                                                            | PASS 15 tasks, includes native and generated wire-contract checks                                                                                                                                                                                                       |
| `pnpm lint`                                                                                                                                 | PASS                                                                                                                                                                                                                                                                    |
| `pnpm format:check`                                                                                                                         | PASS                                                                                                                                                                                                                                                                    |
| `pnpm build`                                                                                                                                | PASS 9 tasks; existing unrelated landing metadataBase warning remains                                                                                                                                                                                                   |
| `pnpm --filter @lawfirm/mobile exec node --test test/dependency-security.test.mjs`                                                          | RED on installed 1.10.0 quote operation; GREEN on 1.11.0, four line terminators rejected, ordinary parsing/quoting compatible                                                                                                                                           |
| `pnpm install --ignore-scripts --prefer-offline`, then `pnpm install --frozen-lockfile --ignore-scripts`                                    | PASS patched dependency and frozen resolution; no install scripts ran, no script policy relaxed                                                                                                                                                                         |
| `pnpm audit --audit-level high --json`                                                                                                      | FAIL exit 1: final **0 critical, 34 high, 16 moderate, 1 low**. Initial run discovered shell-quote 1.10.0 critical GHSA-pqg4-j6r4-53mv; 1.11.0 pin/regression removes it. Existing high advisories still block the release gate; no audit exceptions or threshold edits |
| `git diff --check`                                                                                                                          | PASS; no staged changes                                                                                                                                                                                                                                                 |

**120 passing unit/integration/database tests**, plus the real browser journey.
Review mutation inverted the new expired-lease condition: three durable recovery
cases failed (duplicate processing, interrupted lease, fifth crashed attempt).
Original source was restored byte-for-byte; all 19 worker integrations passed.

Runtime command (final API/worker builds, local Supabase, isolated headless Chrome
CDP 9223, test-owned Redis container):

```sh
env RUN_WORKER=1 REDIS_URL=redis://127.0.0.1:6389 \
  READINESS_REDIS_CONTAINER=clepso-m00-s03c-redis \
  BROWSER_ARTIFACT_DIR=/var/folders/np/k8cp22194s7g4208dsj7wvgm0000gp/T/clepso-m00-s03c-2bnj3g87/browser-final \
  node apps/api/test/firm-settings.browser.mjs
```

PASS real sign-in/save/persistence/network-loss replay → outbox → Redis → result →
authorized inspection; actual Redis pause/unpause and worker expiry/restart
availability recovery preserved. New attempt view: running then interruption and
completion, keyboard Tab/Enter and held-read loading, network/malformed failure
and retry, real role downgrade clears warm details, removed source is unavailable,
legacy five-attempt summary has no invented rows, empty work has no attempts.
Fresh reads never change job attempts/results. Accessibility tree finds the
history action; actual expanded-row bounds fit 320/768/1024/1440px; screenshots
visually reviewed. Initial visible Chrome exited before CDP connection; restarted
an isolated headless profile. Harness's refresh/disclosure race was diagnosed
from the screenshot and fixed by waiting for the new row status, not by weakening
assertions. Final full flow passed. No personal browser credentials were read.

PDF scenarios exercised for this slice: p11 interruption/dispatch and command
replay; p39 no unauthorized history disclosure/duplicate effects/lost prior
outcomes; p40 truthful interrupted/capped/failed work and queue-outage recovery.
Still unverified: staging backup restoration, production outages/monitoring/
alerts, representative 50-lawyer load, manual operational recovery, long real
provider processing, all seven connected journeys, staff/client native parity,
client publication and M00–M21 release gates. No provider credentials, commercial
terms, legal rules or M22 architecture were invented.

Skills used in this session and their purpose: @context-engineering (tracker,
actual code and applicable PDF pages); @git-workflow-and-versioning (dirty-tree
baseline/preservation); @planning-and-task-breakdown and
@incremental-implementation (one vertical attempt-history slice);
@test-driven-development (durable/contract/UI/dependency RED→GREEN);
@api-and-interface-design (new bounded history contract);
@security-and-hardening (live access, tenant identity, server-only records and
supply-chain patch); @deprecation-and-migration (additive upgrade and guarded
down path); @source-driven-development (installed Drizzle/Next and maintainer
security patch); @frontend-ui-engineering and @browser-testing-with-devtools
(existing design, accessible states and isolated real Chrome CDP because MCP is
unavailable); @debugging-and-error-recovery (migration ordering and browser
harness timing); @observability-and-instrumentation (durable attempt evidence,
request/job correlation and existing structured service logs);
@documentation-and-adrs (D009/D010); @ci-cd-and-automation (new native regression
in existing workspace test discovery); @code-review-and-quality (five axes and
mutation experiment). No skill checkpoint required approval under the user's
existing authorization.

Five-axis review: correctness (transactional history, cap/fencing and missing
legacy evidence); readability (small history component/read helper and separate
browser module); architecture (Postgres authority, server-only execution and
shared generated contracts); security (current owner/admin membership, source
allowlist, parameterized queries, composite tenant FK, terminal protection,
no raw payload/token/result exposure and no privileged client writes); performance
(indexed job/attempt lookup, max five rows, lazy disclosure fetch, bounded locks/
statements, no new polling or per-list-row automatic requests). No unresolved
slice correctness finding; audit highs remain a release blocker.

Next dependency-ready slice: **M00-S03d bounded owner/admin recovery/resolution**
with expected current state/source revision, normal authenticated command context,
idempotency, audit and durable outbox, preserving this attempt history. Never
reset counters or overwrite failed outcomes to make a rerun appear new. Then M01
provisioning/invites/active-firm context and matter grants, followed by M02/M18's
configurable universal domain. Wider M00 operational and dependency remediation
remain open. M22 remains the final post-core module.

All 778 session-start files remain. Hash review found exactly 22 intended existing
paths changed; earlier migration files/snapshots and unrelated design/landing/
staff-shell edits are unchanged. Ten source/migration/test files and eight evidence
screenshots were added. No file was staged, committed, merged or deployed. Full
command/mutation/baseline logs are in
`/var/folders/np/k8cp22194s7g4208dsj7wvgm0000gp/T/clepso-m00-s03c-2bnj3g87`;
important decisions, results and images are retained in this tracker. Test-owned
worker processes, temporary databases and browser fixture records were cleaned
up; immutable command audits intentionally survive local fixture deletion. The
isolated headless browser and owned Redis are shut down after verification. Local
Supabase and the built development API/staff web remain available.

## Active objective: M00–M04, one verified slice at a time

User authorization: October 6, 2026, continue all slices in order and aim to finish
the first five modules. Preserve full blueprint gates; no artificial completion
percentage, deployment, platform-parity or provider-coverage claims. Continue
independent work when external gates are unavailable. Staging and OAuth resource
names/setup have been requested asynchronously; credentials belong in server
configuration. M22 remains deferred.

Current slice M00-S03d: an owner/admin reviews the current firm profile and gives a
reason to request one replacement check for a terminal failed/blocked firm job.
Prerequisites: existing authenticated command/receipt/audit/outbox path and
retained attempts. Records: execution_recoveries linking old job to new outbox
work; existing job and attempts stay unchanged. Reads/writes recheck current firm
membership; source types are explicitly allowed, and worker checks current actor
and revision again. PDF p11 bounded retry/recovery; p39 no cross-firm disclosure,
duplicate effects, lost history or silent changes; p40 truthful pending/capped work.

Tasks: (1) failing shared/API integration scenarios plus additive relation,
server-only access and guarded rollback; (2) source/current-record review and
idempotent bounded recovery command, durable audit/outbox and worker event contract;
(3) generated client, accessible Settings action with uncertain-result retry;
(4) focused/baseline/migration/browser checks, mutation and five-axis review.
Next local foundation work: operational search/monitoring/recovery drills and
remaining dependency findings, then M01 provisioning/context/capabilities, M02
universal profiles/contacts/matters with matter grants, M03 adapter/sync boundaries,
M04 controlled versioned uploads and downstream contracts. Full module gates still
require the staging/platform/provider evidence listed in the blueprint.

## Session continuation — M00-S03d and M01-S01 (October 6, 2026)

Both slices are implemented and locally verified. No whole module is complete.
The first-five objective remains M00–M04; M00/M01 are partial and M02–M04 remain
demo-only. Staff/client native applications and full release gates are not claimed.

M00-S03d: an owner/admin reviews a retained failed/blocked firm-profile check and
requests one new check. Current membership, source type, terminal status, source
revision and current firm revision are revalidated. The replacement has a fresh
bounded budget; prior counters/results/attempts remain intact. Receipt, immutable
recovery provenance, audit and outbox commit together. Network uncertainty retains
one action identity, and worker completion is shown from persisted outcomes.
Only internal firm-profile verification is supported; provider/domain retries are
not implied. Relevant PDF: p11 command replay/recovery, p39 isolation/no duplicate
effects/no lost history, p40 truthful pending/capped work and queue outage recovery.

Changed M00 paths:

- `packages/core/src/schemas/{execution,execution-recovery}.ts`, their tests and index.
- `packages/db/src/schema/execution.ts`, `test/{migrations,rls-isolation}.test.ts`.
- `supabase/migrations/20261006202213_workable_pixie.sql`,
  `20261006202214_execution_recovery_security.sql`, new snapshot/journal entry and
  `supabase/rollbacks/20261006_execution_recovery.sql`.
- `apps/api/src/modules/firms/{firm-recovery.service,firm.service,firm.controller,firm.dto,firm.module}.ts`,
  `src/common/http.ts`, `test/execution-recovery.integration.test.ts` and browser helpers.
- `apps/worker/src/execution.ts`, `test/execution.integration.test.ts`.
- `packages/api-client/src/{index,generated/schema.d}.ts`.
- `apps/web/src/features/settings/{ExecutionRecovery,FirmBackgroundWork,LiveFirmSettings}.tsx`,
  `execution-recovery.ts`, its test and typed-client assertions.

M01-S01: `/auth/me` previously echoed `user_role` from the JWT and could describe a
revoked/cross-firm context as current. It now returns the live database staff role
and four currently implemented firm capabilities through a strict shared contract.
The existing firm command/read transactions reuse the same membership lookup and
retain their lock behavior. Settings' Your access card validates actor and firm,
hides warm permissions on loading/error, refreshes controls after a role change,
and clears the firm view when access is revoked. No matter/client/financial
capability, full session revocation or MFA gate is declared implemented.
Relevant PDF: p12 live capabilities/revocation, p39 tenant isolation, p40 failure
must not appear as verified authority. D011/D012 record the boundaries.

Additional M01 paths:

- `apps/api/src/common/auth/staff-access.service.ts`,
  `src/modules/auth/{auth.controller,auth.module,staff-context.dto}.ts`,
  `test/staff-context.integration.test.ts`, adjusted readiness-service constructor
  characterization test and `test/staff-access.browser.mjs`.
- `packages/core/src/schemas/staff-context.ts`, its test and index.
- `apps/web/src/features/settings/{StaffAccessCard,LiveFirmSettings}.tsx`,
  `staff-access.ts`, its test; generated API/client and typed assertions above.

Verification (final source after mutation restoration):

| Command / scenario                                                                                                                                                        | Result                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused core recovery + staff-context contracts                                                                                                                           | RED missing contracts, then GREEN (2 + 1 cases)                                                                                                                          |
| Focused recovery API integration                                                                                                                                          | RED missing endpoints, then GREEN 11 cases: concurrent keys, stale reviews, source allowlist, replay revocation, new reviewing actor, strict input and complete rollback |
| Focused worker integration                                                                                                                                                | RED unsupported reviewed event, then GREEN 18 cases including worker revocation                                                                                          |
| Focused web recovery + staff-access tests                                                                                                                                 | RED missing boundaries, then GREEN (3 + 3 cases): current context, cancellation, malformed/denied reads and identical uncertain intent                                   |
| `pnpm supabase migration up --local` / `migration list --local`                                                                                                           | PASS, both new migrations applied; earlier versions unchanged                                                                                                            |
| `pnpm --filter @lawfirm/db db:check`                                                                                                                                      | PASS, snapshots consistent                                                                                                                                               |
| `pnpm --filter @lawfirm/db test`                                                                                                                                          | PASS 18: clean/upgrade/down/refusal, tenant/actor FKs, immutable recovery and client/service privileges                                                                  |
| `REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/api test:integration`                                                                                            | PASS 31 across 4 files; includes all six current roles, no-active-firm identity, revocation and cross-firm denial                                                        |
| `pnpm --filter @lawfirm/worker test:integration`                                                                                                                          | PASS 20                                                                                                                                                                  |
| `pnpm lint`                                                                                                                                                               | PASS                                                                                                                                                                     |
| `pnpm format:check`                                                                                                                                                       | PASS after focused formatting                                                                                                                                            |
| `pnpm typecheck`                                                                                                                                                          | PASS 15 workspace/dependency tasks, including native and contract checks                                                                                                 |
| `pnpm --filter '!@lawfirm/db' test`                                                                                                                                       | PASS core 22, web 44, API 7, worker 2, plus native Node dependency regressions                                                                                           |
| `pnpm build`                                                                                                                                                              | PASS 9 workspace tasks; native release binaries are unverified                                                                                                           |
| `pnpm audit --audit-level high --json`                                                                                                                                    | FAIL: unchanged 34 high, 16 moderate, 1 low, 0 critical; no dependency/gate changed in these slices                                                                      |
| `RUN_WORKER=1 READINESS_REDIS_CONTAINER=clepso-m00-s03d-redis BROWSER_ARTIFACT_DIR=<session>/browser pnpm --filter @lawfirm/api exec node test/firm-settings.browser.mjs` | PASS with actual API/web/Supabase/Redis/worker and fresh isolated Chrome context                                                                                         |
| Deliberate revision-guard and claim-role mutations                                                                                                                        | Both detected by focused integration cases; source restored and full API tests passed                                                                                    |

Browser coverage includes loading/empty/error/retry/role denial/revocation,
response loss after commit, stale review, one persisted replacement, real worker
completion, preserved failed attempt, 320px layout bounds and accessible controls.
Screenshots were inspected; recovery and role/loading/error/revocation examples
are in `docs/implementation/evidence/{m00-s03d,m01-s01}/`. The surrounding fixture
shell is still demo behavior. The harness now resolves its worker relative to the
script and creates/disposes a fresh browser context; earlier launch/session/CORS
preflight test failures were corrected without weakening assertions.

Five-axis review: bounded typed/source-filtered contracts, atomic durable effects,
current membership locks, original-history preservation, safe unknown-outcome
retry, shared lookup rather than a second claims-based policy, indexed unique
recovery lookup, lazy bounded reads, no automatic command retry or privileged
client writes. Wider pagination, metrics, provider jobs, auth session/MFA policy,
all platforms, all seven journeys and production recovery/load remain unverified.

Skills: @context-engineering and @planning-and-task-breakdown (audit/ordered slices);
@incremental-implementation and @test-driven-development (thin paths with RED→GREEN);
@api-and-interface-design and @security-and-hardening (live capabilities, typed
commands, no client writes); @deprecation-and-migration (additive guarded schema);
@frontend-ui-engineering and @browser-testing-with-devtools (existing tokens,
accessible states, isolated direct CDP because MCP is unavailable);
@debugging-and-error-recovery (migration order and harness isolation);
@observability-and-instrumentation (correlated command/job outcomes);
@code-review-and-quality (five axes and mutation checks);
@documentation-and-adrs and @git-workflow-and-versioning (decisions/evidence and
preserved dirty-tree baseline). No skill approval checkpoint, staging/merge/deploy,
voice-provider decision or receptionist work was introduced.

External setup clarified by the user: staff web hosting will be Vercel; Supabase
is configured, project name/URL and staging/production separation await details;
Clepso domains are not configured. Next user setup steps: identify an isolated
Supabase staging project; establish Vercel staging web and API/worker hosting plus
private Redis; then register Microsoft and Google OAuth clients/test accounts.
Callback URLs/scopes will be supplied with the actual adapters. Private credentials
belong in server configuration, not chat. Private document storage, scanning and
signature sandbox follow M04 contract selection. Existing continuous BullMQ worker
needs a persistent service; Vercel's NestJS function support does not itself supply
that service. No hosting costs or resources have been authorized/provisioned.

Official setup references: [Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments),
[Microsoft app registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app),
[Google consent](https://developers.google.com/workspace/guides/configure-oauth-consent),
[Google credentials](https://developers.google.com/workspace/guides/create-credentials),
[Vercel NestJS](https://vercel.com/docs/frameworks/backend/nestjs),
[Vercel function limits](https://vercel.com/docs/functions/limitations).

## Session continuation — M01-S02 first-firm provisioning (October 6, 2026)

Slice locally implemented and verified; M01 remains partial. Previously a newly
signed-in account without a firm could only receive an access-denied Settings
screen. It can now create its first firm through an authenticated, validated API
command and recover uncertain creation/session outcomes. This is not the older
fixture onboarding or a completed team/matter authorization module.

Prerequisites: M00 transactional receipt/audit/outbox and internal worker check;
M01 verified actor and live staff membership; a confirmed, available Auth account
with a profile and no existing live staff membership. Records: firm revision 1,
initial owner membership, `firm.provision.v1` receipt, append-only audit and one
`firm.profile-check-requested.v1` event. Permissions come from live server records;
body/JWT role claims cannot upgrade an existing member. The bootstrap exception
has no active firm until those records commit. D013 records its tradeoffs.

Ordered tasks completed:

1. [x] Failing shared validation, API durability/authorization and staff retry/session tests.
2. [x] Add actor/key bootstrap uniqueness, clean/upgrade/down and retained-evidence checks.
3. [x] Bounded account-serialized API command, atomic owner grant/receipt/audit/outbox and logs.
4. [x] Generated shared client and real staff setup, identical uncertain intent and Auth handoff.
5. [x] Browser recovery/worker outcomes, broader checks, five-axis/mutation review and tracker.

Changed paths:

- `packages/core/src/schemas/firm-provision{,.test}.ts`, `src/index.ts`.
- `packages/db/src/schema/execution.ts`, `test/migrations.test.ts`;
  `supabase/migrations/20261006205504_aromatic_kate_bishop.sql`, new snapshot/journal
  entry; `supabase/rollbacks/20261006_firm_provision.sql`. Only an additive partial
  unique index is introduced; prior migrations/security policies remain unchanged.
- `apps/api/src/common/action-key.ts`; `src/modules/firms/firm-provision.{service,controller}.ts`,
  `firm.{dto,module,controller}.ts`; `test/firm-provision.integration.test.ts`.
  Three commands now reuse the existing UUID action-key validation behavior.
- `packages/api-client/src/{index,generated/schema.d}.ts`: authenticated `POST /firms`,
  strict name input and `{firmId, commandId, requiresSessionRefresh:true}` receipt;
  UUID action/request identity, no implicit retries and no claimed owner token.
- `apps/web/src/features/settings/{InitialFirmSetup,LiveFirmSettings}.tsx`,
  `firm-provision{,.test}.ts`, `src/lib/{firm-session,firm-api.type-test}.ts`.
  Missing active context offers setup/refresh; revoked membership remains denied.
  An unknown response locks the reviewed input and offers the same request. An
  accepted receipt can show created-but-refresh-unavailable. Supabase Auth refresh
  precedes the authorized firm read; no business records are written from the client.
- `apps/api/test/firm-provision.browser.mjs`, `test/firm-settings.browser.mjs`:
  isolated provisioning mode reuses the harness, starts with a new account without
  a seeded firm, and cleans only that account's test firms. Existing Settings mode
  is preserved and rerun. Reviewed images: `docs/implementation/evidence/m01-s02/`.
- `docs/implementation/{STATUS,DECISIONS}.md`; no staging, commit, merge or deploy.

Exact verification commands and results after restoring the deliberate mutation:

| Command                                                                                                                                                                                                        | Result                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @lawfirm/core exec vitest run src/schemas/firm-provision.test.ts`                                                                                                                               | RED missing contract → GREEN 1 case                                                                     |
| `pnpm --filter @lawfirm/api exec vitest run --config vitest.integration.config.ts test/firm-provision.integration.test.ts`                                                                                     | RED missing route → GREEN 7 cases                                                                       |
| `pnpm --filter @lawfirm/web exec vitest run src/features/settings/firm-provision.test.ts`                                                                                                                      | RED missing boundary → GREEN 3 cases                                                                    |
| `pnpm db:generate` / `pnpm supabase migration up --local` / `pnpm supabase migration list --local`                                                                                                             | PASS; local migration history matches through `20261006205504`                                          |
| `pnpm --filter @lawfirm/db db:check` / `pnpm --filter @lawfirm/db test`                                                                                                                                        | PASS consistent snapshots, 18 DB cases; clean/upgrade/unused rollback/refused retained-receipt rollback |
| `REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/api exec vitest run --config vitest.integration.config.ts`                                                                                            | PASS 38 cases in 5 files                                                                                |
| `pnpm --filter @lawfirm/worker test:integration`                                                                                                                                                               | PASS 20 cases                                                                                           |
| `pnpm --filter @lawfirm/api-client exec openapi-typescript http://localhost:3300/openapi.json -o src/generated/schema.d.ts` / `pnpm --filter @lawfirm/api-client build`                                        | PASS actual API contract regenerated and declaration copy checked                                       |
| `pnpm lint` / `pnpm format:check` / `pnpm typecheck`                                                                                                                                                           | PASS; types include native/shared contract assertions                                                   |
| `pnpm --filter '!@lawfirm/db' test`                                                                                                                                                                            | PASS core 23, web 47, API 7, worker 2 and native dependency regressions                                 |
| `pnpm build`                                                                                                                                                                                                   | PASS 9 tasks; native release binaries remain unverified                                                 |
| `pnpm audit --audit-level high --json`                                                                                                                                                                         | FAIL unchanged 34 high, 16 moderate, 1 low, 0 critical; no dependencies or gate weakened                |
| `RUN_PROVISION_ONLY=1 RUN_WORKER=1 READINESS_REDIS_CONTAINER=clepso-m00-s03d-redis BROWSER_ARTIFACT_DIR=<session>/browser-provision-final pnpm --filter @lawfirm/api exec node test/firm-settings.browser.mjs` | PASS actual Supabase Auth, API, DB, Redis and worker; 320px setup and desktop inspection                |
| `RUN_WORKER=1 READINESS_REDIS_CONTAINER=clepso-m00-s03d-redis BROWSER_ARTIFACT_DIR=<session>/browser pnpm --filter @lawfirm/api exec node test/firm-settings.browser.mjs`                                      | PASS existing full Settings/recovery/access flow after provisioning changes                             |
| Invert email-confirmation guard, run focused account-availability integration test, restore source                                                                                                             | Mutation caught; full restored API suite passes                                                         |

PDF cases exercised: p12 initial provisioning/live roles, p11/p39 idempotent
commands, no duplicate authority/effects, p40 durable failure/recovery. Concurrent
identical actions yield one firm/grant/audit/event; competing actions yield one
success and one conflict. Changed input conflicts; revoked receipt replay is
denied. Unconfirmed/banned/deleted accounts and unvalidated authority fields are
rejected. A failed outbox insert leaves no firm/member/receipt/audit from that
command. Browser interception loses a committed response; the identical request
recovers it. An Auth rejection leaves truthful created/unavailable state. Reload
and fresh Auth refresh recover the authorized firm without another creation.
The real worker result is checked in Postgres; no demo practice areas are seeded.
Native binaries/offline flow, SSO policy, invitations, explicit firm selection,
MFA/recovery/device sessions, matter/client/financial boundaries, all seven flagship
journeys, hosted restore/load/pilots and entire release checklist remain unverified.

Five-axis review: bounded parameterized account/member locks; confirmed account
and live membership before receipt replay; strict shared contracts; transaction
contains all effects; global bootstrap uniqueness; no privileged client keys;
safe logs without email/name/tokens; input/action identity retained on uncertainty;
current Auth session plus server read rather than fabricated authority; no new
dependencies or unbounded server lists. Migration fixture initially omitted its
required receipt ID; corrected fixture and reran all DB cases. Browser emulation
initially moved click targets and the installed SDK cached failed refreshes; the
test now starts at mobile width and exercises recovery across reload with native
controls. Assertions and product recovery gates were retained.

Skills applied: @planning-and-task-breakdown and @incremental-implementation for
this bounded M01 slice; @test-driven-development for meaningful RED→GREEN and
@code-review-and-quality for five-axis/mutation review; @api-and-interface-design
and @security-and-hardening for bootstrap authority/replay/contracts;
@deprecation-and-migration for additive guarded uniqueness; @source-driven-development
for installed Supabase JS/Auth 2.117.2 and official refresh documentation;
@frontend-ui-engineering and @browser-testing-with-devtools for existing design
controls, responsive/access/error states and isolated CDP (DevTools MCP unavailable);
@debugging-and-error-recovery for fixture/emulation/refresh behavior;
@observability-and-instrumentation for correlated durable command/job evidence;
@documentation-and-adrs and @git-workflow-and-versioning for D013 and preservation
of the pre-existing dirty tree. Earlier @context-engineering audit remains current.

Next dependency-ready slice: **M01-S03 durable staff invitations** — live
owner/admin role checks, immutable/revocable invitation intent and confirmed
account/email acceptance through normal commands. Delivery must stay explicitly
unavailable until a configured mail adapter exists. Subsequent slices cover
active-firm choice, matter grants/ethical walls and session/MFA/revocation before
M02 universal matters; M03 integration adapters and M04 documents follow. Whole
M00–M04 completion remains **0/5**; M00/M01 partial, M02–M04 demo-only.

### External setup: next information to supply

Vercel is the user's selected staff web host; Supabase exists; domains are not
configured. No remote projects were read or changed. Continue in this order:

1. In the existing Supabase dashboard, open the project and copy its project name
   and public Project URL. State whether it holds production data or is isolated
   development/staging. Do not send keys, database passwords or access tokens.
2. Identify an isolated staging Supabase project before migration/restore exercises;
   use synthetic pilot data. Hosted Auth must enable the repository's custom token
   hook for refreshed staff firm context. Domains can follow; public staging URLs
   are enough to determine callback/redirect allowlists.
3. Identify the Vercel project/public staging URL for staff web, plus where the API,
   persistent BullMQ worker and private Redis will run. Vercel supports NestJS HTTP
   functions, while the current continuous worker needs persistent execution.
   Hosting resource creation/commercial choices and deployment remain external.
4. Register Microsoft/Google OAuth test apps after callback URLs/scopes are supplied
   with adapter implementation. Share application/project IDs and test-account
   availability; store credentials only in server environment configuration.
5. For M04, identify private storage, scanning and signature sandbox access after
   bounded provider contracts exist. Missing services must remain unavailable.

Official refresh behavior: [Supabase refreshSession](https://supabase.com/docs/reference/javascript/auth-refreshsession).
Environment/app-registration/function references are linked in the preceding
session section. External prerequisites do not excuse unfinished local domain
work; independent slices continue without pretending these release gates passed.

Session cleanup: test-owned worker children, browser contexts/headless Chrome and
temporary Redis were stopped after verification. Local Supabase, staff dev server
and final API build remain available; no worker is currently running. Processing
inspection therefore reports unavailable/unconfirmed as its observations expire.
Committed outbox work remains durable until configured processing runs. No remote
deployment, personal browser profile or unrelated development process was changed.

## Session continuation — M01-S03 staff invitations (October 7, 2026)

Local outcome: owner/admin prepare/list/revoke a durable invitation; the intended
confirmed account discovers and accepts it, obtaining one staff membership. All
writes include actor/request identity, strict input, current authorization, bounded
transaction, receipt, audit and outbox. Email delivery is explicitly **unavailable**.
There were no production invitation records/commands before this slice; the Users
preview does not establish provisioning or delivery. Local preparation/revocation
and acceptance increments are implemented; whole M01/M15 remain partial.

Records and permissions: new `staff_invitations`, existing staff memberships,
receipts/audits/outbox/jobs/attempts. Non-owner staff roles only; owner/admin manage;
recipient discovery/acceptance requires current confirmed Auth email, available
issuer/firm and reviewed source revision. JWT email/owner claims cannot grant
access. Revoked memberships cannot be restored by an invitation; accepted grants
cannot be removed by revoking their invitation. Expired sources stay historical.
Relevant PDF: p12 invitation/acceptance and revoked authority; p39 isolation,
concurrent retry and retained history; p40 wrong recipient, unavailable delivery,
response-loss and recovery. Seven flagship journeys and full module gates remain
unverified by this narrow staff onboarding path.

Changed paths, grouped into reviewable increments:

- Contracts/model: `packages/core/src/{index.ts,schemas/staff-context.ts,schemas/staff-invitation.ts,schemas/staff-invitation.test.ts}`;
  `packages/db/src/schema/{index.ts,execution.ts,staff-invitations.ts}`;
  `supabase/migrations/20261007145715_ambitious_lorna_dane.sql`,
  `20261007145834_brave_reptil.sql`, `20261007145835_staff_invitation_security.sql`,
  their generated journal/snapshots and `supabase/rollbacks/20261007_staff_invitations.sql`.
- Server/acceptance: `apps/api/src/modules/staff-invitations/{staff-invitation.controller.ts,staff-invitation.dto.ts,staff-invitation.module.ts,staff-invitation.service.ts}`;
  `apps/api/src/{app.module.ts,common/auth/confirmed-account.ts,common/auth/staff-access.service.ts}`;
  `apps/api/src/modules/firms/firm-provision.service.ts` reuses the confirmed-account
  serialization guard, preserving characterized bootstrap behavior;
  `apps/api/test/{staff-invitation.integration.test.ts,staff-context.integration.test.ts}`.
- Worker: `apps/worker/README.md`, `apps/worker/src/{execution.ts,staff-invitation-check.ts}` and
  `apps/worker/test/{database.ts,staff-invitation.integration.test.ts}`. Disposable
  Auth fixture includes only the extra lifecycle columns needed for this check.
- Client/UI: `packages/api-client/src/{index.ts,generated/schema.d.ts}`;
  `apps/web/src/features/settings/{LiveFirmSettings.tsx,StaffAccessCard.tsx,StaffInvitations.tsx,StaffInvitations.module.css,InvitationForm.tsx,InvitationAction.tsx,staff-invitations.ts,staff-invitations.test.ts}`;
  `apps/web/src/lib/firm-api.type-test.ts`; narrow-screen header wrapping in
  `apps/web/src/app/globals.css` (preserves pre-existing styles);
  `apps/api/test/{firm-settings.browser.mjs,staff-invitation.browser.mjs}`.
- Database evidence: `packages/db/test/{rls-isolation.test.ts,staff-invitation-migration.test.ts}`.
  D014 in `docs/implementation/DECISIONS.md` records the access and lifecycle choices.
  Screenshots are in `docs/implementation/evidence/m01-s03/`.

Verification evidence:

- Meaningful RED before implementation: core contract (2), API missing routes
  (9 initial cases), worker unsupported outcome (3), web helpers missing (2).
  API coverage now includes 13 invitation cases plus existing foundation tests.
- `pnpm supabase migration up --local`: three additive migrations applied; no
  database reset. `pnpm --filter @lawfirm/db db:check`: migration journal valid.
- `pnpm --filter @lawfirm/db test`: **20 pass**, including separate blocking RLS
  tests, clean/disposable installation, preservation of an existing firm, upgrade,
  unused rollback, refusal with retained outcomes/receipts, immutable source/terminal
  state, accepted membership foreign key and global acceptance-intent uniqueness.
- `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/api exec vitest run --config vitest.integration.config.ts`:
  **51 pass**. Covers live role/issuer/account checks, cross-firm and wrong-recipient
  denial despite claimed email/role, stale reviews, banned/deleted/unconfirmed or
  email-changed accounts, expiry during a lock wait, atomic acceptance rollback,
  same/different-key concurrency, unconfirmed issuer suppression, revocation, retained membership on replay,
  no implicit restoration and bounded stable pagination with equal timestamps.
- `pnpm --filter @lawfirm/worker test:integration`: **23 pass**, including internal
  verification, no delivery/grant, duplicate execution, changed source, invalid
  actor/scope, banned/revoked access and readonly accepted-recipient verification.
- `pnpm --filter '!@lawfirm/db' test`: core **25**, web **49**, API **7**, worker **2** pass.
  New UI tests hide warm identities after denial, reject foreign scope and mismatched
  receipts, and retain the same uncertain intent. Native type contracts compile;
  this is not native interface/offline parity evidence.
- `pnpm typecheck`: **15 tasks pass**; `pnpm build`: **9 tasks pass**.
  `pnpm lint`: pass. `pnpm format:check`: pass after formatting the new RLS case; `git diff --check`: pass.
- `pnpm audit --audit-level high --json`: **FAIL**, unchanged **34 high, 16 moderate,
  1 low, 0 critical**. No dependencies/lockfile changes in this slice; release gate
  remains blocked. Dependency remediation requires focused follow-up, not suppression.
- `pnpm --filter @lawfirm/api-client exec openapi-typescript http://localhost:3300/openapi.json -o src/generated/schema.d.ts`
  and `pnpm --filter @lawfirm/api-client build`: generated and built local contracts.
- `env RUN_INVITATION_ONLY=1 BROWSER_ARTIFACT_DIR=$PWD/docs/implementation/evidence/m01-s03 node apps/api/test/firm-settings.browser.mjs`:
  pass in an isolated Chrome profile/context on :9223, actual staff web :3100/API
  :3300/local Supabase. Exercises empty/loading, create and acceptance response-loss
  recovery, reviewed durable revocation, read error/retry hiding cached identities,
  manager downgrade, real confirmed recipient sign-in/session refresh/assigned
  attorney access, reload persistence, accessible controls and native keyboard focus;
  checks no overflow at 320/768/1024/1440 widths. Two intentionally interrupted
  responses are expected network failures, not unexpected console exceptions.
  No personal browser storage or credentials were read. The previously working
  runtime paths also pass: `env RUN_WORKER=1 READINESS_REDIS_CONTAINER=clepso-m01-s03-redis REDIS_URL=redis://127.0.0.1:6389 BROWSER_ARTIFACT_DIR=/var/folders/np/k8cp22194s7g4208dsj7wvgm0000gp/T/clepso-m01-s03-ztgbs09m/baseline-browser node apps/api/test/firm-settings.browser.mjs`
  (session-owned temporary artifacts), and
  `env RUN_PROVISION_ONLY=1 RUN_WORKER=1 REDIS_URL=redis://127.0.0.1:6389 BROWSER_ARTIFACT_DIR=/var/folders/np/k8cp22194s7g4208dsj7wvgm0000gp/T/clepso-m01-s03-ztgbs09m/provision-browser node apps/api/test/firm-settings.browser.mjs`
  (same session-owned artifact convention). The first-firm regression was initially
  run without its required worker and correctly reported incomplete processing;
  rerun with the owned worker verifies actual completion.
- Mutation review inverted the worker source-actor condition: all **3 invitation
  outcome tests failed**. The original file was restored and integration tests pass.
  This proves the tests reject an execution identity error rather than fixture text.

Five-axis review: pending discovery/acceptance also suppress an unconfirmed issuer
(a meaningful failing test caught the API/worker discrepancy); immutable provenance and terminal transitions; fresh account,
manager/issuer/grant checks and post-lock expiry; PostgreSQL authority with atomic
membership/outcomes; narrow generated contracts and bounded indexed pagination;
read errors/revocation hide cached invitation identities; stable uncertain intents,
validated receipts and genuine Auth renewal; no mail simulation, authority fields,
client writes, secret/PII logs, new dependencies, ownership escalation or domain
changes to billing/duration. UI form/action components are separated for review.

Failures diagnosed and resolved: Docker was stopped (local DB connection refused);
restarted Docker/local Supabase without reset. A disposable migration fixture
omitted its required receipt ID; fixed the fixture, retaining assertions. Local API
startup lacked the explicit staff CORS origin; configured the owned local process
and added a test preflight assertion without weakening server CORS. The browser's
read-error interception initially remained active for acceptance/preflight; scoped
it to GET and restored the intended response-loss interceptor. A stricter browser check found the existing header overflowing a real 320px CSS
viewport (347px scroll width); narrow header actions now wrap, keeping all controls
visible. The final browser check waits for the sidebar transition and confirms an
actual 320px viewport, rather than relying on a scaled mobile emulation. Full gates
were rerun; no tests/checks were disabled.

Skills applied: @context-engineering for verifying actual tracker/code/PDF state;
@planning-and-task-breakdown and @incremental-implementation for the two staff
onboarding increments; @test-driven-development for RED/GREEN and concurrency/
rollback requirements; @api-and-interface-design and @security-and-hardening for
recipient discovery, grant boundaries and shared contracts; @deprecation-and-migration
for additive RLS/provenance/uniqueness and guarded reversal; @frontend-ui-engineering
and @browser-testing-with-devtools for design-system states, accessibility and
isolated CDP (DevTools MCP unavailable); @debugging-and-error-recovery for local
services/fixtures/browser failures; @observability-and-instrumentation for correlated
command and job evidence without invitation email in logs; @code-review-and-quality
for five-axis and deliberate mutation review; @documentation-and-adrs and
@git-workflow-and-versioning for D014 and preserving the existing dirty tree.
Normal implementation was already authorized; no skill checkpoint requested.

Remaining gates/external blockers: actual mail delivery/configuration; explicit
firm selection; membership/ownership governance; matter grants/ethical walls,
client identity/publication, MFA/device/session policies and cache/file/AI revocation;
native/offline interfaces; invitation job inspection/recovery and operational
metrics; hosted staging/restore/pilot/provider evidence. Vercel staff hosting is
selected; Supabase project name/public URL and isolated staging designation are
still unknown, domains unconfigured, persistent API/worker/Redis hosting and
Microsoft/Google registrations unavailable. No remote resources were changed.

Next dependency-ready slice: **M01-S04 explicit active-firm selection**, using
current memberships and an authoritative server-selected context refreshed through
Auth, with actor/key receipts, revocation and cache-clearing tests. Then matter
permissions support M02 universal records/profiles, M03 adapters and M04 documents.
Whole M00–M04 completion remains **0/5**: M00/M01 partial, M02–M04 demo-only.

Session preservation/cleanup: compared all session changes with the initial file
hash/snapshot, including the pre-existing dirty tree. No existing unrelated edits,
old migrations, money/duration conventions or fixture screens were replaced. No
files were staged or committed, and no merge/deployment occurred. Browser contexts,
test-owned workers and temporary Redis were stopped after verification; local
Supabase, staff dev web and the final API build remain available. Queue/worker
availability becomes unavailable/unconfirmed after the local test services stop;
committed outbox records remain durable. Hosted staging and recovery gates remain open.

## M01-S04a — Workspace discovery and local logout (October 8, 2026)

Outcome: a confirmed staff account can inspect its own current workspaces and roles,
including after its old active-firm grant is revoked. Live Settings now offers
**Your session → Sign out**. Local session absence, a retained session and an Auth
revocation failure have different outcomes. This slice is locally verified; whole
M01/M15 remain partial and actual firm switching is not implemented.

Before this slice, real firm context, first-firm provisioning and staff invitations
existed, but there was no live membership-discovery endpoint. Logout was exposed
only in preview Settings. Broader domain screens still use fixture hooks/local
state; no demo matter, document, provider, deadline or financial behavior was made
production behavior by this change. The previous session's dirty changes were
preserved rather than replaced.

Prerequisites/records/permissions: existing M00 execution and M01 confirmed-account
checks, `auth.users`, `profiles`, `firm_members` and `firms`. The bounded account-level
read verifies the authenticated actor's current confirmation, ban/deletion and
live grants; token role/firm and query authority fields cannot select another
account's records. It discloses no roster, matter or financial data. No new business
write, migration, database table or outbox action was needed. Supabase Auth performs
local-scope logout; staff clients do not write business tables.

Changed production paths:

- `apps/api/src/modules/auth/{auth.controller,auth.module,staff-context.dto,staff-membership.service}.ts`:
  bounded `GET /auth/memberships`, shared confirmed-account checks, 20-item UUID
  cursor pages, `no-store` and documented validation/error responses.
- `packages/core/src/{index.ts,schemas/staff-membership.ts}` and
  `packages/api-client/src/{index.ts,generated/schema.d.ts}`: strict shared read
  contract, regenerated OpenAPI types and cancellable authenticated client.
- `apps/web/src/features/settings/{LiveFirmSettings,WorkspaceMemberships,StaffSessionActions}.tsx`,
  `staff-memberships.ts`, `apps/web/src/lib/staff-sign-out.ts`,
  `apps/web/src/features/auth/{StaffSessionBoundary,AuthPage}.tsx` and
  `apps/web/src/app/(app)/layout.tsx`: own workspace list, live logout, retry/denial/
  empty/loading states, local-session checks, query/overlay clearing, hard sign-in
  navigation and staff-frame hiding on Auth sign-out/context changes.
- Tests: `apps/api/test/{staff-memberships.integration.test.ts,staff-session.browser.mjs,firm-settings.browser.mjs}`,
  `apps/web/src/features/settings/staff-memberships.test.ts`,
  `apps/web/src/lib/{staff-sign-out.test.ts,firm-api.type-test.ts}`. Web README,
  this tracker and D015 record the scope and limitations. Screenshots are in
  `docs/implementation/evidence/m01-s04a/`.

Relevant PDF cases: M01 p12 isolation/revocation and account context, M15 p26 session
and responsive staff UI, p39 cross-firm/permission failures and p40 unavailable
services with truthful recovery. These are exercised only for this account read
and local logout. Seven connected journeys, matter/file/AI/aggregate isolation,
native/client parity, full session/device policies and hosted release gates remain
unverified. Decoded JWT context is only a cache namespace. Previously issued access
tokens may remain valid until expiry even when Auth accepts sign-out.

Test-first evidence: all seven new API tests failed with missing-route responses
before implementation; the isolated browser reproduced the missing live logout.
After implementation the API tests pass, including forged foreign-firm/owner claims,
pagination, empty grants, live role/grant/firm changes, banned/deleted/unconfirmed
accounts, strict query rejection and unauthenticated access. Deliberately inverting
the actor filter caused four of seven tests to fail; restoring the exact source
made all seven pass. This mutation was never exposed in the running API build.

Commands/results (local Supabase; test-owned Redis on port 6389):

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm build`: pass;
  15 typecheck tasks and 9 build tasks. A test's TS6 `Response.json()` unknown value
  was fixed with shared-schema parsing rather than a cast or suppression. The final
  formatting check initially flagged the regenerated OpenAPI file; that file was
  formatted and the full check passed. `git diff --check` also passes.
- `pnpm --filter '!@lawfirm/db' test`: pass; core 25, web 58, API 7, worker 2,
  mobile 1. The focused membership/logout web tests pass (9 cases), including
  retained/uncheckable sessions and cancellation of late private reads.
- `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/api test:integration`:
  58 pass. The same environment with `pnpm --filter @lawfirm/worker test:integration`:
  23 pass. `pnpm --filter @lawfirm/db test`: 20 pass, including separate tenant
  isolation and existing clean/upgrade/guarded-rollback migration checks.
- `pnpm --filter @lawfirm/api-client exec openapi-typescript http://localhost:3300/openapi.json -o src/generated/schema.d.ts`:
  pass; final running API generated the typed contract.
- `env RUN_SESSION_ONLY=1 BROWSER_ARTIFACT_DIR="$PWD/docs/implementation/evidence/m01-s04a" node apps/api/test/firm-settings.browser.mjs`:
  pass; real account discovery, private-firm exclusion, held refresh hiding old
  names, failed read/retry, live role change, actual account-ban denial, no-grant
  empty state, 320/768/1024/1440 widths without overflow, accessible sign-out name,
  disabled pending action, Auth outage/local removal notice, successful sign-out
  after reauthentication and protected-route redirect. Injected network errors and
  intentionally cancelled reads were expected; no browser runtime exceptions.
- `env RUN_PROVISION_ONLY=1 RUN_WORKER=1 REDIS_URL=redis://127.0.0.1:6389 BROWSER_ARTIFACT_DIR=<temporary-evidence> node apps/api/test/firm-settings.browser.mjs`:
  pass; existing first-firm setup, lost-response/refresh recovery and durable worker
  check. `env RUN_INVITATION_ONLY=1 BROWSER_ARTIFACT_DIR=<temporary-evidence> node apps/api/test/firm-settings.browser.mjs`:
  pass; existing invitation flow and real recipient session refresh.
- `pnpm audit --audit-level high --json`: **fails**, unchanged 34 high, 16 moderate,
  1 low, 0 critical. No dependency or lockfile edits in this slice; remediation is
  a separate M00 release blocker. No checks were disabled or thresholds weakened.

Review covered correctness, readability, architecture, security and performance:
bounded reads/locks, actor-only joins, current-account validation, strict consumer
parsing, generated contracts, truthful Auth outcomes and cache cancellation.
Thirty-two protected baseline files (including prior migrations, CI, lockfile,
design CSS and timer behavior) retained their initial hashes. Final snapshot comparison
found 37 changed paths, 866 untouched existing paths and no unexpected changes or
deleted baseline files. No staging, commits,
merges, deployments or remote resources were changed. Temporary test accounts and
contexts are fixture-owned and cleaned. The isolated Chrome process and labeled
temporary Redis container were stopped/removed after final browser verification;
test-owned workers had exited. Local Supabase was preserved; HTTP checks confirmed
staff sign-in on port 3100 and the final API's OpenAPI endpoint on port 3300 remain
available. API queue availability is now unavailable/unconfirmed without the local
test Redis/worker; committed business/outbox records remain durable. This is not
hosted readiness evidence.

Skills applied by phase: `@context-engineering`, `@planning-and-task-breakdown`,
`@incremental-implementation`, `@test-driven-development`,
`@api-and-interface-design`, `@security-and-hardening`, `@frontend-ui-engineering`,
`@browser-testing-with-devtools`, `@source-driven-development`,
`@debugging-and-error-recovery`, `@code-review-and-quality`,
`@documentation-and-adrs` and `@git-workflow-and-versioning`. No DevTools MCP was
available; browser evidence used the repository's isolated, test-owned CDP harness.
Installed Auth SDK behavior and official sign-out documentation informed D015.

External blockers persist: hosted Supabase project URL/name and isolated staging
designation; Vercel domain/env setup; persistent API/worker/Redis hosting; Microsoft
365/Google OAuth registrations; provider delivery access; hosted backup/restore and
pilot evidence. No credentials were requested in source or invented integrations.

Next dependency-ready slice: **M01-S04b audited active-firm selection**. Design and
test the authoritative selection record/command with actor/request/key validation,
current target membership, retry receipts and audit; connect genuine Auth renewal
and an authorized target-firm read; test concurrent selection, revocation, stale
context and cache clearing before exposing a switch control. Then add matter
grants before M02 universal records/profiles, M03 adapters and M04 documents.
Whole first-five-module completion remains **0/5**: M00/M01 partial; M02–M04
demo-only. M22 remains deferred until the core is stable.

## October 8, 2026 — M01-S04b audited active-firm selection

**Slice locally complete; M01 and M15 remain partial.** Previously, staff could
discover live memberships and sign out, but Auth chose the oldest membership and
there was no durable selection command. The live sidebar/avatar still used demo
firm/user metadata. Staff can now use Settings → Your workspaces → Use workspace →
Confirm workspace switch to select a currently granted firm for this Auth login.
Selection commits in Postgres with a revision, receipt and audit. The frame stays
hidden until genuine Auth renewal and an authorized target-firm read succeed.
The live shell shows actual authorized firm/account/role metadata; explicit preview
and other fixture domains retain their existing design and behavior.

Prerequisites: the existing M00 authenticated API/transaction/audit/receipt
foundation, M01 confirmed accounts, live memberships and Auth hook, and S04a
membership discovery/logout. Affected records are server-only session contexts,
current Auth sessions/accounts, firms/memberships, command receipts and audit logs.
An authenticated confirmed actor may select only their own live Auth session and
live firm grant. No new administrative or financial capability is granted. Client
publication, matter grants and native selection controls are outside this slice.

Implementation and changed paths:

- `packages/core/src/schemas/staff-firm-selection.ts`,
  `packages/core/src/schemas/firm.ts`, `packages/core/src/index.ts`: strict selection,
  revision and receipt contracts; optional verified session claims; decoded scope
  for cache/intent binding only.
- `packages/db/src/schema/staff-session-contexts.ts`, schema `index.ts` and
  `execution.ts`: server-owned context, membership association, positive revision
  and actor/key receipt uniqueness for `staff.context.select.v1`.
- `supabase/migrations/20261007225253_staff_session_contexts.sql`,
  `20261007225254_staff_session_context_security.sql`, corresponding snapshot and
  journal append: additive context records, forced RLS, protected provenance,
  current-session authorization and per-session Auth hook. All 15 prior SQL
  migrations and the previous journal entry prefix are preserved.
- `supabase/rollbacks/20261007_staff_session_contexts.sql`: restores the prior
  hook/helper only when no selection or receipt/audit history would be erased.
  Used installations require a reviewed forward correction.
- `apps/api/src/modules/auth/staff-firm-selection.service.ts`, `auth.controller.ts`,
  `auth.module.ts`, `staff-context.dto.ts`, `common/auth/auth-claims.ts`,
  `staff-access.service.ts` and `confirmed-account.ts`: bounded authenticated
  `GET /auth/active-firm` and `POST /auth/active-firm`, strict inputs/action key,
  current account/session/grant checks, reviewed revision and retry receipts.
  Existing locked domain commands share the profile/session lock boundary with
  selection; an already-authorized write completes before a concurrent switch.
- `packages/api-client/src/index.ts`, generated `schema.d.ts`: generated public
  wire types, cancellable reads and explicit keyed commands without implicit
  mutation retries.
- `apps/web/src/features/settings/WorkspaceMemberships.tsx` and
  `staff-firm-selection.ts`; `features/auth/StaffWorkspaceTransition.tsx` and
  `StaffSessionBoundary.tsx`; `lib/firm-session.ts`: reviewed selection, same-intent
  recovery, actual Auth renewal, target read, per-session/revision cache boundary
  and frame hiding. Lost responses retain the same key; a saved selection with a
  failed refresh/read retries access verification without another command.
- `apps/web/src/lib/staff-shell.ts`, shell `AppSidebar.tsx` and `AppTopBar.tsx`:
  current authorized metadata, truthful loading/unavailable states and preserved
  preview/design behavior. `apps/web/README.md` documents the working interaction.
- `apps/api/test/staff-firm-selection.integration.test.ts`,
  `staff-firm-selection.browser.mjs`, `firm-settings.browser.mjs`;
  `apps/web/src/features/settings/staff-firm-selection.test.ts`,
  `lib/staff-session-scope.test.ts`, `lib/staff-shell.test.ts`;
  `packages/db/test/staff-session-migration.test.ts` and
  `staff-invitation-migration.test.ts`: meaningful selection, authorization,
  retry, race, migration and browser evidence. `apps/worker/test/database.ts`
  supplies Auth sessions in disposable migration fixtures; production worker
  behavior is unchanged.
- `docs/implementation/DECISIONS.md` D016 records the per-login revision/lock
  contract, upgrade/rollback tradeoffs and installed SDK/official sources.
  Nine final screenshots are in `docs/implementation/evidence/m01-s04b/`.

PDF evidence: p12 M01 multi-firm selection/access, p26 M15 working staff interface,
and pp39–40 authorization/revocation/replay/recovery risks are **partially exercised**.
Integration tests prove foreign/revoked/deleted grants and unavailable accounts
cannot select; missing/foreign/expired sessions cannot select; identical concurrent
requests commit one context/receipt/audit; changed input, stale revisions and an
older replay cannot restore another choice. Revocation is rechecked on replay.
Old context tokens fail API and authenticated SQL reads immediately, including
A → B → A, while an independent Auth login keeps its scope. Direct client writes
to session contexts are denied. A blocked authorized firm write is serialized
before selection commits. This is evidence for these cases, not completion of
all acceptance scenarios on those pages or any of the seven connected journeys.

Tests began red: six new integration tests returned 404 before the API existed;
new web tests lacked the helpers. Final review added a race test that initially
proved a blocked firm write could finish after switching; shared profile/session
locks fixed it. Migration helper parameter ambiguity, a worker fixture missing
`auth.sessions`, and a browser assertion about an existing read-only input were
resolved; the final checks below pass without skips or weakened assertions.
The race test's cleanup was extended for the existing rename outbox; exact owned
fixtures left by the earlier failed run were removed after ownership checks.

| Exact command                                                                                                                                                   | Outcome                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm supabase migration up --local`                                                                                                                            | PASS, the two new migrations applied locally                                                                                                                                                                                                                      |
| `pnpm --filter @lawfirm/db db:check`                                                                                                                            | PASS, migration journal consistency                                                                                                                                                                                                                               |
| `pnpm --filter @lawfirm/db test`                                                                                                                                | PASS, 21 tests/5 files; clean install, upgrade, unused/used rollback and separate tenant/RLS isolation suite                                                                                                                                                      |
| `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/api test:integration`                                                                              | PASS, 67 tests/8 files, including 9 selection tests and the reproduced write/switch race                                                                                                                                                                          |
| `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/worker test:integration`                                                                           | PASS, 23 tests/3 files after the Auth-session fixture correction                                                                                                                                                                                                  |
| `pnpm --filter '!@lawfirm/db' test`                                                                                                                             | PASS, 99 tests: core 25, web 64, API 7, worker 2, mobile 1; repeated after the final authorization fix                                                                                                                                                            |
| `pnpm typecheck`                                                                                                                                                | PASS, all 15 tasks including native and generated contracts                                                                                                                                                                                                       |
| `pnpm lint`                                                                                                                                                     | PASS after the final authorization fix                                                                                                                                                                                                                            |
| `pnpm format:check` and `git diff --check`                                                                                                                      | PASS; focused formatting only, no unrelated changes                                                                                                                                                                                                               |
| `pnpm build`                                                                                                                                                    | PASS, all 9 tasks; final built API restarted locally on port 3300                                                                                                                                                                                                 |
| `env RUN_SELECTION_ONLY=1 BROWSER_ARTIFACT_DIR=docs/implementation/evidence/m01-s04b node apps/api/test/firm-settings.browser.mjs`                              | PASS against the final built API: actual Auth login/renewal, committed response loss, one receipt/audit, failed target read, recovery, read-only target, actual shell metadata, revocation recovery, named controls and 320/768/1024/1440 widths without overflow |
| `env RUN_PROVISION_ONLY=1 RUN_WORKER=1 REDIS_URL=redis://127.0.0.1:6389 BROWSER_ARTIFACT_DIR=<temporary-evidence> node apps/api/test/firm-settings.browser.mjs` | PASS, existing provision/renewal/lost-response and durable worker outcome                                                                                                                                                                                         |
| `env RUN_INVITATION_ONLY=1 BROWSER_ARTIFACT_DIR=<temporary-evidence> node apps/api/test/firm-settings.browser.mjs`                                              | PASS, existing invitation/recipient real-Auth renewal and permission/responsive checks                                                                                                                                                                            |
| `env RUN_SESSION_ONLY=1 BROWSER_ARTIFACT_DIR=<temporary-evidence> node apps/api/test/firm-settings.browser.mjs`                                                 | PASS, membership isolation/loading/error/empty states, logout and local session removal                                                                                                                                                                           |
| `pnpm audit --audit-level high --json`                                                                                                                          | FAIL, unchanged 34 high/16 moderate/1 low/0 critical; no dependency or lockfile changes in this slice                                                                                                                                                             |

Review covered correctness, readability, architecture, security and performance:
current grants/account/session checks, stale/replayed revisions, transaction lock
ordering, bounded queries/locks, strict consumer parsing, Auth recovery and cache
isolation. No global WCAG/performance certification or native release build is
claimed. Selection has no asynchronous domain effect, so its transaction contains
context/receipt/audit without an invented no-op outbox job. Existing domain writes
still commit their business changes and outbox together. Git changes remain
reviewable; no staging, commit, merge, deployment or remote resource changes.

Final snapshot review found 49 changed paths, 879 untouched existing paths and no
missing baseline files or unexpected edits. All earlier SQL migrations retained
their hashes. The isolated test-owned Chrome was stopped, the labeled temporary
Redis container was removed, and test-owned workers had exited. Browser fixtures
were cleaned by the harness. Existing local Supabase/staff web were preserved;
HTTP checks returned 200 for `/sign-in` on port 3100 and `/openapi.json` on the
final built API on port 3300. Without the temporary Redis/worker, local queue
readiness is unavailable/unconfirmed; durable business/outbox records remain.
These local checks do not establish hosted readiness.

Skills used by phase: `@context-engineering`, `@planning-and-task-breakdown`,
`@incremental-implementation`, `@test-driven-development`,
`@api-and-interface-design`, `@security-and-hardening`, `@deprecation-and-migration`,
`@frontend-ui-engineering`, `@browser-testing-with-devtools`,
`@source-driven-development`, `@debugging-and-error-recovery`,
`@code-review-and-quality`, `@documentation-and-adrs` and
`@git-workflow-and-versioning`. The tests/contract/review skills guided the durable
boundary; UI/browser skills checked actual Auth and recovery. No DevTools MCP was
available, so the existing isolated CDP harness supplied browser evidence.

Remaining gates: matter grants/ethical walls, fuller staff capability and financial
boundaries, MFA/device/session policies, invitation delivery, native/client cache
and platform parity, and all seven connected journeys. M00 still lacks hosted
recovery/operational evidence and dependency remediation. External prerequisites
remain the hosted Supabase project URL/name and isolated staging designation,
Vercel domain/env setup, persistent API/worker/Redis hosting, Microsoft 365/Google
OAuth registrations and provider access, backup/restore and pilot evidence.

Next dependency-ready slice: **M01-S05 matter grants alongside the first M02
universal matter records**. Inspect the existing matter/party schema and policies,
add tests for unrestricted/restricted membership and revocation, then implement one
authorized durable matter creation/read path through shared contracts and staff web.
Preserve nationwide profiles, people/organizations and optional court fields;
do not use demo practice areas or litigation fields as universal requirements.
Whole first-five-module completion remains **0/5**: M00/M01 partial, M02–M04
demo-only. M22 remains post-core and untouched.

## October 8, 2026 — M01-S05a / M02-S01 durable private matters

**Slice locally complete; M01/M02/M15 remain partial.** The current repository,
instructions, dirty working tree and relevant PDF pages were rechecked. Previously
there were no matter tables, grants or endpoints; Matters/list/detail used fixture
records and local forms. Live staff can now create a non-court matter, open its
authorized detail and read the paginated accessible list after a reload. The
creator receives a manager grant. A same-firm owner without a grant sees neither
the record nor its count. Explicit preview retains the original matter screens.

Prerequisites: M00 command/receipt/audit foundation and M01 current account,
membership, Auth session and selected-firm authorization. Records: `matters`,
`matter_access`, command receipts and audits; existing accounts/sessions/memberships
are checked and locked. Initial creation is restricted to live owner/admin/attorney
roles. Reader/manager grant labels confer only the currently implemented read
behavior; financial, client, file, publication and access-management commands are
not inferred from them. D017 records this conservative initial boundary.

Changed paths and contracts:

- `packages/core/src/schemas/matter.ts` and `src/index.ts`: strict creation,
  record/list/cursor/receipt contracts. Title plus optional internal reference;
  no mandatory court, state or fixed practice-area enum.
- `packages/db/src/schema/matters.ts` and schema `index.ts`;
  `supabase/migrations/20261007233643_matters_and_grants.sql`,
  `20261007233644_matter_access_security.sql`, new generated snapshot/journal
  append; `supabase/rollbacks/20261007_matters_and_grants.sql`: same-firm composite
  associations, explicit grants, immutable provenance, forced RLS and no client
  business writes. An unused upgrade reverses; a used upgrade refuses history loss.
- `apps/api/src/modules/matters/{matter.controller,matter.service,matter.module}.ts`
  and `src/app.module.ts`: authenticated `POST /matters`, `GET /matters`,
  `GET /matters/:matterId`, server role/grant checks, bounded transactions/locks,
  same-intent replay and atomic matter/grant/receipt/audit. There is no async effect
  in this slice, so no fabricated provider delivery or no-op outbox job.
- `packages/api-client/src/index.ts` and generated `schema.d.ts`: real OpenAPI
  cursor/body/response contracts and cancellable/no-store reads, explicitly keyed
  commands without implicit mutation retry. Shared contracts remain usable by native.
- `apps/web/src/features/matters/{CreateMatterForm,LiveMattersPage,LiveMatterPage}.tsx`,
  `live-matters.ts`, `use-live-matter-client.ts`, `LiveMatters.module.css`; existing
  `MattersPage.tsx` and `MatterPage.tsx`: live list/create/detail, scope binding,
  strict parsing, recovery and unavailable states. An uncertain creation retains
  its original key through transient list errors; confirmed denial/context changes
  discard protected local form state. Error/refetch/denial hides warm records.
- `apps/web/src/components/shell/AppSidebar.tsx`: the live sidebar omits its
  fixture matter count. Other demo domains, timer, money/duration conventions,
  root design CSS and unrelated edits are preserved.
- `apps/api/test/matter.integration.test.ts`, `matter.browser.mjs` and focused
  branch/cleanup in `firm-settings.browser.mjs`; web `live-matters.test.ts`;
  `packages/db/test/matter-migration.test.ts`, `rls-isolation.test.ts` and
  `staff-session-migration.test.ts`: command, access, count, revocation, migration,
  recovery and browser coverage. The older session migration test now bounds its
  own module's migration range; the new test covers the complete latest history.
- `apps/web/README.md`, this tracker and `DECISIONS.md` D017: actual working
  behavior, limits, data/permission decisions and official versioned references.
  Eleven final screenshots are in `docs/implementation/evidence/m01-s05a/`.

PDF scenarios exercised: p12 and p39 cross-firm/restricted matter reads and writes,
current-role enforcement, grants and revocation; p13 non-court advisory/transaction
records with no hearing/court; p26 live staff interfaces and recovery. Tests cover
two concurrent identical creation requests committing one matter/grant/audit;
changed-payload key conflict, replay after lost response and replay denial after
grant removal; every live staff role; missing authentication/expired session;
membership/matter removal; cross-firm associations; inaccessible records and exact
counts through the actual PostgREST client surface. Native/client parity, files,
generated content and AI/worker revocation are unverified future gates.

Failures reproduced and fixed: six API tests returned 404 before implementation;
two web tests lacked their helpers. The clean/local migration then caught generated
SQL adding a foreign key before its referenced unique index; only the new migration
was corrected. Strict test typing was fixed with validated response schemas and
explicit parameter types. Browser review reproduced an unresolved creation intent
being discarded by list refresh; its failing regression now passes across a
transient refresh failure. At 320px, card headings were clipped; scoped wrapping
and font inheritance fixed them, guarded by a heading-width assertion. No tests,
assertions or quality thresholds were disabled.

| Exact command                                                                                                                   | Outcome                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm supabase migration up --local`                                                                                            | PASS, both new migrations applied after correcting the new SQL ordering                                                                                                                                                                                                                                              |
| `pnpm --filter @lawfirm/db db:check`                                                                                            | PASS, migration consistency                                                                                                                                                                                                                                                                                          |
| `pnpm --filter @lawfirm/db test`                                                                                                | PASS, 25 tests/6 files; clean/upgrade/down, historical tests and blocking PostgREST tenant/matter isolation suite                                                                                                                                                                                                    |
| `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/api test:integration`                                              | PASS, 74 tests/9 files including 7 new matter tests and prior Auth/selection/write-race regressions                                                                                                                                                                                                                  |
| `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/worker test:integration`                                           | PASS, 23 tests/3 files with latest migrations                                                                                                                                                                                                                                                                        |
| `pnpm --filter @lawfirm/web test src/features/matters/live-matters.test.ts`                                                     | PASS, 2 new consumer/retry tests after the red run                                                                                                                                                                                                                                                                   |
| `pnpm --filter '!@lawfirm/db' test`                                                                                             | PASS, 101 tests: core 25/web 66/API 7/worker 2/mobile 1                                                                                                                                                                                                                                                              |
| `pnpm typecheck`                                                                                                                | PASS, 15 tasks including native/shared/generated consumer contracts                                                                                                                                                                                                                                                  |
| `pnpm lint`                                                                                                                     | PASS                                                                                                                                                                                                                                                                                                                 |
| `pnpm format:check` and `git diff --check`                                                                                      | PASS, focused formatting and whitespace review                                                                                                                                                                                                                                                                       |
| `pnpm build`                                                                                                                    | PASS, 9 tasks; native release binaries remain unverified                                                                                                                                                                                                                                                             |
| `pnpm --filter @lawfirm/api-client exec openapi-typescript http://localhost:3300/openapi.json -o src/generated/schema.d.ts`     | PASS against the built API, including documented `afterId` cursor                                                                                                                                                                                                                                                    |
| `env RUN_MATTER_ONLY=1 BROWSER_ARTIFACT_DIR=docs/implementation/evidence/m01-s05a node apps/api/test/firm-settings.browser.mjs` | PASS, actual Auth login; loading/empty/create/pending; committed response loss and same-key recovery through a failed list refresh; persistence on reload; detail 503/retry; grant revocation and live role denial; named inputs, initial focus/Tab and 320/768/1024/1440 layouts with readable headings/no overflow |
| `pnpm audit --audit-level high --json`                                                                                          | FAIL, 35 high/20 moderate/2 low/0 critical; dependencies/lockfile unchanged                                                                                                                                                                                                                                          |

The audit's advisory feed expanded since S04b. New high finding
[`GHSA-cjq9-62q9-8jv4`](https://github.com/advisories/GHSA-cjq9-62q9-8jv4)
affects installed Next.js 16.3.6; the listed fix is 16.3.8. The advisory identifies
allow-listed remote image URLs as the prerequisite and says an app without
`images.remotePatterns` is unaffected. Both checked-in Next configs lack that
setting, and no `next/image` imports were found, so this specific path is not
currently configured. This does not clear other findings or the failing audit.
Dependency remediation remains an M00 release blocker, tracked for review in the
next M00 remediation slice and before enabling remote-image configuration or
deployment. Do not bulk-upgrade or weaken the audit threshold in a domain slice.

Review covered correctness, readability, architecture, security and performance:
explicit grants without owner bypass, same-firm associations, live roles/account/
session checks, replay revalidation, scoped cache/draft behavior, transactional
lock order, strict contracts and bounded 20-item pagination. Local PostgreSQL is
17.6, ORM/Kit 0.45.2/0.31.10 and Next.js 16.3.6. Runtime screenshots were visually
reviewed. Broad WCAG certification, representative scale and hosted recovery are
not claimed. Skills applied: `@context-engineering`, `@planning-and-task-breakdown`,
`@incremental-implementation`, `@test-driven-development`,
`@api-and-interface-design`, `@security-and-hardening`, `@deprecation-and-migration`,
`@frontend-ui-engineering`, `@browser-testing-with-devtools`,
`@source-driven-development`, `@debugging-and-error-recovery`,
`@observability-and-instrumentation`, `@code-review-and-quality`,
`@documentation-and-adrs` and `@git-workflow-and-versioning`. They guided the
thin slice, durable boundaries, failure reproduction, installed-version sources,
UI/runtime checks and review. No DevTools MCP was available; the repository's
isolated test-owned CDP harness supplied evidence without inspecting personal
browser data or using DOM mutations for actions.

Remaining module gates: production grant/revoke commands and policy revisions,
staff membership/capability management, fuller financial/client/file/AI boundaries,
MFA/devices, immediate/realtime cache revocation and native/client platforms.
M02 still needs contacts/organizations/aliases, multiple clients/party roles,
responsible assignments/history, configurable profiles/fields, separate jurisdiction
references, lifecycle/notes/activity/search and M18 coverage. Protected persistent
drafts/offline retry and all seven connected journeys remain pending. The initial
creation intent is in memory; reloading during an unresolved request loses that
intent, while any committed matter remains durable and visible if still granted.

External prerequisites persist: isolated hosted Supabase designation/public project
URL/name, Vercel env/domain setup, persistent API/worker/Redis hosting, Microsoft
365/Google OAuth registration/provider access, hosted backup/restore and pilots.
None blocks this local matter slice. No secrets or fake connections were added;
no staging, commits, merges, deployment or remote resources were changed.

Next dependency-ready domain slice: **M01-S05b audited matter grant/revoke
management**. Add revision-aware, keyed commands and access history, verify the
actor's current matter manager grant and live role, admit only current same-firm
staff, prevent unintended loss of the last recoverable manager, and revalidate
replays after policy/grant changes. Connect the matter staff-access UI and test
revocation across API/RLS/counts/caches. Preserve restricted matters without an
implicit administrator bypass. Then extend M02 with contacts/party links and
published configurable profiles. Whole first-five-module completion remains **0/5**:
M00/M01/M02 partial, M03/M04 demo-only. M22 remains post-core and untouched.

Session cleanup and preservation: stopped only the isolated test Chrome (port
9223 and the matching snapshot profile) and removed only Redis container
`clepso-m01-s05a-redis` after verifying its ownership label. Browser fixtures were
cleaned by their owned UUIDs. The existing staff dev server and local Supabase
remain running; the built API remains on port 3300. `/sign-in` and
`/openapi.json` returned HTTP 200 after cleanup. Worker/Redis readiness after
cleanup and hosted recovery remain unverified.

The session snapshot review identifies 45 changed/new paths, including 11 runtime
screenshots; 913 existing paths remain byte-for-byte unchanged. All 17 previous
SQL migrations and the previous journal entries are preserved. Lockfile, CI,
root design CSS, existing Next configs and unrelated edits are unchanged by this
slice. No pre-existing changes were staged or committed. The final formatting
check initially caught formatting in the three added isolation tests; that file
was formatted and the check rerun without changing assertions.

## October 8, 2026 — M01-S05b audited matter access management

**Locally complete slice; M01/M02/M15 remain partial.** The tracker, actual dirty
working tree, repository instructions and PDF p12/p13/p26/p39/p40 were checked.
S05a supplied durable restricted matters, creator grants and authorized reads;
there were no staff access-management endpoints or controls. The live matter now
supports selecting firm staff, granting/changing/revoking access with a reason,
reading current assignments/history and recovering an uncertain command result.

Prerequisites: M00 transactional receipt/audit foundation and current account,
Auth session, selected firm/membership and explicit matter grants from M01-S04b/
S05a. Records: `matters.access_revision`, existing `matter_access` revisions and
soft revocation, command receipts and append-only audit history. Current live
owner/admin/attorney role plus manager grant is required for access administration.
Reader grants support all current staff roles; owners/admins have no ethical-wall
bypass. Manager grants require an eligible, current, available recipient. Separate
financial/client/file/AI permissions are not inferred from this grant. D018 records
the conservative initial capabilities, last-manager protection and recovery limits.

Changed paths:

- `packages/core/src/schemas/matter-access.ts`, core `index.ts`: strict input,
  assignment/candidate/history/receipt contracts and bounded cursors.
- `packages/db/src/schema/{matters,execution}.ts`;
  `supabase/migrations/20261008001104_matter_access_revision.sql`, new snapshot and
  journal append; `supabase/rollbacks/20261008_matter_access_revision.sql`: independent
  policy revision and partial history index. Existing grants/content/RLS remain.
- `apps/api/src/modules/matters/matter-access.{controller,service}.ts` and
  `matter.module.ts`: manager-authorized GET access/candidates/history and POST
  access-changes. Validated reason/expected revision/stable key; bounded locks and
  reads; atomic grant/policy/receipt/audit; live actor/recipient checks on replay.
  No external effect exists, so no no-op outbox or provider delivery is invented.
- `packages/api-client/src/{index,generated/schema.d}.ts`: generated OpenAPI types,
  authenticated/cancellable/no-store reads and explicitly keyed command.
- `apps/web/src/features/matters/{MatterAccessForm,MatterStaffAccess}.tsx`,
  `matter-access.ts`, `matter-access.test.ts`; focused updates to `LiveMatterPage.tsx`,
  `CreateMatterForm.tsx`, `LiveMatters.module.css`: actual access workflow, permission
  and recovery states. No frontend business-table writes or money/duration changes.
- `apps/api/test/matter-access.integration.test.ts`, `matter-access.browser.mjs`
  and focused branch/cleanup in `firm-settings.browser.mjs`;
  `packages/db/test/matter-access-migration.test.ts`, `matter-migration.test.ts`:
  12 domain integration cases, 2 consumer cases and full-history migration coverage.
  S05a's migration test bounds its own range; current full-history coverage remains.
- `apps/web/README.md`, tracker and `DECISIONS.md` D018. Fifteen final runtime
  screenshots, including the narrow access form, are in `evidence/m01-s05b/`.

Acceptance evidence: p12/p39 cross-firm and ungranted owner requests disclose no
matter roster/history; a reader cannot administer access; every live staff role is
checked independently of claimed owner role. Same-key concurrent requests commit
one grant/policy increment/audit; changed input and stale review conflict. Grant,
revocation and regrant retain provenance and advance revisions. An existing token
loses API/RLS/count access after a real revocation command. Recipient ban/role
change, actor expired session and revoked manager deny replay. Later policy changes
conflict instead of replaying old approval. Inactive managers do not permit removal
of the last eligible manager; competing removals leave one. Audit insertion failure
rolls back grant, policy and receipt, then the same intent can commit once after
recovery. Assignment/candidate/history pagination has no duplicate/missing rows.

The p26 staff browser path uses real Auth sign-in and the built API. It verifies
loading/empty history, committed response loss, same-key recovery across a 503
list refresh, explicit last-manager conflict, grant/revoke/handoff, history after
reload, live role denial and actual actor grant revocation. Warm names/forms/history
and matter title hide after denial. Labels/AX names, native select typeahead and
Tab order are verified; 320/768/1024/1440 screenshots show readable headings and
no horizontal overflow. Current history labels use authorized staff data, with
stable IDs as a fallback. Full WCAG/platform-parity certification is not claimed.

| Exact command                                                                                                                          | Outcome                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm supabase migration up --local`                                                                                                   | PASS, additive migration applied locally                                                                                             |
| `pnpm --filter @lawfirm/db db:check`                                                                                                   | PASS, migration journal/snapshot consistency                                                                                         |
| `pnpm --filter @lawfirm/db test`                                                                                                       | PASS, 26 tests/7 files, clean/full-history upgrade, unused down/reapply, used refusal and blocking PostgREST tenant/matter isolation |
| `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/api test:integration`                                                     | PASS, 86 tests/10 files, including 12 new access cases                                                                               |
| `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/worker test:integration`                                                  | PASS, 23 tests/3 files with current migrations                                                                                       |
| `pnpm --filter @lawfirm/web test src/features/matters/matter-access.test.ts`                                                           | PASS, 2 cases after the initial missing-helper failure                                                                               |
| `pnpm --filter '!@lawfirm/db' test`                                                                                                    | PASS, 103 tests: core 25/web 68/API 7/worker 2/mobile 1                                                                              |
| `pnpm typecheck`                                                                                                                       | PASS, 15 tasks including native/shared/generated clients                                                                             |
| `pnpm lint`                                                                                                                            | PASS, no warnings; an unnecessary callback hook was removed after its dependency warning                                             |
| `pnpm format:check` and `git diff --check`                                                                                             | PASS, supported source/doc formatting and whitespace checks                                                                          |
| `pnpm build`                                                                                                                           | PASS, 9 tasks; native release binaries remain unverified                                                                             |
| `pnpm --filter @lawfirm/api-client exec openapi-typescript http://localhost:3300/openapi.json -o src/generated/schema.d.ts`            | PASS, generated against the built API, including all access cursors/commands                                                         |
| `env RUN_MATTER_ACCESS_ONLY=1 BROWSER_ARTIFACT_DIR=docs/implementation/evidence/m01-s05b node apps/api/test/firm-settings.browser.mjs` | PASS against final built API; recovery/revocation/history/current roles, responsive and keyboard/AX checks                           |
| `pnpm audit --audit-level high --json`                                                                                                 | FAIL, unchanged dependency tree: 35 high/20 moderate/2 low/0 critical                                                                |

Failures preserved and corrected: seven integration cases failed with missing
endpoints before implementation; two consumer cases lacked helpers. Strict API
typing caught an inferred candidate row without `userId`; the row type was made
explicit. Focused Prettier initially had no SQL parser for the explicitly supplied
rollback; formatting was restricted to supported source/doc types without changing
root rules. macOS headless select arrows did not commit the browser choice; native
typeahead plus Tab did, without DOM value mutation. A callback hook lint warning
was removed. No test, assertion, audit threshold or permission gate was disabled.

Review checked correctness, readability, architecture, security and performance:
strict scope-bound contracts, explicit manager authority, actor/recipient/live
membership locks, current-policy receipt checks, single-effect transactions,
immutable provenance and protected history, no client table writes, no sensitive
telemetry, 20-item pagination, microsecond-safe history cursor, indexed reads and
a bounded remaining-manager check. The core/web/native contracts still typecheck;
other fixture domains and root design styles are unchanged. Structured request,
command/replay and duration logs identify applied/replayed/rejected/failed paths;
aggregate monitoring, hosted recovery and representative load are still M00/M21.

Skills: `@context-engineering`, `@planning-and-task-breakdown`,
`@incremental-implementation` guided the current-code audit and ordered thin slice;
`@test-driven-development` established failing requirements and outcome tests;
`@api-and-interface-design`, `@security-and-hardening` covered contracts, trust
boundaries, current authorization and replay; `@deprecation-and-migration` guarded
additive history/up/down; `@frontend-ui-engineering`, `@browser-testing-with-devtools`
covered the existing tokens, states, keyboard and runtime evidence;
`@source-driven-development` checked installed versions, official PostgreSQL/Drizzle
and local Next guidance; `@debugging-and-error-recovery` preserved and fixed type,
lint, formatter and browser harness failures; `@observability-and-instrumentation`
covered command/request diagnosis; `@code-review-and-quality`,
`@documentation-and-adrs`, `@git-workflow-and-versioning` covered final review,
D018/tracker and dirty-tree preservation. No DevTools MCP exists in this session;
the repository's isolated test-owned CDP harness supplied the browser evidence.

Remaining: editable firm capabilities, membership/role changes and controlled
stranded-matter recovery, financial/client/file/publication authorization, MFA/
device/recovery policy, immediate cross-device cache revocation, AI/worker/file
execution checks and native/client interfaces. Inactive staff are shown with no
effective access; the current staff picker excludes them (API revocation remains
available). In-memory unknown intents survive transient reads but not app reload;
protected persistent drafts/offline retry remain M15. Full M02 party/profile/search/
lifecycle, nationwide configuration and all seven journeys remain incomplete.

External gates are unchanged: designated isolated hosted Supabase project/public
URL/name, Vercel environment/domain setup, persistent API/worker/Redis hosting,
Microsoft 365/Google OAuth and provider access, hosted restore and pilot evidence.
No provider credentials/resources, deployment, staging, merge or commit changed.
The 35-high audit remains an M00 release blocker; D017 tracks reachability of the
Next remote-image finding. No dependency or lockfile changed in this slice.

Cleanup/preservation: only the isolated Chrome with matching profile/port and the
Redis container labelled `m01-s05b` were stopped/removed. Owned Auth/firm/matter/
access/receipt/audit fixtures were removed; test audit triggers were dropped in
finally. The existing staff dev server and Supabase remain; final built API stays
on port 3300. Staff `/sign-in` and API `/openapi.json` returned HTTP 200 after
cleanup. Worker readiness after test Redis removal is not claimed. The session
snapshot identifies 43 changed/new paths (15 screenshots), 943 unchanged existing
paths, no missing baseline files, preserved hashes for all 19 previous SQL
migrations and preserved previous journal entries. Lockfile, CI, existing configs,
root design CSS and unrelated edits are unchanged; nothing was staged/committed.

Next: **M01-S06 audited staff membership/role changes**, including current actor
capabilities, safe replay, live access revocation and explicit recovery needs for
restricted matters. Then continue M02 contacts/party links and configurable
profiles, M03 adapters and M04 files. Whole first-five completion remains **0/5**:
M00/M01/M02 partial, M03/M04 demo-only. M22 remains post-core and untouched.

## October 8, 2026 — M01-S06a audited staff role changes

**Locally complete slice; M01/M15 remain partial.** Repository instructions,
the existing dirty code, tracker and blueprint p12/p26/p39/p40 were checked.
Invitations, active-firm selection and explicit matter access were already durable;
staff role editing and role history had no production command or interface.
Settings now lets current owners/admins review firm staff, record a role change
with a reason, inspect durable history and recover an uncertain request.

Prerequisites: M00 transaction/receipt/audit and M01 confirmed account, live Auth
session, active-firm context and S05b matter grant administration. Affected records:
`firm_members.revision`, membership roles, command receipts and append-only audits.
Owner/admin have the initial `firm.staff.roles.manage` capability. Only a current
owner can assign owner or change an existing owner's role. The last available
confirmed owner cannot be demoted. A manager-role demotion cannot strand an existing
matter; an authorized matter manager must first complete a handoff. Firm-level
errors disclose no restricted matter names, identifiers or counts. Existing grants
are retained and remain independently required. D019 records these boundaries,
ordered locking, replay and recovery limitations. No asynchronous effect exists,
so the command does not manufacture an outbox job or provider delivery.

Changed paths (48, including 11 screenshots):

- `packages/core/src/schemas/{staff-role,staff-context}.ts`, `src/index.ts`:
  strict role command, current staff/history, revision, receipt and cursor
  contracts; the role-management capability is shared across consumers.
- `packages/db/src/schema/{tenancy,execution}.ts`;
  `supabase/migrations/20261008004318_familiar_fat_cobra.sql`,
  `meta/20261008004318_snapshot.json`, journal append and
  `supabase/rollbacks/20261008_staff_role_revision.sql`: additive membership revision,
  positive revision constraint and partial staff-role history index. Used rollback
  refuses removal of revisions or history. Existing tables/RLS/history are retained.
- `apps/api/src/modules/firms/staff-role.{controller,service}.ts`, `firm.module.ts`:
  owner/admin-scoped paginated staff/history reads and keyed role-change command.
  Live actor/recipient checks, reviewed revision, concurrent owner/manager protection,
  bounded transactions and atomic role/revision/receipt/audit effects.
- `apps/api/src/common/auth/staff-access.service.ts`,
  `modules/auth/staff-{firm-selection,membership}.service.ts`,
  `modules/firms/firm-provision.service.ts`,
  `modules/staff-invitations/staff-invitation.service.ts`: parent firm locks precede
  membership locks in consuming commands. Own-membership/selection/invitation read
  listings use a single statement snapshot; later commands reauthorize. This avoids
  member/firm lock inversion with role changes. Existing context-switch/write
  outcomes remain covered rather than accepting weaker serialization.
- `packages/api-client/src/{index,generated/schema.d}.ts`: generated, authenticated,
  cancellable no-store reads and explicit stable-key commands. DTO names are unique
  to staff roles, with a regression test against the separate matter-access schema.
- `apps/web/src/features/settings/{StaffRoles,StaffRoleForm}.tsx`,
  `StaffRoles.module.css`, `staff-roles.ts`, `staff-roles.test.ts`,
  `LiveFirmSettings.tsx`, `StaffAccessCard.tsx`: live staff selection/reason form,
  reviewed membership revision, history and same-intent recovery. Unknown fields
  and staff pagination freeze; transient read errors hide warm records but retain
  the unresolved intent. Confirmed denial unmounts protected controls. Successful
  changes recheck current capabilities, including self-demotion. Scoped controls
  retain 44px minimum touch targets and the Clepso tokens/components.
- `apps/web/src/features/settings/FirmBackgroundWork.module.css`: Settings-scoped
  heading wrapping fixes the existing clipped Processing availability title at
  320px; root design CSS is unchanged.
- `apps/api/test/staff-role.integration.test.ts`, `staff-roles.browser.mjs`,
  focused mode/owned cleanup in `firm-settings.browser.mjs`,
  `staff-context.integration.test.ts`, `staff-firm-selection.integration.test.ts`:
  12 role outcome cases, actual-browser recovery/revocation and the new capability/
  parent-lock observation. Existing outcome assertions are retained.
- `packages/db/test/staff-role-migration.test.ts`,
  `matter-access-migration.test.ts`: full-history clean/upgrade, existing records,
  unused down/reapply and used refusal; the older matter-access test bounds its own
  down/reapply migration range.
- `apps/web/README.md`, this tracker, `DECISIONS.md` D019 and
  `docs/implementation/evidence/m01-s06a/*.png`: 11 final runtime screenshots.

Acceptance evidence is a **subset** of the PDF gates. For p12/p39 authorization,
cross-firm targets and ineligible staff cannot use roster/history/commands; an
ungranted owner still cannot read a restricted matter. All staff roles are tested
against current database authority, independent of JWT owner claims. Banned,
removed or unavailable accounts and expired sessions cannot replay an old approval.
Actual demotion invalidates administrative actions using the old session while
preserving separately authorized reads. Owner-only transitions, unavailable backup
owners and last eligible matter-manager protection are tested. Competing owner
demotions leave one owner; competing membership reviews commit once; role demotion
racing manager removal cannot remove all eligible managers.

Concurrent same-key requests create one revision/receipt/audit; changed payload,
stale review and a later target revision conflict. A scoped audit insertion failure
returns failure and rolls back the membership and receipt; recovery with the same
intent commits once. Staff and microsecond-safe history pagination return complete
nonduplicated pages. These exercise command recovery/no apparently successful
partial write relevant to p40 operations; hosted outages, restoration, full queue
recovery and representative 50-lawyer load remain unverified.

For p26 staff web, actual Auth sign-in and the final built API verify loading,
empty history, committed response loss, a 503 read, original-intent recovery,
last-owner conflict, stale review, reload persistence and actual current-user
demotion. Denial removes controls and warm names. Native input/Tab and AX labels
are checked. At 320/768/1024/1440px the form and Settings headings fit without
horizontal overflow and role controls meet the 44px minimum. The existing matter
access browser journey also passes against the final API. This does not establish
native parity, persistent offline drafts or complete WCAG certification. Reload
loses unknown in-memory intents; history remains durable and authorized.

| Exact command                                                                                                                                                                                      | Outcome                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @lawfirm/db db:generate`                                                                                                                                                            | PASS, additive migration and snapshot generated                                                                                                                  |
| `pnpm supabase migration up --local`                                                                                                                                                               | PASS, new migration applied locally                                                                                                                              |
| `pnpm --filter @lawfirm/db db:check`                                                                                                                                                               | PASS, journal/snapshot consistency                                                                                                                               |
| `pnpm --filter @lawfirm/db test`                                                                                                                                                                   | PASS, 27 tests/8 files, full-history clean/upgrade/down/reapply/refusal and blocking PostgREST tenant/matter isolation                                           |
| `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/api test:integration`                                                                                                                 | PASS, 98 tests/11 files, including 12 new role/contract cases                                                                                                    |
| `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/worker test:integration`                                                                                                              | PASS, 23 tests/3 files with current migrations                                                                                                                   |
| `pnpm --filter @lawfirm/web test src/features/settings/staff-roles.test.ts`                                                                                                                        | PASS, 2 consumer cases after missing-helper RED                                                                                                                  |
| `pnpm --filter '!@lawfirm/db' test`                                                                                                                                                                | PASS, 105 tests: core 25/web 70/API 7/worker 2/mobile 1                                                                                                          |
| `pnpm typecheck`                                                                                                                                                                                   | PASS, 15 tasks, including native and generated contracts                                                                                                         |
| `pnpm lint`                                                                                                                                                                                        | PASS, no warnings                                                                                                                                                |
| `pnpm format:check`                                                                                                                                                                                | PASS, repository source and documentation formatting                                                                                                             |
| `git diff --check`                                                                                                                                                                                 | PASS, whitespace check                                                                                                                                           |
| `pnpm build`                                                                                                                                                                                       | PASS, 9 tasks; native release binaries remain unverified                                                                                                         |
| `pnpm --filter @lawfirm/api-client exec openapi-typescript http://localhost:3300/openapi.json -o src/generated/schema.d.ts`                                                                        | PASS, generated against the built API after unique DTO correction                                                                                                |
| `env RUN_STAFF_ROLES_ONLY=1 BROWSER_ARTIFACT_DIR=docs/implementation/evidence/m01-s06a node apps/api/test/firm-settings.browser.mjs`                                                               | PASS against the final rebuilt API; history/recovery/role denial/stale review/owner protection/keyboard/AX/responsive/touch checks                               |
| `env RUN_MATTER_ACCESS_ONLY=1 BROWSER_ARTIFACT_DIR=/var/folders/np/k8cp22194s7g4208dsj7wvgm0000gp/T/clepso-m01-s06-q19ii5x2/matter-access-regression node apps/api/test/firm-settings.browser.mjs` | PASS, existing grants/revocation/recovery/last-manager/browser regression; evidence kept in temporary session snapshot                                           |
| `env REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/api test:integration test/staff-role.integration.test.ts -t 'last available owner'`                                                   | Mutation check: deliberately inverted owner guard made the test fail (expected 409, received 200); source restored byte-for-byte, then full 98-case suite passed |
| `pnpm audit --audit-level high --json`                                                                                                                                                             | FAIL, unchanged 35 high/20 moderate/2 low/0 critical findings                                                                                                    |

Failures were reproduced and corrected: six initial API tests failed on absent
routes and the consumer suite lacked its helper. Strict generated-client typing
found colliding OpenAPI DTO names; domain-specific names and a contract regression
fixed the actual boundary. Integration checks exposed the new capability expectation
and the changed blocked-query statement; the permission/serialization assertions
remain. The browser's synthetic read failure now lets OPTIONS pass so it tests the
intended GET outage, and native input waits for the refreshed form to be visible.
The responsive heading check found a real clipped title; scoped CSS fixes it. An
unused copied test helper was removed after lint. No project test, assertion,
permission gate or audit threshold was disabled.

Review covered correctness, readability, architecture, security and performance:
scope-bound strict contracts, current authority and recipient locks, firm-before-
membership order, immutable provenance, transaction failure, single-effect replay,
restricted-matter non-disclosure, no client business writes, bounded 20-row reads,
microsecond history cursors and partial indexed history. Local EXPLAIN uses the
backward role-history index scan; representative histories/performance are not
claimed. Structured HTTP/request/command telemetry covers applied/replayed/denied/
failed outcomes; staffing reasons, emails, tokens and bodies stay out of general
logs. Hosted aggregate monitoring/tracing/alerts remain M00/M21 work.

Skills read/applied: `@context-engineering`, `@planning-and-task-breakdown`,
`@incremental-implementation` for the audit and ordered slice;
`@test-driven-development` for failing requirements, race/recovery tests and mutation
verification; `@api-and-interface-design`, `@security-and-hardening` for live
authorization, shared contracts and replay; `@deprecation-and-migration` for additive
history/up/down; `@frontend-ui-engineering`, `@browser-testing-with-devtools` for
existing design tokens and actual browser states; `@source-driven-development` for
installed versions and official PostgreSQL/Drizzle plus installed Next guidance;
`@debugging-and-error-recovery` for reproduced API/contract/lint/browser failures;
`@observability-and-instrumentation` for sanitized durable-outcome diagnosis;
`@code-review-and-quality`, `@documentation-and-adrs`, `@git-workflow-and-versioning`
for the five-axis review, D019/tracker and dirty-tree preservation. The meta skill
guided selective loading; references were loaded only for relevant checks. DevTools
MCP is unavailable; the repository's isolated test-owned Chrome/CDP harness was used.

Remaining M01 gates: membership removal/restoration, exceptional restricted-matter/
last-owner recovery, configurable capabilities, distinct financial/client/publication
permissions, MFA/device/session recovery, file/search/AI/worker execution revalidation,
immediate cross-device cache invalidation and native/client interfaces. Promoting a
previously demoted manager can reactivate capabilities of its existing explicit
grant; no new grant or owner bypass is created. Immediate external Auth bans remain
possible; this slice provides no emergency recovery override.

External gates are unchanged: designated isolated hosted Supabase project/public
URL/name, Vercel environment/domains, persistent API/worker/Redis hosting,
Microsoft 365/Google OAuth and provider access, hosted restore and pilot evidence.
The existing 35-high dependency audit is an M00 release blocker. No dependencies,
lockfile, credentials, providers, deployment, merge or commits changed.

Cleanup/preservation: only Chrome PID 37527 with matching port/profile was stopped
and only Redis container `clepso-m01-s06-redis` with label `clepso.test-owner=m01-s06`
was removed. Test-owned Auth/firm/matter/receipt/audit fixtures were cleaned by their
IDs; zero `role_audit_%` trigger remnants remain. The existing staff dev server and
Supabase are preserved, and the final built API remains on port 3300. `/sign-in`
and `/openapi.json` returned HTTP 200 after cleanup. Worker readiness after Redis
removal is unverified. Snapshot review identifies 48 changed/new paths, 11 screenshots,
963 byte-for-byte unchanged existing paths, no missing baseline files, all 20
previous SQL migration hashes and the previous journal entries preserved. Lockfile,
CI, repository instructions, existing Next configs, root design CSS and unrelated
edits are unchanged by this slice. Nothing was staged or committed.

Next dependency-ready slice: **M01-S06b audited membership removal/restoration**,
with current actor/target checks, idempotent revisions, safe restricted-matter
handoff and explicit recovery policy. Start ordinary lifecycle behavior independently
of any exceptional-recovery product decision. Then M02 universal contacts/party
links and published configurable profiles, followed by M03 adapters and M04 files.
Whole first-five-module completion remains **0/5**: M00/M01/M02 partial, M03/M04
demo-only. M22 remains post-core and untouched.
