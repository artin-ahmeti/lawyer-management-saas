-- M00-S01: server-only execution records, live membership reads, stale-claim removal.
-- Runs immediately after Drizzle's 20261006002359 schema migration. See supabase/rollbacks.

create or replace function app.is_active_firm_member(target_firm uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.firm_members fm
    join public.firms f on f.id = fm.firm_id
    where fm.firm_id = target_firm and fm.user_id = (select auth.uid())
      and fm.deleted_at is null and f.deleted_at is null
  )
$$;
revoke all on function app.is_active_firm_member(uuid) from public, anon;
grant execute on function app.is_active_firm_member(uuid) to authenticated, service_role;

drop policy "members read their firm" on public.firms;
create policy "members read their firm" on public.firms for select to authenticated
  using (id = app.current_firm_id() and deleted_at is null and app.is_active_firm_member(id));

drop policy "members read colleague profiles" on public.profiles;
create policy "members read colleague profiles" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (
    app.is_active_firm_member(app.current_firm_id()) and exists (
      select 1 from public.firm_members fm where fm.user_id = profiles.id
        and fm.firm_id = app.current_firm_id() and fm.deleted_at is null
    )
  ));

drop policy "members read firm memberships" on public.firm_members;
create policy "members read firm memberships" on public.firm_members for select to authenticated
  using (firm_id = app.current_firm_id() and deleted_at is null
    and app.is_active_firm_member(firm_id));

drop policy "members read firm practice areas" on public.practice_areas;
create policy "members read firm practice areas" on public.practice_areas for select to authenticated
  using (firm_id = app.current_firm_id() and deleted_at is null
    and app.is_active_firm_member(firm_id));

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer
set search_path = ''
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb) - 'firm_id' - 'user_role';
  member record;
begin
  select fm.firm_id, fm.role into member
    from public.firm_members fm join public.firms f on f.id = fm.firm_id
    where fm.user_id = (event ->> 'user_id')::uuid
      and fm.deleted_at is null and f.deleted_at is null
    order by fm.created_at, fm.id limit 1;
  if found then
    claims := jsonb_set(claims, '{firm_id}', to_jsonb(member.firm_id::text));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(member.role::text));
  end if;
  return jsonb_set(event, '{claims}', claims);
end;
$$;
revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

alter table public.command_receipts enable row level security;
alter table public.command_receipts force row level security;
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;
alter table public.outbox_events enable row level security;
alter table public.outbox_events force row level security;
revoke all on public.command_receipts, public.audit_logs, public.outbox_events
  from public, anon, authenticated, service_role;
grant select, insert on public.command_receipts, public.audit_logs to service_role;
grant select, insert, update on public.outbox_events to service_role;

create or replace function app.reject_audit_mutation()
returns trigger language plpgsql set search_path = ''
as $$ begin raise exception 'Audit history is append-only' using errcode = '42501'; end; $$;
revoke all on function app.reject_audit_mutation() from public, anon, authenticated;
create trigger audit_logs_append_only before update or delete on public.audit_logs
  for each row execute function app.reject_audit_mutation();
create trigger audit_logs_no_truncate before truncate on public.audit_logs
  for each statement execute function app.reject_audit_mutation();

create trigger set_updated_at before update on public.outbox_events
  for each row execute function app.set_updated_at();
alter table public.firms add constraint firms_revision_nonnegative check (revision >= 0);
