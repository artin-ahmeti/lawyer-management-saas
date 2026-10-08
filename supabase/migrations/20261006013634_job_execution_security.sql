-- Execution tables are server-only. No client policy or grant exposes queue payloads/results.
ALTER TABLE public.job_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_executions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_executions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.job_executions TO service_role;
ALTER TABLE public.job_executions ADD CONSTRAINT job_executions_event_identity CHECK (id = outbox_event_id);
ALTER TABLE public.outbox_events ADD CONSTRAINT outbox_events_dispatch_lease
  CHECK ((dispatch_lease_token IS NULL) = (dispatch_lease_until IS NULL));
