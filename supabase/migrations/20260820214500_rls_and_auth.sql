-- ============================================================================
-- Phase 1 security core (hand-written; pairs with the generated schema migration)
--   1. app schema: JWT claim helpers + updated_at trigger
--   2. profiles wired to auth.users (FK + auto-provision trigger)
--   3. custom access token hook: firm_id + user_role claims
--   4. RLS enabled AND FORCED on every tenant table, select-only policies
--   5. THE WRITE-PATH RULE: insert/update/delete revoked from client roles,
--      now and (via default privileges) for every future table
-- ============================================================================

-- 1 ── app schema + helpers -------------------------------------------------
create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

create or replace function app.current_firm_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'firm_id', '')::uuid
$$;

create or replace function app.current_user_role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', '')
$$;

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 2 ── profiles ↔ auth.users ------------------------------------------------
alter table public.profiles
  add constraint profiles_id_auth_users_fk
  foreign key (id) references auth.users (id) on delete cascade;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at triggers
create trigger set_updated_at before update on public.firms
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.profiles
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.firm_members
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.practice_areas
  for each row execute function app.set_updated_at();

-- 3 ── custom access token hook ---------------------------------------------
-- GoTrue calls this before issuing a token; it stamps firm_id + user_role
-- claims from firm_members. Config: [auth.hook.custom_access_token] in
-- config.toml (local) / Auth > Hooks (hosted dashboard).
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  member record;
begin
  claims := coalesce(event -> 'claims', '{}'::jsonb);

  select fm.firm_id, fm.role
    into member
    from public.firm_members fm
   where fm.user_id = (event ->> 'user_id')::uuid
     and fm.deleted_at is null
   order by fm.created_at asc
   limit 1;

  if found then
    claims := jsonb_set(claims, '{firm_id}', to_jsonb(member.firm_id::text));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(member.role::text));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from anon, authenticated, public;

-- 4 ── RLS: enabled AND forced ----------------------------------------------
alter table public.firms          enable row level security;
alter table public.profiles       enable row level security;
alter table public.firm_members   enable row level security;
alter table public.practice_areas enable row level security;

alter table public.firms          force row level security;
alter table public.profiles      force row level security;
alter table public.firm_members   force row level security;
alter table public.practice_areas force row level security;

-- The hook (running as supabase_auth_admin, which does NOT bypass RLS) must
-- read firm_members.
grant select on table public.firm_members to supabase_auth_admin;
create policy "auth admin reads memberships"
  on public.firm_members for select
  to supabase_auth_admin
  using (true);

-- Client (authenticated) read policies — firm-scoped via the JWT claim.
create policy "members read their firm"
  on public.firms for select
  to authenticated
  using (id = app.current_firm_id() and deleted_at is null);

create policy "members read colleague profiles"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
        from public.firm_members fm
       where fm.user_id = profiles.id
         and fm.firm_id = app.current_firm_id()
         and fm.deleted_at is null
    )
  );

create policy "members read firm memberships"
  on public.firm_members for select
  to authenticated
  using (firm_id = app.current_firm_id());

create policy "members read firm practice areas"
  on public.practice_areas for select
  to authenticated
  using (firm_id = app.current_firm_id() and deleted_at is null);

-- 5 ── THE WRITE-PATH RULE (CLAUDE.md — never violate) -----------------------
-- Clients never write Postgres directly; all writes go through the API
-- (service_role, which has bypassrls). Revoke writes structurally so no
-- accidental write policy can ever matter.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;

-- Future tables created by migrations (running as postgres) inherit the same.
alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger
  on tables
  from anon, authenticated;

-- Modern Supabase projects grant clients NOTHING by default — perfect for the
-- write-path rule. Reads are granted explicitly, table by table; every future
-- migration that adds a client-readable table must add its own `grant select`.
grant select
  on public.firms, public.profiles, public.firm_members, public.practice_areas
  to authenticated;
-- anon gets no table access at all (public intake goes through the API).
