-- M01-S06b: dropping the history index loses no records. Membership/audit rows stay;
-- the previous API simply cannot read or restore them through this command.
begin;
drop index public.audit_logs_staff_membership_history_idx;
commit;
