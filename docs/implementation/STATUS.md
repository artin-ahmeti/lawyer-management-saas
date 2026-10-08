# Clepso implementation status

Current slice (approved October 8, 2026, in progress): **M02-S04 jurisdiction,
venue and governing-law references**. Latest locally complete slice: M02-S03
configurable practice profiles and typed matter fields ([record](slices/m02-s03.md),
D022). M01-S06c exceptional recovery stays parked until the user records a recovery
policy.
Prerequisites: M01 live firm/session context and firm-first policy locks
(D016/D019/D020), durable matters with explicit grants (D017/D018), contacts and
parties (D021), profiles and pinned fields (D022). PDF p13 (M02 step 4, data
additions), p36 (jurisdiction coverage), p39 (nationwide-model acceptance).
Outcome: a matter carries zero, one or several jurisdiction references, each with a
purpose (governing law, venue/proceeding, agency, other) and a jurisdiction from a
fixed US catalog in `@lawfirm/core`: the 50 states, DC, the five inhabited territories
and federal. A reference may name a firm forum record (court, agency, tribunal or other
body under one catalog jurisdiction) and carry an optional docket/case number; neither
is required, so transactional, advisory and agency matters need no court. References
never derive from the firm address or lawyer admissions. Each reference states that no
jurisdiction-specific automation is available for it (p36 explicit unsupported
behavior); manual entry stays possible. This meets the p13 "multiple jurisdiction/venue
references; optional court and docket fields" and p39 "multi-jurisdiction matter" and
"agency work" scenarios.
Approved boundary (D023, user-approved): the jurisdiction catalog is code (a deploy
adds one, like starters); forums are firm-visible configuration that owner/admin/
attorney/paralegal add and owner/admin rename/archive; references live on the matter
and follow its grants (no owner/admin bypass); adding or ending a reference needs a
manager grant and owner/admin/attorney/paralegal; ending keeps history (soft end, like
parties); receipts hold identifiers only and audits hold purpose, jurisdiction code
and forum id, never docket numbers. Firm address, lawyer admissions, procedural
rulesets (M06), coverage records and reviewed packs (M18) stay later. M02/M15 remain
partial; first-five completion is 0/5.

Slice tasks (references carry no matter revision: add/end refuse duplicates and
repeated endings instead, like parties; see the slice record):

1. [x] Establish failing core/API/RLS outcome tests: catalog covers 50 states, DC,
       five territories and federal with stable codes; forum create by
       owner/admin/attorney/paralegal and rename/archive by owner/admin, refused for
       billing/readonly and other firms; matter references added and ended with
       expected matter revision, replay and stale refusal; a matter with no
       reference, one with governing law only (no court), one with an agency
       reference, and one with two venues in different jurisdictions; forum from
       another firm or archived refused for new references but still shown on
       existing ones; references and docket numbers unreadable without a matter
       grant or across firms.
2. [x] Add reversible `forums`/`matter_jurisdictions` migration (same-firm
       composite keys, forced RLS, select-only client role, catalog-code checks,
       soft end with immutable provenance); strict shared contracts and catalog in
       `@lawfirm/core`; keyed forum create/edit/archive and list, matter reference
       add/end/list with firm → matter → grant → forum locks and atomic
       receipt/audit; regenerate the API client. Verify clean/upgrade/down/reapply
       and tenant isolation.
3. [ ] Add live Settings forums (list, add, rename, archive) and a Jurisdictions
       panel on live matter detail (add with purpose, catalog jurisdiction, optional
       forum or new forum, optional docket; end; the "no jurisdiction-specific
       automation" notice), with same-intent recovery. Explicit preview keeps
       fixtures. Browser-verify loading, empty, error, denial, keyboard and
       responsive states with evidence.
4. [ ] Run the CI baseline and integration suites, run code-reviewer/security-auditor/
       test-engineer, record evidence, D023 and tracker, and name the next slice.

Product authority: `docs/product/clepso-implementation-blueprint.pdf`, v1.1,
October 1, 2026. All 44 pages were read from that file for this audit on
October 6, 2026. No module or core release is complete.

The immediate surface is staff web; shared contracts must support staff native
and client web/native. M22 stays post-core, with no voice-provider decision.
The PDF supersedes older README statements describing the client portal as v2.

## How this tracker works

- This file holds only the current state: the latest and next slice, the module
  matrix, open gates and the slice index. Do not append session logs here.
- Each slice's full record (scope, changed paths, acceptance evidence, exact
  commands and outcomes, review, cleanup) lives in `slices/<slice-id>.md`, its
  screenshots in `evidence/<slice-id>/`, and its decisions in `DECISIONS.md`.
- When a slice finishes: write its record file, then update the header above, the
  affected matrix rows, the open gates and the slice index below.

## Authorization and scope

User authorization: October 6, 2026, continue all slices in order and aim to finish
the first five modules. Preserve full blueprint gates; no artificial completion
percentage, deployment, platform-parity or provider-coverage claims. Continue
independent work when external gates are unavailable. Staging and OAuth resource
names/setup have been requested asynchronously; credentials belong in server
configuration. M22 remains deferred.

## Module matrix

Statuses describe the whole module. A completed slice does not satisfy a module gate.
PDF module pages are M00=11 through M22=33. Dependencies below are the PDF graph.

| Module / status                        | Actual code and tests                                                                                                                                                                                                                                                        | Missing behavior / acceptance gate                                                                                                                                                                                                  | Prerequisites                               | Next small vertical slice                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| M00 partial                            | `apps/worker/src/{execution,queue,main}.ts`, firm commands/inspection, execution migrations; worker/command/RLS/migration tests/CI; live Settings background-work/availability/attempt-history panels                                                                        | Broader command/job coverage, domain recovery, aggregate metrics, deployment probes and backup restoration; long-processing/load/recovery gates (p11,p40)                                                                           | None                                        | Operational search, monitoring and restoration evidence                                 |
| M01 partial                            | Live firm/session authorization, provisioning/invitations/selection; audited matter grants, staff role changes and membership removal/restoration with grant/invitation revocation; API/RLS/migration/browser tests                                                          | Exceptional recovery, configurable capabilities, financial/client/publication boundaries, MFA/device/session policies, files/AI/worker/cache revocation; p12                                                                        | M00                                         | Exceptional recovery after a recorded policy decision (M01-S06c)                        |
| M02 partial                            | `schema/{matters,contacts,practice-profiles}.ts`, `modules/{matters,contacts,practice-profiles}/*`, shared/generated contracts, live matters, contact directory, matter parties, versioned practice profiles and pinned typed matter fields; API/RLS/migration/browser tests | Aliases/related entities, relationship status, representatives/teams/assignment history, matter types and configurable party roles, jurisdictions, lifecycle/notes/activity, contact archiving and authorized search; full p13 gate | M01                                         | Jurisdiction, venue and governing-law references (M02-S04)                              |
| M03 demo-only                          | Integration fixtures and local `toggleIntegration`; no adapter/OAuth/sync records                                                                                                                                                                                            | Ownership/scopes/encrypted credentials, external mappings, verified replay-safe ingress, cursor/backfill and health; missed-event/private-email tests (p14)                                                                         | M00,M01,M02                                 | Persist disconnected connection descriptors and explicit unavailable status             |
| M04 demo-only                          | `features/documents/*`, upload/local source methods, browser object URLs                                                                                                                                                                                                     | Durable versions/files, authorized upload/download, interrupted receipt/scan states, extraction provenance, signatures; failed scan must not expose file (p15)                                                                      | M01,M02,M03                                 | Authorized upload reservation and completion/scan-pending records                       |
| M05 demo-only                          | Inbox/activity fixtures; `setInvoiceState` simulates email/SMS outcomes                                                                                                                                                                                                      | Durable recipients/threads/drafts, approvals, consent/preferences, delivery attempts/status, replay-safe reminders and Outlook filing (p16)                                                                                         | M02,M03,M04                                 | Create an authorized message draft; sending unavailable without adapter                 |
| M06 demo-only                          | Calendar/task screens and local writes; fixture/prose deadline descriptions                                                                                                                                                                                                  | Sourced obligations, trigger facts/timezones/rules versions, review/override, preparation dependencies and sync; changed-order/DST/unsupported-rule tests (p17)                                                                     | M02,M03,M04,M05                             | Manual sourced obligation with owner and explicit date-review history                   |
| M07 not started                        | Inbox lead examples only; no intake/conflict/engagement server model                                                                                                                                                                                                         | Leads/related-party conflict search, attorney decisions, consultation/engagement/decline/onboarding; fuzzy match never clears and replay creates one matter (p18)                                                                   | M02,M04,M05,M06                             | Persist an inquiry and prospective party with an attorney review queue                  |
| M08 demo-only                          | Playbook fixture toggles and matter stage arrays                                                                                                                                                                                                                             | Draft/test/publish versions, pinned runs, approved triggers/actions, review gates, upgrade previews, retry history; no silent upgrades or duplicate effects (p19)                                                                   | M02–M07                                     | Publish an operational playbook version and instantiate a pinned run                    |
| M09 demo-only                          | Web/native local timer, capture and time/expense source; core money/format and demo tests                                                                                                                                                                                    | Durable measured/confirmed duration, rounding/rates, receipts/audio, protected offline drafts, conflict/revocation revalidation; app-kill/overlap tests (p20)                                                                       | M02,M04,M05,M06                             | Save manual confirmed-duration time through an idempotent command                       |
| M10 demo-only                          | Prebill/invoice screens, demo generation/linkage/installment tests                                                                                                                                                                                                           | Fee arrangements, durable reviewed issuance/adjustments/receivables, one debt per invoice, UTBMS/LEDES/QBO, delivery; exact totals/double-billing tests (p21)                                                                       | M04,M05,M07,M09                             | Persist reviewed prebill inputs and issue one linked invoice                            |
| M11 demo-only                          | `features/trust/TrustPage.tsx`, payment and trust fixture writes/tests                                                                                                                                                                                                       | Balanced postings/client allocations, provider states/refunds/disputes, independent bank evidence and signed reconciliation; replay and cross-client allocation tests (p22)                                                         | M03,M05,M06,M10                             | Model operating/trust accounts and balanced posting commands before provider activation |
| M12 demo-only                          | Fixture AI text, demo review actions and local settings; no retrieval/proposal service                                                                                                                                                                                       | Current permission-filtered sources, untrusted-content boundary, structured proposals/revisions, execution revalidation, evaluations/usage; injection/stale/restricted-source tests (p23)                                           | M01,M02,M04,M05,M08                         | Source-linked proposal inspection with execution disabled until domain command exists   |
| M13 demo-only                          | Today/review/matter progress demos; source actions mutate local records                                                                                                                                                                                                      | All seven complete durable journeys (pp37–38), grouped review, completeness/blocker explanations, approved publication, partial-execution recovery (p24)                                                                            | M06,M08–M12                                 | Document request → receipt → staff completeness review → confirmed next step            |
| M14 not started                        | Document screens illustrate content; no comparison/chronology/research/DOCX backend                                                                                                                                                                                          | Template/version drafting, cited review/differences, uncertain chronology, licensed research and Word/export; correct source version and visible contradictions (p25)                                                               | M04,M08,M12                                 | Deterministic approved-template artifact with source/version inputs                     |
| M15 partial                            | Live Settings/session selection/shell and practice profiles, durable Matters create/list/detail with parties and typed fields, live Contacts directory/detail, staff access/roles/membership history; shared/generated client and evidence                                   | Remaining production domains, protected offline/deep links/push/recovery, accessibility and web/iOS/Android parity for every journey (p26)                                                                                          | Alongside M01–M14                           | Continue durable domain interfaces and native parity                                    |
| M16 not started                        | `apps/portal/README.md` reserved; design references only                                                                                                                                                                                                                     | Separate client grants/publication, web and shared iOS/Android apps, requests/messages/files/signatures/payments/receipts; internal content excluded and consistent platforms (p27)                                                 | M01,M04–M06,M08,M10–M13                     | Published case-view contract and client-grant permission tests before portal UI         |
| M17 demo-only                          | `features/reports/ReportsPage.tsx`, `fixtures/reports.ts`, local CSV export                                                                                                                                                                                                  | Server aggregates/drill-down with matter/financial permission filters, source reconciliation, budgets/workload/schedules/completeness timestamps (p28)                                                                              | M06,M08–M13                                 | One authorized workload metric reconciled to durable tasks                              |
| M18 partial                            | Twelve generic operational starters in `@lawfirm/core` copied into firm profiles with `basedOn` provenance (M02-S03); preview playbooks and the closed demo `PracticeArea` remain fixtures                                                                                   | Reviewed pack versions, documents/stages/fees per pack, coverage records, version upgrade preview, specialist capabilities; operational versus reviewed labelling end to end (p29,pp34–36)                                          | M02,M04,M06–M14; design starts with M02/M08 | Independent jurisdiction references, then pack versions with coverage records           |
| M19 demo-only                          | Browser CSV/download utilities and Clio integration toggle; no import/closure/retention backend                                                                                                                                                                              | Staged mappings, exceptions/reconciliation/acceptance, closure/final accounting, legal holds/retention and complete exit export; no automatic publication (p30)                                                                     | M02,M04,M07,M10,M11                         | Dry-run contact/matter import with preserved source IDs and exceptions                  |
| M20 demo-only                          | Plan/usage fixtures and local `changePlan`; prices/allowances are examples only                                                                                                                                                                                              | Verified subscriptions/entitlements, deduplicated attributed usage, caps/opt-in overage, cancellation/export and supplier reconciliation (p31)                                                                                      | M01,M03,M10–M14                             | Deduplicated usage event and explicit unconfigured allowance/cap                        |
| M21 not started                        | Build/test tooling only; no pilot or recovery evidence                                                                                                                                                                                                                       | M00–M20 gates, all required platforms/providers, nationwide coverage, 50-lawyer load, pilots/baselines, restore/rollback/runbooks and seven journeys (p32,pp39–41)                                                                  | M00–M20                                     | Record reproducible foundation integration/recovery results as modules land             |
| M22 not started, deliberately deferred | No voice architecture/provider in runtime                                                                                                                                                                                                                                    | All later evaluation and voice gates remain deferred (p33)                                                                                                                                                                          | Stable core; M01,M05–M08,M16,M20            | None before M21/core stability                                                          |

## Open gates

### Release blockers

- `pnpm audit --audit-level high` reports 35 high, 20 moderate, 2 low and 0 critical
  findings (rechecked October 8, 2026 after M02-S03). This is an M00 release blocker.

### Remaining M01 gates (from M01-S06b)

Remaining M01 gates: exceptional restricted-matter/last-owner recovery (needs a
policy decision; an unavailable sole manager can be removed, leaving the matter
without an eligible manager until then), configurable capabilities, distinct
financial/client/publication permissions, MFA/device/session recovery (restored
members' saved sessions resume without sign-in), file/search/AI/worker execution
revalidation, immediate cross-device cache invalidation (the staff shell shows the
old firm/role until token refresh) and native/client interfaces. D020 lists the
accepted trade-offs, including the pre-existing worker lock-order inversion.

### Remaining M02 gates (from M02-S03)

Aliases, related entities and relationship status; representatives, responsible
lawyers/teams and assignment history; matter types and configurable party roles;
money/contact fields; upgrading existing matters to newer profile versions (reviewed
preview, M18); jurisdiction/venue/governing-law references; lifecycle, notes and
activity; contact archiving that refuses or ends current links; a trigram index before
conflict search (M07); a UTF-8 ICU database locale on hosted environments for
case-insensitive search and profile names. D021/D022 record accepted trade-offs
(firm-visible names, display names in audits, unsalted receipt input hashes now also
covering low-entropy field values, large-table upgrade window). Follow-ups from
M02-S03: per-field errors in the profile editor, per-firm profile/version caps and a
profile write throttle.

### External gates (need the user)

Designated isolated hosted Supabase project/public URL/name, Vercel
environment/domains, persistent API/worker/Redis hosting, Microsoft 365/Google
OAuth and provider access, hosted restore and pilot evidence. Next information to
supply, in order (from M01-S02):

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
Environment/app-registration/function references are linked in the
[M00-S03d/M01-S01](slices/m00-s03d-m01-s01.md) and [M01-S02](slices/m01-s02.md)
records. External prerequisites do not excuse unfinished local domain
work; independent slices continue without pretending these release gates passed.

## Slice index

| Slice             | Outcome                                                      | Record                                         | Decisions  | Evidence                                  |
| ----------------- | ------------------------------------------------------------ | ---------------------------------------------- | ---------- | ----------------------------------------- |
| Baseline          | Repository audit before M00-S01                              | [audit-baseline](slices/audit-baseline.md)     | —          | —                                         |
| M00-S01           | Durable firm-name command with replay-safe receipt and audit | [m00-s01](slices/m00-s01.md)                   | D001–D004  | `evidence/m00-s01/`                       |
| M00-S02           | Durable dispatch and execution                               | [m00-s02](slices/m00-s02.md)                   | D005, D006 | `evidence/m00-s02/`                       |
| M00-S03a          | Staff background-work inspection                             | [m00-s03a](slices/m00-s03a.md)                 | D007       | `evidence/m00-s03a/`                      |
| M00-S03b          | Processing availability                                      | [m00-s03b](slices/m00-s03b.md)                 | D008       | `evidence/m00-s03b/`                      |
| M00-S03c          | Retained execution attempts                                  | [m00-s03c](slices/m00-s03c.md)                 | D009, D010 | `evidence/m00-s03c/`                      |
| M00-S03d, M01-S01 | Bounded owner/admin recovery; live staff context             | [m00-s03d-m01-s01](slices/m00-s03d-m01-s01.md) | D011, D012 | `evidence/m00-s03d/`, `evidence/m01-s01/` |
| M01-S02           | First-firm provisioning                                      | [m01-s02](slices/m01-s02.md)                   | D013       | `evidence/m01-s02/`                       |
| M01-S03           | Staff invitations with verified-account acceptance           | [m01-s03](slices/m01-s03.md)                   | D014       | `evidence/m01-s03/`                       |
| M01-S04a          | Workspace discovery and local logout                         | [m01-s04a](slices/m01-s04a.md)                 | D015       | `evidence/m01-s04a/`                      |
| M01-S04b          | Audited active-firm selection                                | [m01-s04b](slices/m01-s04b.md)                 | D016       | `evidence/m01-s04b/`                      |
| M01-S05a, M02-S01 | Durable private matters                                      | [m01-s05a](slices/m01-s05a.md)                 | D017       | `evidence/m01-s05a/`                      |
| M01-S05b          | Audited matter access management                             | [m01-s05b](slices/m01-s05b.md)                 | D018       | `evidence/m01-s05b/`                      |
| M01-S06a          | Audited staff role changes                                   | [m01-s06a](slices/m01-s06a.md)                 | D019       | `evidence/m01-s06a/`                      |
| M01-S06b          | Audited membership removal and restoration                   | [m01-s06b](slices/m01-s06b.md)                 | D020       | `evidence/m01-s06b/`                      |
| M02-S02           | Universal contacts and matter-party links                    | [m02-s02](slices/m02-s02.md)                   | D021       | `evidence/m02-s02/`                       |
| M02-S03           | Configurable practice profiles and typed matter fields       | [m02-s03](slices/m02-s03.md)                   | D022       | `evidence/m02-s03/`                       |
