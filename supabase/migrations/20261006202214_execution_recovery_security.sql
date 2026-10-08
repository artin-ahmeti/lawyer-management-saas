-- M00-S03d: retained recovery provenance, available only through authorized API commands.
ALTER TABLE public.execution_recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_recoveries FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.execution_recoveries FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.execution_recoveries TO service_role;

CREATE FUNCTION app.reject_recovery_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Recovery provenance cannot be rewritten' USING ERRCODE = '42501';
END $$;
REVOKE ALL ON FUNCTION app.reject_recovery_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_execution_recovery BEFORE UPDATE ON public.execution_recoveries
  FOR EACH ROW EXECUTE FUNCTION app.reject_recovery_mutation();
