-- Roll back BOTH 20261006002359_careful_zzzax and 20261006002400_execution_security.
-- Stop the new API first. Refuses to discard any execution/audit history.
-- Once commands exist, preserve history and use a forward corrective migration instead.
begin;
do $$ begin
  if exists(select 1 from public.command_receipts)
    or exists(select 1 from public.audit_logs)
    or exists(select 1 from public.outbox_events) then
    raise exception 'Rollback refused: execution history exists; use forward recovery';
  end if;
end $$;

drop policy "members read their firm" on public.firms;
create policy "members read their firm" on public.firms for select to authenticated
  using (id = app.current_firm_id() and deleted_at is null);
drop policy "members read colleague profiles" on public.profiles;
create policy "members read colleague profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from public.firm_members fm where fm.user_id = profiles.id
      and fm.firm_id = app.current_firm_id() and fm.deleted_at is null
  ));
drop policy "members read firm memberships" on public.firm_members;
create policy "members read firm memberships" on public.firm_members for select to authenticated
  using (firm_id = app.current_firm_id());
drop policy "members read firm practice areas" on public.practice_areas;
create policy "members read firm practice areas" on public.practice_areas for select to authenticated
  using (firm_id = app.current_firm_id() and deleted_at is null);
drop function app.is_active_firm_member(uuid);

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security invoker set search_path = public
as $$
declare claims jsonb; member record;
begin
  claims := coalesce(event -> 'claims', '{}'::jsonb);
  select fm.firm_id, fm.role into member from public.firm_members fm
    where fm.user_id = (event ->> 'user_id')::uuid and fm.deleted_at is null
    order by fm.created_at asc limit 1;
  if found then
    claims := jsonb_set(claims, '{firm_id}', to_jsonb(member.firm_id::text));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(member.role::text));
  end if;
  return jsonb_set(event, '{claims}', claims);
end;
$$;
drop table public.outbox_events;
drop table public.command_receipts;
drop table public.audit_logs;
drop function app.reject_audit_mutation();
alter table public.firms drop constraint firms_revision_nonnegative;
alter table public.firms drop column revision;
commit;
