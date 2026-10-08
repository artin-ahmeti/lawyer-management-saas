# Clepso implementation decisions

## D001 — Blueprint authority and incremental replacement

Accepted October 6, 2026. The October 1 v1.1 PDF is the product specification;
current source/tests establish implementation evidence. Older portal-v2 language,
fixture prices, California examples and six practice-area values are not launch
policy. `STATUS.md` is the single module/slice tracker; do not duplicate it in
skill-specific planning files. Keep all platforms and M22 deferral in scope.

Existing preview behavior remains available only through explicit preview mode.
The first production Settings surface reads/writes real firm data and makes its
unimplemented settings unavailable. Other demo domains remain tracked as demo-only;
they are not silently reclassified as production.

## D002 — First durable command: existing firm name

Accepted October 6, 2026. Use existing Postgres.js/NestJS/Zod dependencies and
the single Supabase migration history. A small firm-profile command exercises
M00 execution foundations and live M01 authorization without inventing new intake,
legal, pricing or provider policy. It uses an expected firm revision to prevent
an old edit from replacing a newer change.

Receipts are scoped to actor, firm, command version and UUID idempotency key.
Parsed payloads are fingerprinted; reusing a key for different input is a conflict.
Transactions serialize a command key, revalidate and lock current authorization,
then atomically persist the business change, immutable audit, pending outbox event
and response receipt. Failed transactions leave none of those effects. Retries
revalidate permission before returning a receipt, so revocation takes precedence.

Outbox insertion does not establish queue dispatch or provider delivery. M00-S02
will implement dispatch/leases/results/recovery; no fake consumer is added merely
to report completion. Firm rename itself has no external-provider side effect.

Tradeoffs: key-scoped transaction locks require a bounded transaction/timeout;
stored receipts increase retained data and need a reviewed lifecycle in M19.
Only IDs, bounded operation metadata and request outcomes enter logs; names,
tokens, SQL parameters and document content do not.

## D003 — Live membership at both API and RLS boundaries

Accepted October 6, 2026. Signed active-firm claims identify context, not current
authority. The existing RLS policies trust the firm claim alone and can expose
records after membership revocation. Add a narrowly scoped security-definer
membership predicate with a fixed search path, no client-supplied actor, explicit
execute grants and current firm/membership deletion checks. Apply it to existing
tenant reads. API decisions independently read current membership/role and lock
authorization rows during the command. Token minting removes stale firm/role claims.

Keep client business writes revoked. Execution records are server-only, RLS-enabled
and forced. Audit rows cannot be updated/deleted. Matter grants, client publication,
session invalidation and worker/file/AI revocation remain later M01 gates.

Sources verified for installed versions: Postgres.js 3.4.9 transaction README;
NestJS 11.2.1 CORS documentation; nestjs-zod 5.5.0 installed README for DTOs,
validation/response serialization/OpenAPI cleanup; Supabase RLS documentation;
Next.js 16.3.6 installed `use-client` guide. Browser requests use explicit configured
origins and bearer tokens; no wildcard credentialed CORS or privileged client keys.

- https://github.com/porsager/postgres#transactions
- https://docs.nestjs.com/security/cors
- https://github.com/BenLorantfy/nestjs-zod
- https://supabase.com/docs/guides/database/postgres/row-level-security

## D004 — Editing, denial and operational evidence

Accepted October 6, 2026. Live Settings is a narrow exception to the existing mock
domain source. It never falls back to fixtures. Shared generated clients use fresh
bearer credentials per attempt; callers retain an intent key across an unknown
result. An explicit reload or successful save resets the reviewed revision; a
background read preserves the user's draft and its original revision. Permissions
come from the current server response. Identity/firm changes clear and cancel this
cache; a denied read replaces earlier cached firm data. Full native offline/cache
and session-revocation policy remain M01/M15 work.

Operational questions for this slice:

1. Did a particular request commit or replay? `command_completed` logs correlate
   request ID, versioned command, receipt ID, firm ID and replay status.
2. Did a request fail, and how long did it take? `http_completed` records bounded
   route/method/status and duration; `request_failed` includes a safe error type.
3. Was the change durable before dispatch? Receipt, immutable audit and outbox
   rows share the command/request IDs. An unset `dispatched_at` means pending.

The sink contains IDs and outcome metadata, never authorization headers, names,
SQL parameters or document content. Aggregate metrics, distributed traces, alerts,
job results and restore drills remain explicit M00 gates.

The execution schema is generated by Drizzle; security predicates, policies,
triggers and the revision check live in its handwritten companion. Existing August
migrations are unchanged. The unused-upgrade rollback refuses to discard execution
history; after writes exist, use forward recovery preserving the audit. The local-only
companion timestamp was corrected to immediately follow the generated migration;
local migration bookkeeping was repaired without changing business data.

Generated OpenAPI declarations must travel with the built client. tsc does not copy
.d.ts inputs; a small build step copies the artifact to dist. The consumer contract
check uses a focused tsconfig with dependency declaration checks enabled, so a
missing artifact cannot silently degrade exported types under the normal framework
skipLibCheck setting. This preserves generated contracts for later native/client
consumers without a new runtime dependency.

Chrome DevTools MCP is unavailable in this session. Browser checks therefore use
the installed Chrome's CDP endpoint with an isolated profile, real local Supabase
sign-in, test-owned records and localhost services. No personal browser profile or
credential store is inspected. CDP input behavior follows the
[official protocol](https://chromedevtools.github.io/devtools-protocol/tot/Input/).

## D005 — Postgres-owned job recovery

Accepted October 6, 2026, M00-S02; blueprint p11 and pp39–40.

Keep existing BullMQ 6.1.2 / ioredis 6.0.0 as transport. Postgres 17 (postgres-js
3.4.9) owns the event, execution lease, attempts, current outcome and result.
An event maps to one job through a unique constraint. Redis receives only a job
UUID; it cannot supply firm/actor/permission claims or a source payload.

Dispatch claims at most 25 events with `FOR UPDATE SKIP LOCKED`, creates their
execution records atomically, then enqueues after commit. Dispatch success means
queue acceptance only. A fenced 30-second lease, capped backoff and periodic
re-enqueue recover missing acknowledgements, process interruption and lost Redis
state. Terminal executions are not reactivated by replay or auto-removal of Redis
jobs. Worker polls do not overlap in one process; independent processes may run.

The current handler is intentionally small: verify a firm-renamed event against
current owner/admin membership and exactly its source revision, then persist an
internal verification receipt. It neither changes the already committed firm
profile nor calls a provider. Unsupported events, revoked access, changed revisions
and invalid context become inspectable blocked work. Future domain handlers must
use their authorized commands and matter/file/financial gates; this handler's
firm checks do not authorize other event families.

Execution claims have distinct tokens and 30-second leases. Completion locks the
job, source, membership and firm; database work has a five-second statement limit
and two-second lock limit. A failed result transaction rolls back before retry is
recorded. Processing is capped at five attempts; a fifth abandoned lease becomes
explicitly failed. Long-running/external processors need their own cancellation,
lease renewal, bounded adapters and effect idempotency before activation.

Owner/admin `GET /firms/current/executions` exposes only the latest 20 firm-renamed
events, with allowlisted states/error codes and correlation IDs. It excludes payloads,
results and all matter/provider events. No dashboard UI or manual retry command is
claimed by this slice. Immutable business audit rows stay independent of mutable
operational execution records.

Additive migrations retain old commands and pending events. The job rollback is
permitted only before execution evidence exists; otherwise roll back the worker
code against the additive schema or forward-repair it. Stop dispatch/consumption
before an unused-schema rollback; reverse job migrations before M00-S01's rollback.
Do not discard job history to satisfy a rollback condition.

Operational questions and first checks:

1. Is a committed command waiting for dispatch? Find its event through the command
   ID; inspect dispatched_at, available_at, dispatch_lease_until and last_error_code.
2. Did execution stop or fail? Find job_executions by event UUID; inspect status,
   attempts, lease_until and last_error_code. Use request/command/job IDs in structured
   logs. Repair the DB/Redis connection and let eligible leases/backoff recover.
3. Is work blocked? Resolve the current membership/source/handler prerequisite.
   Do not clear a terminal status or claim delivery. Escalate to the responsible
   engineer; an authorized resolution/retry command remains a subsequent slice.

No production credentials, log aggregator, RED/USE metrics, traces, alert routing,
staging restoration, backup rehearsal or representative load result was established.
These remain release gates. Test databases and Redis queues are disposable and
isolated from the developer's business records.

Sources: [BullMQ connections](https://docs.bullmq.io/guide/connections),
[job IDs](https://docs.bullmq.io/guide/jobs/job-ids),
[idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs),
[Postgres 17 locking clauses](https://www.postgresql.org/docs/17/sql-select.html#SQL-FOR-UPDATE-SHARE).
Installed BullMQ declarations/source were checked against these APIs.

## D006 — Critical proxy-address dependency correction

Accepted October 6, 2026, a separate M00 security prerequisite correction.

The refreshed audit reported GHSA-jqcg-44mw-7w3h on the existing Nest/Express path:
proxy-addr 2.0.7 could trust arbitrary IPv4 peers through a malformed IPv4-mapped
IPv6 trust subnet. Express currently defaults to `trust proxy = false`; Clepso
has no enabling override, so the triggering configuration is not currently active.
Patch the resolved library anyway rather than retain that risk for deployment.

Pin only proxy-addr to the maintainer's 2.0.8 patch via pnpm-workspace.yaml overrides.
Its forwarded/ipaddr dependencies are unchanged and it has no install lifecycle
script. Install with scripts disabled and retain the repository's build approval
policy. No other external dependency version is upgraded. Remove the pin only when
an unoverridden resolution remains patched and the security regression passes.

A regression resolves the exact library used by Nest's Express adapter. The old
version trusted an unrelated IPv4 address (test failed); the patched version must
reject it while preserving a valid IPv4 trust subnet. No trusted-proxy configuration,
authentication policy or API capability is relaxed. Other audit findings remain
release blockers and need individually reviewed upgrades.

Sources: [maintainer advisory](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h),
[patch](https://github.com/jshttp/proxy-addr/commit/780911d),
[2.0.8 release](https://github.com/jshttp/proxy-addr/releases/tag/v2.0.8),
[pnpm override configuration](https://pnpm.io/settings#overrides).

## D007 — Recent firm-check inspection and protected read states

Accepted October 6, 2026, M00-S03a/M15. The existing bounded execution API is
authoritative for the latest 20 allowlisted firm-profile events and current
owner/admin permission. Consume its shared Zod contract through the generated
client in live Settings; do not create another source of job status or delivery.

Use the existing actor/firm session cache namespace, cancellation and context-change
cleanup. Retain no inspection cache after unmount. A 401/403 resolves to a denial
value with no records, replacing a previously authorized response. A connection,
server or schema failure remains an error; never reinterpret it as an empty list.
Hide previous rows while rechecking or after any failed read. Recheck on focus,
explicit refresh and a successful firm save, with no automatic job writes/retries.

This favors visible current uncertainty over keeping an apparently current cached
list during an outage. The read exposes statuses, fixed reasons, counters and
correlation references only. It excludes payloads, results, matter/provider jobs
and arbitrary server errors. Initial presentation gating uses the live profile's
owner/admin hint (currently identical to canRename); the API independently enforces
inspection authority. Separate capability hints should follow M01's actual policy
when those permissions diverge.

Consequences: refresh never runs a job; the internal completion receipt claims only
the saved-profile verification. Native consumers retain the same wire contract but
are not implemented by this staff panel. The latest-20 view is explicit about its
scope; old failure search/pagination, readiness, per-attempt history and bounded
audited recovery remain M00 work. No provider contract, new dependency or schema
change is introduced. Removing the panel rolls back the UI without changing records.

Sources: shipped Next 16.3.6 `dist/docs/01-app/03-api-reference/01-directives/use-client.md`,
[Query useQuery](https://tanstack.com/query/latest/docs/framework/react/reference/functions/useQuery),
[query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation),
[QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient),
[CDP scrolling](https://chromedevtools.github.io/devtools-protocol/tot/DOM/#method-scrollIntoViewIfNeeded)
and [key events](https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchKeyEvent).
Installed declarations and actual browser behavior corroborate those APIs.

## D008 — Short-lived processing availability without business-state duplication

Accepted October 6, 2026, M00-S03b/M15; blueprint p11, p26 and pp39–40.

Keep Postgres authoritative for jobs, outcomes and access. A Redis heartbeat is only
ephemeral operational evidence: UUID instance plus observation time, maximum 15-second
TTL, emitted after a successful recovery/dispatch poll while the worker is running,
unpaused, and both consumer connections plus the producer connection are ready.
No business command, audit, outbox event, job effect or provider claim is created.
A stopped worker's last observation can remain until expiry; the UI says recently
active, and never guarantees ongoing consumption, capacity or completion. Multiple
workers share the last observation; shutdown does not delete another worker's signal.

Namespace evidence by a SHA-256 hash of the configured database host/port/name,
excluding credentials/query options. API and worker must share a private deployment
Redis and database connection target. Different connection aliases conservatively
show no signal. Redis access stays server-only. The hash/instance and raw evidence
are never returned to staff. Existing BullMQ transport isolation between deployments
remains necessary; this telemetry namespace does not authorize transport jobs.

Owner/admin GET /firms/current/processing-readiness checks live membership/capability
before and after bounded read-only queue probes. It holds no database locks over
network I/O; revocation during probing wins. A database outage cannot authorize the
read and returns 503. Redis reads disable offline queuing and have a one-second
command timeout; disconnected, failed and unconfigured services are explicit. Only
allowlisted states/timestamps reach the shared strict Zod/OpenAPI contract. An
observation that expires during revalidation becomes unconfirmed. Responses use
Cache-Control: no-store. /health continues to mean process liveness only.

Staff Settings reuses the protected actor/firm cache namespace, hides old values
during checks/errors, and replaces 401/403 data with an empty denial. It rejects
malformed/contradictory evidence. A response already expired in transit or dated
ahead of the client clock shows expired. A timer expires the snapshot at the earlier
of its own or heartbeat deadline, without issuing another request or rerunning work.
Focus/manual checks refresh evidence; clocks must be synchronized for useful results.
Full offline/native/session revocation and platform parity remain M01/M15 work.

Alternatives: persisting every heartbeat in business Postgres adds durable writes
and retention without improving job authority; listing Redis worker connections
alone cannot establish a successful database poll. The chosen small signal is easy
to remove without a migration. No schema/history change, new provider or external
package version is introduced. API declares the already-installed ioredis 6.0.0;
the server DB utility declares existing Node 26.2.0 types. Offline installation ran
with scripts disabled; the lockfile adds only those two importer references.

Operational questions: does current firm authorization reach the DB; does the queue
answer; did a worker recently complete a processing poll? Correlate the existing
http_completed duration/status log and processing_availability_checked state log by
request ID. Worker poll failures use PROCESSING_UNAVAILABLE because DB or heartbeat
publication can fail. Queue-job outcomes still use durable existing error codes.
Aggregated RED/USE metrics, traces, alert routing, deployment probes/isolated staging
recovery and representative load are remaining M00/release gates.

Sources verified against installed BullMQ 6.1.2 and ioredis 6.0.0 declarations/source:
[BullMQ connections](https://docs.bullmq.io/guide/connections),
[ioredis reconnect/offline queue](https://github.com/redis/ioredis#auto-reconnect),
[Redis SET expiry](https://redis.io/docs/latest/commands/set/). BullMQ 6 exposes
consumer clients on getBackend().connection/blockingConnection rather than the old
Worker.client API. Next 16.3.6's installed use-client guide and existing Query 5.104.0
protected-read conventions guide the UI. Chrome DevTools MCP is unavailable; the
isolated local CDP harness now owns a fresh page to avoid prior emulation/lifecycle
state, retains native input assertions, and checks actual service failures.

## D009 — Retain actual execution attempts alongside job summaries

October 6, 2026; M00-S03c; blueprint p11 and p39–40.

A new server-only `job_execution_attempts` table records each claimed lease's
number, original timestamps and eventual outcome. Claim insertion and job-state
change commit together; finishing or failing records the attempt outcome in the
same transaction as the job result/retry. Reclaiming an expired lease records its
interruption before starting the next attempt. Opaque lease tokens fence stale
workers, stay private and are unique. Interruption means completion was not
confirmed; it is not proof that a future provider did nothing. Provider handlers
must still implement their own durable intent/reconciliation/idempotency contract.

Keep the existing job summary, five-attempt cap and outbox recovery behavior.
Terminal attempt outcomes and identifying fields cannot be updated. Composite
identity FK binds each attempt to its job's firm/actor. Forced RLS and revoked
client grants deny direct reads/writes; service_role has no DELETE grant. The
application never deletes history. Privileged local fixture teardown explicitly
removes only test-owned rows. M19 retention/export/closure policy and production
least-privilege service connections remain future gates; no legal retention period
or automatic purge is invented here.

The additive migration does not backfill fabricated details from old counters.
Rolling back worker code remains possible while retaining the table; mixed/old
workers can leave evidence gaps. The read reports `unrecordedAttempts` explicitly.
Rollback of unused attempt schema is tested; dropping it with evidence is refused.
Apply schema/security first, then worker, then API/client UI. To remove an unused
schema, revert application consumers first and run attempt-history rollback before
older job-execution rollback. Existing migrations are unchanged. Drizzle 0.31.10
emits the referenced unique index after the composite FK; the new, unpublished
migration reorders that index before the FK, verified on a clean database and an
upgrade with existing jobs.

Add `GET /firms/current/executions/{jobId}/attempts` instead of changing the existing
execution-list wire contract. A live owner/admin check, source-event allowlist and
job-row lock produce one consistent bounded response (at most five attempts).
Deleted/unavailable/cross-firm/non-firm sources return 404 after authorization;
missing membership/capability returns 403. No actor identity, payload, result,
lease token or provider details enter the response. Zod validates outcome/date/
coverage consistency and generated OpenAPI declarations carry the shared client
contract. The Settings disclosure lazily mounts a context-scoped, no-store read;
loading/errors/denial/unavailability hide old details. Refresh never executes work.

Verified API against the installed Drizzle ORM 0.45.2/Kit 0.31.10 and
[Drizzle's constraint documentation](https://orm.drizzle.team/docs/indexes-constraints).
The UI follows installed Next 16.3.6's `use-client.md` and existing Query patterns.

## D010 — Patch the newly reported native tooling quoting vulnerability

October 6, 2026; M00 dependency quality gate. The audit began this session with
shell-quote 1.10.0 and GHSA-pqg4-j6r4-53mv (critical; added to GitHub's reviewed
advisory database October 6). It is reached through React Native 0.86.3 →
react-devtools-core 6.1.5. Inspecting the installed DevTools source map shows its
editor launcher consumes `parse`; the affected `quote` operation is not proven
reachable from a Clepso production request. Patch conservatively rather than
claiming that an unused operation makes the installed package safe.

Pin only shell-quote 1.11.0 through the existing pnpm overrides policy. Maintainer
repository, release notes, integrity and absence of install lifecycle scripts were
reviewed; install and frozen-lockfile verification both disabled scripts. The
resolved regression test first failed on 1.10.0, then passed on 1.11.0: quoting
comment-following strings containing LF/CR/U+2028/U+2029 now rejects them, while
ordinary editor-command parsing/quoting remains compatible. The test only inspects
strings; no exploit command is executed. Native's new built-in Node test script
is discovered by the existing workspace unit-test CI command; no new dependency
or CI permission is introduced.

The only package version change is shell-quote 1.10.0 → 1.11.0. pnpm also normalized
existing ioredis 6.0.0 optional-peer snapshot keys involving the already installed
supports-color 10.2.2; affected API/worker Redis tests and builds are rerun. Keep
D006's proxy-addr pin. Final audit counts and remaining high advisories are recorded
in STATUS; the high-severity release gate is not relaxed.

Sources: [maintainer advisory](https://github.com/ljharb/shell-quote/security/advisories/GHSA-pqg4-j6r4-53mv),
[maintainer changelog](https://github.com/ljharb/shell-quote/blob/main/CHANGELOG.md).

## D011 — Reviewed replacement checks preserve failed execution evidence (M00-S03d)

A failed or blocked firm-profile check can have one separately authorized new
check. Never reset its five-attempt counter, erase its failure, replay a rename,
or reapprove a provider/domain action. An owner/admin reviews the current firm
revision, the original source revision and terminal status, and supplies a bounded
reason. Those facts are checked under live membership/source locks at command time.
The new outbox event uses the reviewing actor; the worker rechecks that actor and
revision before recording an internal verification result.

The immutable recovery relation has unique source/replacement identities and
composite tenant/actor foreign keys. Its receipt, relation, audit and outbox event
commit together. Retried requests retain one input and action key; changed inputs
or competing requests cannot create another replacement. The receipt records
acceptance, while the inspection endpoint supplies the current execution outcome.
No message delivery, legal approval or connected-provider success is implied.

The additive migration has no synthetic backfill and creates the existing outbox
identity index before the dependent foreign key. Unused rollback is supported;
rollback refuses retained recovery evidence. Clients cannot access the table and
service-role permissions cannot update/delete provenance. Privileged test cleanup
is confined to test-owned records. Wider operational search and provider recovery
will need their own bounded contracts and domain authorization.

## D012 — Staff context describes live supported capabilities (M01-S01)

Keep `/auth/me`'s identity/firm/role fields, but resolve role and firm access from
current database membership rather than `user_role` in a previously issued JWT.
An identity without an active firm gets no firm role or capabilities. An asserted
firm with missing/revoked/deleted membership or firm is denied. The new shared
strict schema and generated client add only the four implemented firm operations;
no financial, client or matter authority is inferred.

A common server membership lookup preserves the existing transaction/share/update
locks and serves both context and firm commands. Capability policy stays on the
server; workers independently revalidate their allowlisted handlers at execution.
Settings reads the authorized context with actor/firm binding and refreshes its
profile controls when access changes. Loading/error/denial cannot display a warm
role as current. Token decoding remains a cache namespace only. Full authentication
session/device revocation, MFA/recovery, provisioning, context selection and broader
capabilities remain open M01 gates. Email remains verified token identity metadata
and is not an invitation-acceptance authorization source.

## D013 — First-firm bootstrap creates authority transactionally (M01-S02)

`POST /firms` is the narrow bootstrap exception to active-firm commands: a verified
actor without a current staff membership can create their first firm. The server
checks the live Auth account's email confirmation, deletion and ban status and
locks that actor's profile/account. JWT owner/email claims and body authority
fields cannot grant ownership. Existing members receive a conflict rather than
an upgrade. Future invitation acceptance and account-level provisioning commands
must use the same account serialization boundary when changing membership.

The firm, initial owner grant, command receipt, append-only audit and internal
profile-check outbox event commit together. A partial unique index binds the
bootstrap intent to actor/key across firm contexts; ordinary firm commands retain
their existing uniqueness. Replay revalidates account and retained firm membership.
The firm starts at revision 1 for the existing internal check contract, with empty
settings and no demo practices, litigation defaults or commercial entitlements.
The existing `trial` database label is retained, with no invented pricing/allowance.

The receipt describes durable creation, not a new authenticated role. Staff web
retains input/action/request identity across uncertain responses, obtains a fresh
session through Supabase Auth, and then reads the firm through the authorized API.
An Auth outage has a distinct created-but-access-unavailable state. A reload can
recover existing membership without issuing a second creation command. The
installed Auth SDK may temporarily cache failed refreshes; this is surfaced as
unavailable access rather than bypassed with a fabricated token.

Only a new actor with no live staff membership can use this bootstrap path; added
firms, invitations, explicit firm switching, MFA/session/device controls and full
client/matter isolation require later M01 slices. The migration is additive;
unused rollback removes the index and retained bootstrap receipts block rollback.
Source: [Supabase refreshSession](https://supabase.com/docs/reference/javascript/auth-refreshsession),
verified against installed Supabase JS/Auth 2.117.2 and local Auth account schema.

## D014 — Staff invitations bind grants to a live confirmed account (M01-S03)

Owner/admin prepare invitations for non-owner staff roles through bounded active-firm
commands. Ownership transfer and restoration/upgrading of existing or revoked
memberships have separate review gates. Preparation does not grant access. Sources
(email, firm, role, issuer, creation and expiry) are immutable; terminal acceptance
or revocation increments the revision once. A pending invitation expires after
seven server-clock days. This is an operational default, with no legal deadline
or subscription implication. An expired pending source must be revoked before a
replacement is prepared, retaining both outcomes rather than rewriting provenance.

There is no mail adapter. Delivery remains `unavailable` in every receipt/read/job
result. A signed-in recipient can discover pending invitations addressed only to
their live confirmed `auth.users.email`, without an existing firm grant. The server
checks deletion/ban/confirmation and current confirmed issuer authority; JWT email and mirrored
profile email cannot authorize discovery or acceptance. Lowercase/trim is the only
normalization; provider-specific alias/dot/plus rewriting is not performed. Lists
have bounded keyset pagination and no cacheable identities. Client database reads
and writes of invitations are denied, including forged firm claims.

Acceptance serializes on the same account/profile lock as first-firm provisioning,
locks live firm/issuer/source state, rechecks expiry after waiting and at the terminal
update, and refuses existing memberships, including revoked ones. One transaction
inserts the staff grant, accepted outcome, receipt, audit and outbox. Global actor/key
uniqueness for acceptance prevents the grant-free command's retries from acquiring
a second meaning in another firm. Receipt replay revalidates account and retained
membership; it cannot restore revoked authority. Revocation cannot remove an already
accepted membership. A composite foreign key binds acceptance to a membership in
that invitation's firm. Additive migrations retain existing firm/member history;
rollback is allowed only without invitation records or related execution history.

The outbox handler verifies an allowlisted source outcome with current actor/firm
access, including a readonly recipient's accepted outcome. It sends no email and
creates no grants. Changed sources, revoked/banned actors and invalid scope block
processing visibly in durable job/attempt records. Invitation-specific staff job
inspection/recovery controls remain a later M00/domain slice; the existing firm-profile
inspection endpoint remains restricted to its supported event types.

The generated OpenAPI client exposes these contracts to web/native consumers. Staff
web preserves one reviewed input/key/request across uncertain responses and validates
receipt identity/status. A confirmed membership is followed by genuine Auth refresh
and an authorized firm read, reusing D013's refresh helper. A member joining another
firm is told that the current workspace remains active and switching is unavailable
until M01-S04. Neither a receipt nor a decoded cache claim installs authority. Native
UI/offline reconciliation, actual email delivery, firm selection, MFA/device/session
policy, matter/client grants and ownership changes remain open module gates.

## D015 — Discover memberships independently of firm selection; distinguish logout outcomes (M01-S04a)

`GET /auth/memberships` is an account-level read, like received-invitation discovery.
It requires a verified actor and the existing live confirmed-account check, including
ban/deletion/confirmation. It returns only that actor's current staff grants joined to
live firms. Claimed role/firm and query authority fields do not authorize another
account's records. A confirmed account without a staff grant can read an empty list;
an old or revoked active-firm claim does not prevent discovery of other valid grants.
The existing records are authoritative, so this read needs no migration, receipt,
audit write or outbox action. Query requests retain the common HTTP request ID/logging.

Pages contain at most 20 records, ordered by immutable membership ID with a validated
`afterId` cursor. This avoids name-based pagination changing when a firm is renamed.
The read uses bounded account/member/firm locks and timeouts, returns `no-store`, and
omits staff rosters, financial capabilities and matter records. Discovery does not
install an active context. Selection must be a separate reviewed server command with
durable context/receipt/audit behavior, followed by genuine Auth renewal and a target
firm read; it is M01-S04b. The UI says switching is unavailable rather than selecting
a firm from decoded JWT data or browser state.

Logout explicitly uses Supabase's `local` scope rather than the default global scope.
Installed Supabase JS/Auth 2.117.2 can remove the local session while returning a remote
revocation error. The helper records whether Auth accepted sign-out, not proof of
invalidating every issued token. It checks local session absence, cancels pending reads,
clears the complete query cache/overlays and uses a full navigation to discard route
payloads. Retained/uncheckable sessions produce a retryable error; an absent local
session with failed remote revocation goes to a sign-in notice with no revocation
claim. A shared staff-frame boundary also hides the frame and clears query/overlay
state on sign-out and actor/firm-context changes. Decoded claims remain cache keys.
Explicit preview mode preserves the existing demo behavior.

This does not invalidate every previously issued JWT, implement server session/device
policy, make preview timers into protected drafts, or prove native/offline cache
parity. Those remain M01/M09/M15 gates. Existing money/duration behavior and the
fixture timer are preserved. No new secrets, dependencies or hosted resources are
introduced. Source: [Supabase signOut](https://supabase.com/docs/reference/javascript/auth-signout),
verified against the installed SDK's `GoTrueClient._signOut` implementation and a
test-owned local Auth outage in an isolated browser.

## D016 — Select a staff workspace per Auth session with a durable revision (M01-S04b)

An account can belong to several firms. Selecting a firm must not silently change
another device's workspace. `staff_session_contexts` therefore binds one Auth
`session_id` to an actor, staff grant and monotonically increasing revision. The
existing oldest-live-membership fallback remains for sessions that have never
selected. An explicitly selected but revoked/deleted grant produces no firm claim;
it does not silently substitute another firm. Auth session deletion/expiry removes
authority while selection/audit history remains. The context table stores references
and revisions, without device names, IP addresses or user-agent data. Full session
policy, history retention/export and native protected drafts remain module gates.

`GET /auth/active-firm` reads the actual selection independently of a stale firm
claim. `POST /auth/active-firm` accepts only target firm and expected revision. The
verified actor/session comes from Auth. The command checks current account
confirmation/ban/deletion, session ownership/expiry and target membership/firm; it
serializes with bootstrap/invitation commands on the account's profile lock. A
single bounded transaction updates context, inserts the receipt and appends the
audit. There is no asynchronous effect to dispatch and therefore no no-op outbox
event. Existing request/command logging identifies the outcome without credentials.

The actor/action key is globally unique for this command, and the input hash binds
the login session as well as the reviewed input. Concurrent identical retries
return one receipt. Competing revisions fail with a conflict. Replays recheck live
target access and require the selection still to match the receipt; an old retry
cannot switch the user back after another selection. The audit stores revision and
target scope without exposing a previous firm's private name to the target firm.

Domain transactions using a real Auth session share the same account lock before
taking firm locks, and retain the current Auth account/session through commit.
This covers the first selection, when no context row exists yet. Without that
boundary, a firm write whose authorization query began before selection could
wait on a firm lock and commit after the switch using an earlier statement
snapshot. A controlled failing concurrency test reproduced this case; selection
now waits for the already-authorized write, then denies its old context token.

The Auth hook mints firm/role/revision from current database records. API firm
authorization and the RLS membership wrapper check the live Auth session and saved
context revision, so an old token fails immediately after selecting, including
switching A → B → A. Existing synthetic/legacy signed tokens without `session_id`
retain their existing membership checks; they cannot call the selection command.
Supabase's ordinary user sessions include the required `session_id`. This slice
does not claim to implement a complete device/MFA policy or non-Supabase issuer
migration. Workers continue to authorize their source firm/actor at execution;
changing a browser's workspace does not move durable jobs to another firm.

Staff web reviews the choice outside the staff frame, hiding old content and
clearing query/overlay state. It retains one command/key after an unknown response,
refreshes through actual Auth, checks actor/session/firm/revision binding, and
performs an authorized target-firm read before navigating. Failed renewal/read
retains a truthful recovery view. Reload discards cached route state and rechecks
the authoritative selection; it does not automatically issue another command.
The staff frame's cache scope includes Auth session and selection revision. The
sidebar/avatar use authorized live firm/role/account metadata; explicit preview
retains the existing fixture design. Other fixture domains and timer behavior are
unchanged and remain demo-only until their modules are implemented.

The migrations are additive, force RLS, revoke client reads/writes of context
records, enforce grant association and revision/provenance, and extend the existing
receipt index. Unused rollback restores the previous hook/helper behavior; it
refuses once any selection or command/audit history exists. Used installations
require a reviewed forward correction rather than erasing access history. Local
upgrade/down/clean-install tests preserve existing firms and migration history.

Sources: [Supabase user sessions](https://supabase.com/docs/guides/auth/sessions),
[custom access token hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook),
and the existing refresh helper using
[refreshSession](https://supabase.com/docs/reference/javascript/auth-refreshsession).
Installed stack: staff web Supabase JS/Auth 2.117.2 (API SDK 2.112.3), NestJS 11.2.1, Next.js 16.3.6, Drizzle ORM
0.45.2/Kit 0.31.10 and TypeScript 6.0.3. SDK renewal and hook behavior were verified
through the local real-Auth browser flow, without hosted provider credentials.

## D017 — Start universal matters with explicit staff grants (M01-S05a / M02-S01)

Accepted for the initial durable matter slice, October 8, 2026. Blueprint p12/p13
requires matter grants and a universal model without mandatory litigation fields;
p26 requires the existing web interfaces to move from fixtures to real contracts.
The repository had no authoritative matter or party tables, so this is an additive
foundation rather than migration of existing matter data. Fixture records are not
silently imported or represented as production records.

The initial matter holds a title, optional opaque internal reference, revision and
provenance. It imposes no court, docket, state, client count or closed practice-area
enum. Contacts, parties, profile versions, jurisdiction references and lifecycle
commands extend this model in subsequent M02/M18 slices. This subset does not
satisfy the entire universal model gate.

Every matter requires a current `matter_access` grant; owners/admins do not bypass
ethical walls. Creation is initially available to live owner/admin/attorney roles,
with a manager grant for the creator. Existing billing/paralegal/readonly roles may
read only granted matters and cannot use the creation command. These conservative
initial capabilities are server decisions, not assertions of a lawyer's licensing
or a final configurable firm policy. Reader/manager describe current access; no
financial, file, publication or grant-management capability is implied by the label.
Grant/revoke commands and editable policies follow in M01-S05b. An implicit
firm-wide default was rejected because it would disclose new sensitive records
before the ethical-wall model exists.

Composite foreign keys bind grants to a matter and staff membership in the same
firm. Forced RLS and current membership/session/grant checks govern authenticated
database reads. The API performs the same checks within bounded transactions and
uses existing profile/session locks for creation, so selecting a workspace or
revoking membership cannot pass a previously authorized write in flight. Reads
lock the current matter/grant while deriving their result. A future grant command
must use that same lock order and revalidate at execution. No client business write
privilege is added. A narrowly scoped security-definer helper checks only the
current actor's access and does not enumerate other grants.

`POST /matters` requires a stable action key and request context. Creation stores
matter/grant/receipt/audit in one transaction, with receipt uniqueness enforced by
the existing firm/actor/command/key index and actor serialization. Replay validates
the same input and current creation capability and grant before returning current
authorized data. Title/reference are stored only in protected business/audit
records, not general telemetry. Existing HTTP/request IDs and command completion
logs diagnose created versus replayed outcomes. There is no async effect in this
slice, so no synthetic outbox job or provider success is invented.

`GET /matters` uses stable UUID keyset pagination with at most 20 records and no
unfiltered aggregate counts. `GET /matters/:matterId` gives the same generic 404
for missing, ungranted, removed and foreign records after firm authorization.
Shared Zod contracts and generated OpenAPI types support future native consumers.
The staff web replaces only the live Matters/list/detail path; explicit preview
keeps existing screens. The live sidebar suppresses its fixture matter count.

The creation form retains its intent/key through uncertain responses, including
transient list refresh failure. While authorization is pending or unavailable it
is hidden; confirmed denial or context change discards protected local state.
Read errors/denial hide warm matter records. Current focus/manual reads revalidate
access; realtime invalidation, protected persistent drafts and native caches remain
M01/M15 gates. Reload during an unresolved command loses the in-memory intent,
while committed records remain durable; that recovery limit is explicit.

The two migrations are additive, enforce immutable record/grant provenance and
preserve earlier SQL/journal history. Generated SQL was corrected to create the
referenced composite unique index before its foreign key; clean/upgrade tests
guard that ordering. Unused rollback drops only new tables/functions. Once matter,
grant or command/audit history exists, rollback refuses; use a reviewed forward
correction to preserve history.

Sources: [PostgreSQL 17 row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
for forced RLS, security-definer boundaries and bypass behavior;
[Drizzle indexes and constraints](https://orm.drizzle.team/docs/indexes-constraints)
for composite references and unique indexes. Installed ORM/Kit remains
0.45.2/0.31.10; no dependency changes. Next.js 16.3.6's installed
`dist/docs/01-app/03-api-reference/01-directives/use-client.md` was read for client
component boundaries. API/web/unit/migration and real local-Auth browser tests
verify these contracts; no hosted or platform-parity claim is made.

## D018 — Revisioned, explicit matter access changes (M01-S05b)

Accepted for the locally implemented slice, October 8, 2026. Blueprint p12/p39
requires explicit grants, current capabilities, ethical walls, policy revisions
and access-change audit history. S05a created restricted matters but had no staff
access-management commands or interface.

The initial access-management capability requires both a current manager grant
and a live owner/admin/attorney membership. Owners/admins never bypass a matter's
wall. A manager may choose current, confirmed, available staff in the same firm;
only those three eligible roles can receive manager access. Reader grants support
all current staff roles. These are conservative initial server capabilities,
not final configurable firm policy or professional licensing assertions. Separate
financial/client/file/publication capabilities are not implied by this grant.

`POST /matters/:matterId/access-changes` carries a user, reader/manager/null role,
expected access revision, reason and stable action key. Null revokes the grant.
An independent `matters.access_revision` avoids conflating a policy change with
future matter-content edits. The existing grant is soft-revoked or restored with
its original provenance and an increased grant revision; each actual change
increments the policy revision and commits its receipt and audit in the same
transaction. An unchanged assignment returns a conflict rather than claiming a
new change. No async/provider effect exists here, so no synthetic outbox job is
created. Existing request/outcome/duration logs identify failure and replay without
staff email, matter text or reasons in general telemetry.

Writes follow the existing actor profile/session/firm boundary, then lock the
matter before grant rows. The matter lock serializes policy changes from different
managers; the expected revision prevents overwritten concurrent review. Recipient
membership and Auth account rows are revalidated and held with shared locks.
Target profile rows are not acquired after another actor's exclusive profile
lock, avoiding reciprocal actor/recipient profile-lock inversion. Remaining-manager
checks lock at most one current eligible manager's membership/account. Future
membership/role commands must coordinate these boundaries and record stranded
matter recovery without adding an implicit owner bypass.

Removing or downgrading the last currently eligible manager is refused. An inactive,
banned, removed or ineligible manager does not count as recovery authority. Two
competing removals cannot leave zero managers. External Auth administration can
still make a matter inaccessible; controlled recovery and membership management
remain M01 gates. Self-removal is possible after another eligible manager exists;
its committed acknowledgement does not authorize further reads or receipt replay.

Replays check the actor's current capability/grant, recipient availability/role,
input hash, current policy revision and resulting target grant. A later policy
change returns a conflict and directs review of current access/history, rather
than replaying a stale approval. A lost response with unchanged policy returns
its original acknowledgement without another grant, revision or audit. Audit
failure rolls back every business/receipt effect and permits a safe retry.

Roster, candidate and history reads are manager-authorized API surfaces, with no
unfiltered totals and at most 20 items. Direct clients retain only their own grant
reads; receipt/audit tables remain server-only. History cursors retain PostgreSQL
microsecond timestamps with an ID tie-breaker, avoiding omissions from millisecond
truncation. A partial audit index supports the authorized matter history query.

The web preserves an unresolved in-memory intent through transient read/refetch
failure, freezes its fields and staff-page selection, and only retries that same
intent. Confirmed denial removes protected form/roster/history UI. Current read
failures hide warm records; context changes remount the existing session boundary.
Read/focus/manual revalidation is implemented; realtime cross-device cache
invalidation, protected persistent drafts and native/client controls remain gates.
Reload during an uncertain command loses the in-memory intent; history remains
available to currently authorized managers. History labels resolve against the
currently authorized staff page, falling back to durable actor/subject IDs.

The additive migration preserves all existing matter/grant content and defaults
policy revision to 1. An unused rollback removes only the new column/constraint/
index. Any changed revision or access command/audit history refuses rollback;
used installations require a forward correction. The older S05a migration test
now bounds its own migration range; the new full-history clean/upgrade/down test
covers the current schema and preserves older grants.

References: [PostgreSQL 17 explicit row locks and deadlocks](https://www.postgresql.org/docs/17/explicit-locking.html)
and [Drizzle migrations](https://orm.drizzle.team/docs/migrations). Installed
PostgreSQL 17.6, ORM 0.45.2 and Kit 0.31.10 remain unchanged. The installed Next.js
16.3.6 `use-client.md` guide was checked. Browser tests use an isolated CDP profile,
read-only inspection and native input; [CDP keyboard events](https://chromedevtools.github.io/devtools-protocol/tot/Input/)
were checked when macOS headless select navigation needed native typeahead input.

## D019 — Audited staff role changes and firm-first policy locks (M01-S06a)

Accepted for the local slice, October 8, 2026. Blueprint p12 requires membership
changes, server capabilities, policy revisions, audit and effective revocation;
p26/p39 require real staff interactions and no cross-firm or ethical-wall disclosure.
Invitations and explicit matter grants already existed. Role editing did not.

The first S06 slice implements role changes for current, confirmed, available
memberships. Removal/restoration and emergency recovery are separate slices.
Owner/admin receive `firm.staff.roles.manage`; the current database role is used
for each read, command and replay. Only an owner can change a current owner or
assign owner. The last available confirmed owner cannot be demoted. These are
conservative initial capabilities, rather than a final configurable firm policy.

The bounded `POST /firms/current/staff/role-changes` accepts user ID, role,
reviewed membership revision and reason, with a stable action key. A role change
increments `firm_members.revision` and commits membership, receipt and audit in
one transaction. No asynchronous/provider effect exists, so no synthetic outbox
job is added. Changed input, stale review and unchanged roles conflict. Replays
revalidate the current actor/session/firm capability and recipient availability,
role and resulting revision; an old acknowledgement cannot reapply a role change.

Role eligibility and explicit matter grants remain separate. Existing grants are
preserved: a demoted manager can still read through its existing grant but cannot
administer access with an ineligible staff role; a later promotion can activate
capabilities of that existing explicit grant. No owner/admin bypass or new grant
is created. An ordinary role demotion that would strand a matter is refused until
an authorized matter manager completes a handoff through M01-S05b. The firm-level
error contains no matter names, IDs or counts. Exceptional recovery after external
Auth bans/deletion, urgent deprovisioning, and an unavailable last owner are still
explicit M01 decisions/gates; this slice neither supplies an override nor blocks
an external account suspension.

Policy writes lock actor account/profile, Auth session, firm, then memberships.
Role changes take an exclusive firm row lock; supported domain commands take its
shared lock before member/matter/grant locks. This serializes low-frequency policy
changes with grant administration and prevents opposing owner demotions or a role
change racing with a manager removal. Eligible recovery accounts are held with
shared locks through commit. Recipient profile locks are not acquired after an
actor's exclusive profile lock. This avoids reciprocal profile-lock inversion.
The tradeoff is brief same-firm serialization; bounded two-second lock and five-
second statement timeouts return failure without a partial business effect. A
representative 50-lawyer load/latency gate remains M21.

The common firm access helper now acquires the parent before member rows. Context
selection, invitation acceptance/replay and provisioning replay follow that order.
Read-only own-membership/selection/received-invitation listings use a single
statement snapshot instead of acquiring joined member/firm locks in a conflicting
order. Consuming commands always acquire current authorization again. Existing
context-switch/write serialization outcomes remain covered by integration tests;
the test's blocked-query observation follows the new parent-lock statement.

Staff list/history reads are owner/admin authorized, scope-bound and paginated at
20 rows. History uses a literal action predicate matching the partial index and
microsecond timestamps with an ID tie-breaker. Local EXPLAIN chooses the backward
history index scan; representative histories/load are not claimed. Audit/receipts
remain server-only and append-only. Staffing reasons stay out of general telemetry;
request, command, applied/replayed state, HTTP duration/status and sanitized errors
identify outcomes. Aggregated metrics/traces, hosted alerts and recovery remain
M00/M21 gates.

The staff web uses the existing Clepso cards, tokens and scoped styles. Selecting
staff preserves the reviewed member revision across later background reads. An
unknown command freezes its fields and staff-page selection and retries only that
intent; transient reads hide warm UI while retaining the unresolved intent.
Confirmed denial removes protected controls, and successful role changes recheck
current capabilities. Reload retains server history but loses unknown in-memory
intents. Native/client controls and protected persistent drafts remain incomplete.
A runtime check found a clipped existing Processing availability heading at 320px;
its Settings-scoped title style now wraps without modifying the root design CSS.
New role controls retain a minimum 44px touch target.

The additive migration defaults existing memberships to revision 1 and adds only
the revision check and partial role-history index. Clean/full-history upgrade,
existing matter/grant preservation, unused down/reapply and used rollback refusal
are tested. Previous SQL files and journal entries are retained. The older
matter-access migration test bounds its own down/reapply range; the new test covers
the entire current migration history.

OpenAPI DTO names are unique to this domain. An initial collision with matter
access DTOs was caught by generated-client typechecking; a contract regression test
now verifies distinct staff/matter inputs. This prevents future DTO reuse from
silently giving native/web clients the wrong role enum.

Sources: [PostgreSQL 17 row locks/deadlocks](https://www.postgresql.org/docs/17/explicit-locking.html)
and [Drizzle migrations](https://orm.drizzle.team/docs/migrations), checked against
installed PostgreSQL 17.6, ORM 0.45.2 and Kit 0.31.10. NestJS 11.2.1, Swagger
11.4.7, nestjs-zod 5.5.0 and Next.js 16.3.6 are unchanged; the installed Next
`use-client.md` guide was read before UI edits. No new dependencies, provider
contracts, credentials, voice architecture, commercial terms or release dates
were introduced.

## D020 — Membership removal revokes access; restoration never re-grants (M01-S06b)

Accepted for the local slice, October 8, 2026. Blueprint p12 requires membership
changes, effective revocation and audit; p39 forbids disclosure across firms and
ethical walls. Before this slice a removed membership kept its matter grants, so
any out-of-band restoration silently reopened walls.

Removal and restoration are separate keyed commands under `/firms/current/staff`
with distinct contracts. Owner/admin hold `firm.staff.memberships.manage`, read
from the live role. Owner memberships stay an owner decision in every direction:
removing an owner, restoring a membership that was an owner, and restoring with the
owner role all need a current owner. This matches D019 role changes.

Removal revokes every active matter grant and the member's pending invitations in
the same transaction as the membership, receipt and audit. Each revoked grant
increments its revision and its matter's `access_revision` and writes a matter
history row whose reason is fixed text; the firm-level reason stays in firm staff
history, readable only by owners/admins. Restoration requires an available account
and an explicitly chosen role, revokes any grant left by an out-of-band removal and
returns no grants. Matter managers grant access again through D018. Keeping dormant
grants for restoration was rejected: it would reopen walls without matter review.

The last available owner and the last eligible manager of a live matter stay
protected through checks now shared with role changes (`staff-policy.ts`). An
unavailable target is not an eligible manager, so a banned or deleted sole manager
can be removed; the matter remains without an eligible manager either way, and
removal stops the grant returning if the ban lifts. Recovering such matters is the
exceptional-recovery decision deferred to M01-S06c; no owner bypass is added.

Locks follow D019: actor account/profile, Auth session, exclusive firm row, target
membership, matter rows in ID order, then grants and invitations. Receipts are
judged before the target so a reused key with different input always conflicts.
Audit rows are stamped with `clock_timestamp()` after the firm lock, so history
cursors follow commit order rather than transaction start.

Accepted trade-offs, each to revisit with its module gate:

- Self-removal commits once; its replay is denied because the actor no longer
  has access (as D018). The web treats the result as a firm-access change.
- Saved Auth sessions regain access after restoration without signing in again.
  Device/session policy and MFA remain M01 gates; a compromised account also needs
  an Auth-level ban.
- The worker invitation check locks membership before firm, the reverse of policy
  commands. This predates the slice (role changes share it); Postgres aborts one
  side of a deadlock with no partial effect. Align when the worker is next changed.
- Removing someone with very many grants does set-based work under the 5 s
  statement timeout while holding the firm lock; the 50-lawyer load gate (M21)
  will measure it.
- The partial history index is created non-concurrently, matching existing
  migrations; `audit_logs` is small before launch. Its rollback only drops the index.
- Clients parse capabilities strictly, so an older bundle rejects the new
  capability until reload. Tolerant capability parsing is a M15 compatibility item.
- The matter-access service still has its own eligibility query; consolidating it
  into `staff-policy.ts` is follow-up work.
- A soft-deleted matter can lose its last manager on removal; matter restoration
  does not exist yet and must re-check managers when added.
- The staff shell shows the previous firm/role until the Auth token refreshes; the
  Settings page and server reads already reflect the removal.

The generated API client was regenerated from the built API and verified in sync.
No dependencies, credentials, providers, deployment or remote services changed.

## D021 — Firm-visible contact directory; party links follow matter grants (M02-S02)

Accepted by the user for the local slice, October 8, 2026 ("keep the recommended
approach"). Blueprint p13 requires people/organizations, matter-party roles and
multiple clients, and the scenario "one client in several matters and several
clients in one matter"; p39 forbids disclosure across firms and ethical walls.
Before this slice the Contacts screen and every party were fixtures.

Directory entries (`contacts`) are visible to every live staff member of the
selected firm, including billing/readonly. Conflict search (M07) needs the whole
firm directory, and hiding entries per matter would fragment the directory and
invite duplicates. A matter-party link (`matter_parties`) reveals that a contact is
involved in a matter, so it is readable only with a current matter grant, through
RLS (`app.has_matter_access`) and the API alike. `GET /contacts/:id/matters` lists
only granted matters and returns no total; a walled matter's title, ID and count
never appear in contact reads. Rejected alternative: per-contact visibility derived
from matter grants, which breaks conflict search and still leaks through names.
A contact created only for a sensitive matter therefore exposes its name (not its
matter) to firm staff; restricted contacts are a later policy option.

Initial capabilities are server decisions, not final configurable policy: contact
create/edit for live owner/admin/attorney/paralegal; billing/readonly read only.
Adding or ending a party needs a manager grant and an owner/admin/attorney role,
matching D018 access management; readers see parties without changing them.

Contracts: person/organization kind fixed at creation; display name 1–200; optional
email and phone (digits/punctuation/extension). Edits send only changed fields with
`expectedRevision`; a stale revision returns `CONTACT_CHANGED`. Party roles are
`client`, `adverse_party` and `other` (label required); configurable roles belong to
practice profiles (M02/M18). At most one current link per contact and matter
(partial unique index → `PARTY_EXISTS`); ending sets `deleted_at` once and the row
stays as history; re-linking creates a new row. Every command is keyed, atomic with
its receipt and audit, and replays the same intent against the current record and
grants. Audits name changed fields and carry the display name but never email or
phone values; contact command receipts keep only the contact and command IDs, since
replays re-read the current record. Personal details therefore stay in the one
protected, correctable row and out of both append-only tables. Display names in the
audit log, and the unsalted input hash shared by every command receipt (service-role
only), are accepted until the retention/erasure policy decision.

Locks: actor account/profile → firm membership (share) → matter → grant → contact or
party, consistent with D018–D020; contact edits lock the contact row, and the
contact-matter read checks the contact without a lock so matter and grant rows
lock first. Directory
order is `lower(display_name), id` with keyset cursors of at most 20 rows; search is a
literal case-insensitive substring (LIKE wildcards escaped). Substring search is not
index-backed; a trigram index is deferred to conflict search (M07). Case folding
relies on a UTF-8 database ctype (local: en_US.UTF-8); hosted environments must
match.

The migration is additive: forced RLS, select-only for `authenticated`, composite
same-firm keys, provenance triggers (contact kind immutable), and a link trigger
that requires links to start current and end once, after they began. The rollback
locks both tables, refuses when contacts, links, receipts or audits exist, and
otherwise drops only the new objects; like earlier rollbacks it leaves
`supabase_migrations` version rows to the operator. A fresh-context adversarial
review found a `NULL` label passing the `other` check, born-ended links and an
unlocked rollback check; all were fixed before commit. The closing code review and
security audit found personal details in contact receipts and an inverted read lock
order (fixed); the test review added each grant/role condition alone, owner/admin
walls, per-target keys, tied-name paging and removed-member RLS cases. Accepted
trade-offs: the database `btrim` check is weaker than Zod's Unicode trim (only the
API writes), and contact archiving (and refusing to archive a contact with current
links) arrives with a later lifecycle slice.

## D022 — Firm practice profiles with immutable versions; matter values follow grants (M02-S03)

Accepted by the user for the local slice, October 8, 2026 ("approved"). Blueprint p13
requires configurable practice profiles and typed fields so a firm can add a practice
area and field set without deploying code, and transactional/advisory matters with no
court field; p29/pp34–35 call for operational starter profiles across practice families
with appropriately optional fields; p34 requires packs to be versioned with existing
matters keeping their selected version. Before this slice practice areas were a closed
six-value frontend type and the Settings playbooks were fixtures.

A firm profile (`practice_profiles`) is configuration visible to every live staff member
of the firm, archived ones included, because matters stay pinned to archived versions.
Each published field set is an immutable `practice_profile_versions` row; changing fields
publishes version N+1, while renaming, describing, archiving or restoring changes only
the profile and its revision. A matter pins one version (`matters.profile_version_id`,
set once, never re-pinned in place) and holds its values in `matters.field_values`, so
values follow the existing matter grant policy exactly as titles do; owners/admins have
no bypass. Rejected alternatives: values in a separate table (a second grant policy to
keep in step) and editable versions (existing matters would silently change shape).

Initial capabilities are server decisions: profile create/revise for live owner/admin;
every live role reads profiles. Editing a matter's values, or assigning a profile to a
matter without one, needs a manager grant and an owner/admin/attorney/paralegal role.
Matter creation keeps D017's owner/admin/attorney rule. New work (creation or a first
assignment) accepts only the current version of an active profile (`PROFILE_CHANGED`,
`PROFILE_ARCHIVED`); existing matters keep showing and editing archived versions.

Field types are short text, long text, number, date, yes/no and choice; every field is
optional unless marked required; keys are stable per version and new keys derive from
labels. Money and contact-reference fields, matter types, configurable party roles,
version upgrades for existing matters, jurisdiction/venue references and M18 pack
versions/coverage records are deferred. Twelve operational starters in `@lawfirm/core`
(generic, not reviewed for any jurisdiction, no required or money fields; court/docket
fields kept out of transactional, advisory and agency starters) are copied into a firm
profile that records `basedOn` provenance; adding a starter needs a deploy, adding a firm
profile does not.

Shared rules in `@lawfirm/core` validate each value by type, refuse unknown keys, missing
required values, unstorable text (NUL, unpaired surrogates), value sets over 90000 UTF-8
bytes and field sets over 90000 bytes, so every accepted payload fits one request under
the API's 100 KB body limit (an oversized body is a final 413, not a retryable 500). The
database budgets (400000 bytes of values, checked by a trigger only when values are
written; 1000000 bytes of definitions) always accept what the rules accept. Published
field types are locked in the editor and keys of the current version stay reserved, so a
key keeps one type within a profile's later versions. Receipts keep identifiers
only and audits keep field keys, the pinned version and revisions, never values. Profile
names, descriptions and field definitions are firm configuration and appear in audits.

Locks: actor account → firm membership (share) → matter (update) → grant (share) →
profile (share for new work, update for revisions). The migration is additive: forced
RLS, select-only for `authenticated`, composite same-firm keys, a deferred key from each
profile to its current version, provenance/revision triggers, history that refuses
update, delete and truncate for every role, a `deleted_at is null` rule (profiles are
archived, never soft-deleted) and a partial index on pinned matters. The rollback refuses
early without locks, then under a lock and statement timeout refuses with any profile,
version, pin or command history; operators must mark the migration rows reverted.

Two fresh-context adversarial reviews reproduced and drove fixes before commit: a CHECK
that re-read large values on every matter update, a value budget narrower than core
accepted, deletable/truncatable history, soft-deletable profiles breaking pinned matters,
dangling current versions, NUL/surrogate text reaching the database (and its log),
required fields keyed like `constructor`, reordered retries conflicting, and rollback
locking. The closing code review, security audit and test review found and drove fixes for
editors unmounting or diffing against refetched data (input loss and silent overwrites),
a matter created without its still-loading profile, `constructor`-keyed fields in the web
forms, starter checks blocking a committed replay, the 100 KB body limit, and two races
where a locked join answered 404 instead of `PROFILE_CHANGED` or served a matter revision
without its profile summary (fixed by locking first and reading joined rows separately).
Follow-ups: per-field error placement in the profile editor, per-firm profile/version caps
and a per-route write throttle, and `basedOn` is client-asserted provenance, not proof a
profile matches a reviewed starter. Accepted trade-offs: case-insensitive name uniqueness uses `lower()` and depends
on the database locale (no Unicode case folding or normalization); the unsalted receipt
input hash now covers low-entropy field values (extends D021, pending the retention
policy, HMAC is the follow-up); the forward migration adds columns, a key, a check and an
index on `matters` under one lock with a 5s lock timeout, so a large hosted table needs a
maintenance window; the two migration files apply as separate transactions like earlier
slices.

## D023 — Catalog jurisdictions, firm forums and grant-scoped matter references (M02-S04)

Accepted by the user for the local slice, October 8, 2026 ("approved"). Blueprint p13 step 4
requires firm location, lawyer admissions, governing law, venue, agency and procedural
ruleset references to stay separate, with several jurisdiction/venue references per matter
and optional court and docket fields; p36 requires states, DC, federal forums, agencies and
territories as configurable jurisdiction records, several references or no court at all,
and an explicit statement of which behavior is supported; p39 requires multi-jurisdiction,
agency and non-court matters without California or litigation assumptions.

The jurisdiction catalog is code in `@lawfirm/core`: the 50 states, DC, the five inhabited
territories (AS, GU, MP, PR, VI) and federal (`US`), with stable codes. Two database checks
hold the same 57 codes, and the API integration suite compares them, so adding a
jurisdiction is a deploy with a migration. Tribal, foreign and international forums are not
in the catalog; a firm can record such a body only as an `other` reference under the
closest catalog jurisdiction until a reviewed extension.

A forum (`forums`) is a court, agency, tribunal or other body under one catalog
jurisdiction. Forums are firm configuration readable by every live staff member, archived
ones included because existing references keep naming them. Owners, admins, attorneys and
paralegals create forums (staff who open matters add the body they appear before); only
owners and admins rename, archive or restore them with an expected revision. Kind and
jurisdiction never change, so a reference never changes meaning; active names are unique per
firm and jurisdiction (`lower()`, as D022). Forums are archived, never deleted. Forum names, docket numbers and labels are single-line
display text: control characters, bidi overrides/isolates and zero-width characters are
refused (they reorder a rendered line or let lookalike names pass the uniqueness rule), and
the web isolates each user-entered part with `<bdi>`.

A matter reference (`matter_jurisdictions`) has a purpose (governing law, venue or
proceeding, agency, other), a catalog jurisdiction, an optional forum of the same firm and
the same jurisdiction (a composite key enforces both), an optional docket or case number,
and a label only and always for `other`. Governing law never has a forum or docket. A
matter may hold none or up to 50 current references and 500 in all, ended ones included, so
history stays bounded; identical current references are refused, ignoring letter case in
docket numbers and labels. References live beside the matter and follow its grants exactly as parties do
(D021); owners and admins have no bypass. Adding or ending needs a manager grant and an
owner/admin/attorney/paralegal role (as D022 field edits). Ending is a soft end recorded
once; history is never rewritten, deleted or truncated while triggers run. References do
not carry a matter revision: add and end refuse duplicates and repeated endings instead,
because neither overwrites another person's edit. References are never derived from the
firm address or lawyer admissions, which stay out of scope. Each reference reports
`automation: 'none'` and the matter panel says no jurisdiction-specific deadlines or rules
are applied; manual entry stays possible (p36 unsupported behavior).

Receipts keep identifiers only; audits keep purpose, jurisdiction code, forum id and end
time, never docket numbers or labels. Locks: account → firm membership → matter (no-key
update for adds, so the cap is counted without a race; share for reads and ends) → grant →
forum (share, so an archive waits) or reference. The database also refuses, if the API is
bypassed by the service writer, a forum or reference that does not start fresh (a forum at
revision 1 and active; both stamped by the transaction clock, by a live member of the firm),
a reference on a deleted matter or naming an archived forum, end or archive times after the
database clock, and a forum change that does not advance the revision by exactly one. Clients
get column-level `select` grants, not table grants, because PostgREST otherwise exposes
row-lock system columns (`xmax`) that reveal when a walled matter used a firm-visible forum. The migration adds foreign keys under a 5s lock timeout; the
rollback refuses early without locks, then locks firms, profiles and matters before the
slice's tables and the receipt/audit tables (the order API commands use), reads with row
security off and refuses with any forum, reference, receipt or audit; it needs a
maintenance window and a migration-history repair.

Rejected alternatives: a firm-editable jurisdiction table (codes are national reference data
and the DB checks keep them exact), forum text on each reference (no shared records for
p36), deriving jurisdiction from the firm address or admissions (p13 keeps them separate),
and a matter revision on reference changes (would make every field editor stale).

A fresh-context adversarial review reproduced and drove fixes before commit: a rollback that
deadlocked with ordinary API traffic, a forward migration without a lock timeout, triggers
that accepted future times, archived forums, deleted matters and unversioned forum changes,
an end path that blocked matter reads, and retries that changed UUID case conflicting.
The closing security audit reproduced the `xmax` side channel and found lookalike/bidi text,
insert-time provenance gaps and unbounded ended history; the code review found a forum rename
lost on refetch, a stale inline forum picker, archived forums that could not be renamed back
into use, case-sensitive duplicates and focus dropped after changes; the test review added 46
edge cases (roles alone, replays after access changes, key reuse, races, paging ties,
identical answers for foreign and missing ids, unstorable text, 413) and found no defect. All
findings were fixed with tests.
Accepted trade-offs: the unsalted receipt input hash now also covers docket numbers and
labels (extends D021/D022; HMAC with a server-held key is the follow-up, pending the
retention policy); replays return the current row with the original command id, as D022;
a forum created while working on a walled matter is visible firm-wide with its creator and
time, like D021 contact names; there is no per-firm forum cap or write throttle yet; the API
connects as the table owner, so grants to `service_role` do not restrict it; ended
references stay readable through RLS to granted staff (history follows the grant); audit rows
for references use `record_type='matter'`, so any future firm-wide audit view must filter them
by matter grant; other firm-visible tables still grant whole-table `select` and need the same
column-grant review for system columns (follow-up); the matter page hides its panels while it
refetches, so keyboard focus in any panel drops on returning to the window (pre-existing,
follow-up); invalid UTF-8 bodies are decoded with replacement characters by the body parser
(pre-existing).
