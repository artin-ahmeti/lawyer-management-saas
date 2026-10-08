-- M01-S03: staff grants and recipient discovery run through authenticated API commands.
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_invitations FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.staff_invitations TO service_role;

CREATE FUNCTION app.protect_staff_invitation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (NEW.id, NEW.firm_id, NEW.email, NEW.role, NEW.created_by, NEW.created_at,
      NEW.expires_at, NEW.deleted_at)
      IS DISTINCT FROM
     (OLD.id, OLD.firm_id, OLD.email, OLD.role, OLD.created_by, OLD.created_at,
      OLD.expires_at, OLD.deleted_at)
     OR OLD.status <> 'pending' OR NEW.status NOT IN ('accepted', 'revoked')
     OR NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'Invitation provenance and terminal outcomes cannot be rewritten' USING ERRCODE = '42501';
  END IF;
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.protect_staff_invitation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_staff_invitation BEFORE UPDATE ON public.staff_invitations
  FOR EACH ROW EXECUTE FUNCTION app.protect_staff_invitation();
