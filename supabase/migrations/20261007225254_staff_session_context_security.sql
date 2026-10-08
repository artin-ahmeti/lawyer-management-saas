-- M01-S04b: server-selected context for one real Auth session; never a client write.
alter table public.staff_session_contexts enable row level security;
alter table public.staff_session_contexts force row level security;
revoke all on public.staff_session_contexts from public, anon, authenticated, service_role;
grant select, insert, update on public.staff_session_contexts to service_role;

create or replace function app.staff_session_authorized(session_id uuid, actor_id uuid, target_firm uuid, context_revision integer)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s join auth.users u on u.id=s.user_id
    left join public.staff_session_contexts c on c.session_id=s.id
    where s.id=$1 and s.user_id=$2
      and (s.not_after is null or s.not_after > now())
      and u.deleted_at is null and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= now())
      and (c.id is null or (c.created_by=$2 and c.firm_id=$3
        and c.revision=$4 and c.deleted_at is null))
  )
$$;
-- Internal helper accepts verified arguments in the API, or JWT values in the RLS wrapper.
revoke all on function app.staff_session_authorized(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function app.staff_session_authorized(uuid,uuid,uuid,integer) to service_role;

create or replace function app.is_active_firm_member(target_firm uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.firm_members fm join public.firms f on f.id=fm.firm_id
    where fm.firm_id=target_firm and fm.user_id=(select auth.uid())
      and fm.deleted_at is null and f.deleted_at is null
  ) and (
    nullif(current_setting('request.jwt.claims',true)::jsonb->>'session_id','') is null
    or app.staff_session_authorized(
      (current_setting('request.jwt.claims',true)::jsonb->>'session_id')::uuid,
      (select auth.uid()),target_firm,
      nullif(current_setting('request.jwt.claims',true)::jsonb->>'staff_context_revision','')::integer)
  )
$$;
revoke all on function app.is_active_firm_member(uuid) from public,anon;
grant execute on function app.is_active_firm_member(uuid) to authenticated,service_role;

-- Sources: Supabase sessions and custom-access-token-hook official documentation.
-- Auth's required session_id identifies one login; user metadata never selects scope.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  claims jsonb := coalesce(event->'claims','{}'::jsonb)-'firm_id'-'user_role'-'staff_context_revision';
  selection record;
  member record;
begin
  select c.firm_id,c.revision,c.deleted_at into selection from public.staff_session_contexts c
    where c.session_id=nullif(claims->>'session_id','')::uuid and c.created_by=(event->>'user_id')::uuid;
  if found then
    claims := jsonb_set(claims,'{staff_context_revision}',to_jsonb(selection.revision));
    select fm.firm_id,fm.role into member from public.firm_members fm join public.firms f on f.id=fm.firm_id
      where fm.user_id=(event->>'user_id')::uuid and fm.firm_id=selection.firm_id
        and fm.deleted_at is null and f.deleted_at is null and selection.deleted_at is null;
  else
    -- Preserve existing first-firm/invitation behavior until this session explicitly selects.
    select fm.firm_id,fm.role into member from public.firm_members fm join public.firms f on f.id=fm.firm_id
      where fm.user_id=(event->>'user_id')::uuid and fm.deleted_at is null and f.deleted_at is null
      order by fm.created_at,fm.id limit 1;
  end if;
  if found then
    claims := jsonb_set(claims,'{firm_id}',to_jsonb(member.firm_id::text));
    claims := jsonb_set(claims,'{user_role}',to_jsonb(member.role::text));
  end if;
  return jsonb_set(event,'{claims}',claims);
end;
$$;
revoke all on function public.custom_access_token_hook(jsonb) from public,anon,authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

create or replace function app.protect_staff_session_context()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.session_id is distinct from old.session_id
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at
    or new.revision <> old.revision + 1 then
    raise exception 'Invalid session context revision or provenance' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function app.protect_staff_session_context() from public,anon,authenticated;
create trigger protect_staff_session_context before update on public.staff_session_contexts
  for each row execute function app.protect_staff_session_context();
