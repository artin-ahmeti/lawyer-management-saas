begin;
do $$
begin
 if exists(select 1 from public.firm_members where revision > 1)
 or exists(select 1 from public.command_receipts where command='staff.role.change.v1')
 or exists(select 1 from public.audit_logs where action='staff.role.change.v1') then
  raise exception 'Rollback refused: staff role history must be preserved';
 end if;
end;
$$;
drop index public.audit_logs_staff_role_history_idx;
alter table public.firm_members drop constraint firm_members_revision;
alter table public.firm_members drop column revision;
commit;
