BEGIN;
-- Used execution history is preserved. Deploy the previous worker against the additive schema or forward-repair it.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.job_executions) OR EXISTS (
    SELECT 1 FROM public.outbox_events WHERE dispatch_lease_token IS NOT NULL OR last_error_code IS NOT NULL
  ) THEN RAISE EXCEPTION 'Rollback refused: job execution evidence exists'; END IF;
END $$;
DROP INDEX IF EXISTS public.outbox_events_firm_created_idx;
DROP INDEX IF EXISTS public.outbox_events_recovery_idx;
DROP TABLE public.job_executions;
ALTER TABLE public.outbox_events DROP CONSTRAINT outbox_events_dispatch_lease;
ALTER TABLE public.outbox_events DROP COLUMN dispatch_lease_token,
  DROP COLUMN dispatch_lease_until, DROP COLUMN last_error_code;
COMMIT;
