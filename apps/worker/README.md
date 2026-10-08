# Clepso worker

The M00 worker dispatches committed Postgres outbox events to BullMQ and records
execution state/results in Postgres. It verifies `firm.renamed.v1` and
`firm.profile-check-requested.v1` against current owner/admin membership and the
source revision. `staff.invitation-check-requested.v1` verifies invitation state
and the current issuer/recipient membership and account; accepted readonly staff
may verify their own outcome. These are internal receipts: they send no email,
create no staff grants, update no provider, and establish no external delivery.
Other event types end visibly blocked until their authorized domain handler exists.

Run with explicit server configuration:

```sh
env DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres REDIS_URL=redis://127.0.0.1:6379 pnpm --filter @lawfirm/worker dev
```

Use a private Redis service with persistence and `maxmemory-policy noeviction`.
Apply repository migrations before starting the new worker. Database/Redis
credentials remain server-side; neither is included in queue messages or logs.
The heartbeat skeleton was replaced after the real dispatcher/consumer was verified.

Processing rules:

- A poll recovers and claims at most 25 events. Polls do not overlap in one process;
  concurrent processes use `FOR UPDATE SKIP LOCKED` and dispatch lease tokens.
- Each event has one durable job. Redis carries only its UUID. Dispatch failure
  preserves pending work with capped exponential backoff (maximum 300 seconds).
- A 30-second dispatch lease recovers interrupted dispatch. A nonterminal job
  with an old dispatch timestamp is eligible for re-enqueue even after Redis loss.
- Execution uses a 30-second lease, a five-attempt cap and bounded database work.
  Current membership/role, source revision and event context are checked inside
  the completion transaction. Stale executors cannot overwrite a newer lease.
- Result transaction failure records retry/failed work. A fifth crashed attempt
  ends with `ATTEMPTS_EXHAUSTED`. Repeated queue messages cannot repeat a terminal
  result. Terminal blocked/failed jobs need an explicit authorized resolution in
  a later operational slice; they are not silently reactivated.
- SIGINT/SIGTERM stops polling and drains work, with a ten-second shutdown limit.
  An interrupted lease remains durable for another process to recover.

Inspection: owner/admin `GET /firms/current/executions` returns at most 20 recent
firm events, including awaiting-dispatch, retry, blocked and failed states. It omits
payloads/results and excludes matter/provider events. Domain-specific permission
checks are required before any future event family is exposed.

```sh
pnpm --filter @lawfirm/worker test
pnpm --filter @lawfirm/worker typecheck
REDIS_URL=redis://127.0.0.1:6389 pnpm --filter @lawfirm/worker test:integration
```

Integration tests use disposable local Postgres databases and uniquely named Redis
queues. They do not reset or dispatch the developer's business records. CI provides
Redis on port 6379 and overrides the test default.

Operational inspection and recovery guidance lives in
[the implementation decisions](../../docs/implementation/DECISIONS.md#d005--postgres-owned-job-recovery).
Broader failed-work inspection, per-attempt history, production metrics/traces,
staging restoration and representative load validation remain M00 gates.

The worker publishes an ephemeral heartbeat after a successful database recovery/
dispatch poll while both consumer connections and the producer connection are ready.
Its Redis key is namespaced by a hash of the configured database host/port/name;
credentials and query options are excluded. Evidence expires after 15 seconds.
It is operational telemetry, not authoritative job state or proof of provider delivery.
API and worker must use the same database connection target and private deployment
Redis. Different connection aliases conservatively produce an unconfirmed signal.

Owner/admin `GET /firms/current/processing-readiness` reads that evidence with bounded
queue probes and current database membership checks before and after network I/O.
Database unavailability prevents authorization and returns 503. Queue failure returns
an unavailable queue and unknown worker; no heartbeat returns an unconfirmed worker.
Staff Settings consumes the shared contract; `/health` remains liveness only.

Operational checks: correlate `processing_availability_checked` and `http_completed`
by request ID. If the queue is unavailable, check the deployment Redis connection;
if no recent worker is observed, check worker process/DB connectivity and poll logs.
Restore the connection/process and refresh availability; inspect each durable job's
outcome separately. A database outage never authorizes a cached successful snapshot.
Do not clear terminal job state to imply recovery; audited retry remains a later slice.
