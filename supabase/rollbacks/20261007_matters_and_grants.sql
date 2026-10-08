-- An unused additive upgrade can be reversed. Never discard matter/access history.
begin;
do $$ begin
  if exists(select 1 from public.matters) or exists(select 1 from public.matter_access)
    or exists(select 1 from public.command_receipts where command='matter.create.v1')
    or exists(select 1 from public.audit_logs where action='matter.create.v1') then
    raise exception 'Rollback refused: matter or access history exists; use a reviewed forward correction';
  end if;
end; $$;
drop policy "granted staff read matters" on public.matters;
drop policy "staff read their current matter grants" on public.matter_access;
drop function app.has_matter_access(uuid,uuid);
drop table public.matter_access;
drop table public.matters;
drop function app.protect_matter_provenance();
drop function app.protect_matter_grant_provenance();
commit;
