BEGIN;
-- Roll application code back first. Retained review evidence cannot be discarded by this rollback.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.execution_recoveries)
    THEN RAISE EXCEPTION 'Rollback refused: execution recovery evidence exists'; END IF;
END $$;
DROP TABLE public.execution_recoveries;
DROP FUNCTION app.reject_recovery_mutation();
DROP INDEX public.outbox_events_identity_uq;
COMMIT;
