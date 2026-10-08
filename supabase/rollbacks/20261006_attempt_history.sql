BEGIN;
-- Roll back application code first. Existing workers remain valid on the additive schema.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.job_execution_attempts)
    THEN RAISE EXCEPTION 'Rollback refused: execution attempt evidence exists'; END IF;
END $$;
DROP TABLE public.job_execution_attempts;
DROP FUNCTION app.protect_execution_attempt();
DROP INDEX public.job_executions_identity_uq;
COMMIT;
