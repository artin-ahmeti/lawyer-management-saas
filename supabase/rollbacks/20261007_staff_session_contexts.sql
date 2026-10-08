begin;
do $$ begin
  if exists(select 1 from public.staff_session_contexts)
    or exists(select 1 from public.command_receipts where command='staff.context.select.v1')
    or exists(select 1 from public.audit_logs where action='staff.context.select.v1') then
    raise exception 'Rollback refused: session selection history must be preserved';
  end if;
end $$;
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


drop table public.staff_session_contexts;
drop function app.protect_staff_session_context();
drop function app.staff_session_authorized(uuid,uuid,uuid,integer);
drop index public.command_receipts_context_select_intent_uq;
commit;
