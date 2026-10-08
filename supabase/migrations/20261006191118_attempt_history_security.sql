-- M00-S03c additive history. Existing counters stay intact; no synthetic backfill.
ALTER TABLE public.job_execution_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_execution_attempts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_execution_attempts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.job_execution_attempts TO service_role;

CREATE OR REPLACE FUNCTION app.protect_execution_attempt()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status <> 'running' OR
    (NEW.id, NEW.job_id, NEW.firm_id, NEW.created_by, NEW.attempt_number,
      NEW.lease_token, NEW.started_at, NEW.lease_until, NEW.created_at, NEW.deleted_at)
    IS DISTINCT FROM
    (OLD.id, OLD.job_id, OLD.firm_id, OLD.created_by, OLD.attempt_number,
      OLD.lease_token, OLD.started_at, OLD.lease_until, OLD.created_at, OLD.deleted_at)
  THEN RAISE EXCEPTION 'Attempt history cannot be rewritten' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.protect_execution_attempt() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_execution_attempt BEFORE UPDATE ON public.job_execution_attempts
  FOR EACH ROW EXECUTE FUNCTION app.protect_execution_attempt();
