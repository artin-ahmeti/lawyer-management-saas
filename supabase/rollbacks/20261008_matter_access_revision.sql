begin;
-- Revert only an unused policy revision; never erase evidence of access changes.
do $$
begin
  if exists(select 1 from public.matters where access_revision > 1)
    or exists(select 1 from public.command_receipts where command='matter.access.change.v1')
    or exists(select 1 from public.audit_logs where action='matter.access.change.v1') then
    raise exception 'Rollback refused: matter access changes must be preserved';
  end if;
end;
$$;
drop index public.audit_logs_matter_access_history_idx;
alter table public.matters drop constraint matters_access_revision;
alter table public.matters drop column access_revision;
commit;
