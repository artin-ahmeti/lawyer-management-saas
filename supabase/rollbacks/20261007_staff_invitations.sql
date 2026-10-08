BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.staff_invitations)
     OR EXISTS (SELECT 1 FROM public.command_receipts WHERE command LIKE 'staff.invitation.%')
     OR EXISTS (SELECT 1 FROM public.audit_logs WHERE record_type = 'staff_invitation')
     OR EXISTS (SELECT 1 FROM public.outbox_events WHERE event_type = 'staff.invitation-check-requested.v1') THEN
    RAISE EXCEPTION 'Rollback refused: invitation records and grant history must be retained';
  END IF;
END $$;
DROP TABLE public.staff_invitations;
DROP FUNCTION app.protect_staff_invitation();
DROP INDEX public.command_receipts_invitation_accept_intent_uq;
COMMIT;
