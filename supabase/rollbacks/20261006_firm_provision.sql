BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.command_receipts WHERE command = 'firm.provision.v1') THEN
    RAISE EXCEPTION 'Rollback refused: first-firm command receipts must retain their uniqueness guard';
  END IF;
END $$;
DROP INDEX public.command_receipts_provision_intent_uq;
COMMIT;
