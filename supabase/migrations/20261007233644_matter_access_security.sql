-- M01-S05a / M02-S01: explicit grants for every matter, including firm owners.
alter table public.matters enable row level security;
alter table public.matters force row level security;
alter table public.matter_access enable row level security;
alter table public.matter_access force row level security;
revoke all on public.matters, public.matter_access from public, anon, authenticated, service_role;
grant select on public.matters, public.matter_access to authenticated;
grant select, insert, update on public.matters, public.matter_access to service_role;

create function app.has_matter_access(target_firm uuid, target_matter uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select $1=app.current_firm_id() and app.is_active_firm_member($1) and exists (
    select 1 from public.matters m join public.matter_access a
      on a.firm_id=m.firm_id and a.matter_id=m.id
    where m.firm_id=$1 and m.id=$2 and m.deleted_at is null
      and a.user_id=(select auth.uid()) and a.deleted_at is null
  )
$$;
revoke all on function app.has_matter_access(uuid,uuid) from public,anon;
grant execute on function app.has_matter_access(uuid,uuid) to authenticated,service_role;
create policy "granted staff read matters" on public.matters for select to authenticated
  using (app.has_matter_access(firm_id,id));
create policy "staff read their current matter grants" on public.matter_access for select to authenticated
  using (user_id=(select auth.uid()) and deleted_at is null and app.has_matter_access(firm_id,matter_id));
create trigger set_updated_at before update on public.matters
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.matter_access
  for each row execute function app.set_updated_at();

-- An update cannot relocate a matter or rewrite who created it.
create function app.protect_matter_provenance()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.id is distinct from old.id or new.firm_id is distinct from old.firm_id
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'Matter provenance is immutable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function app.protect_matter_provenance() from public,anon,authenticated;
create trigger protect_matter_provenance before update on public.matters
  for each row execute function app.protect_matter_provenance();
create function app.protect_matter_grant_provenance()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.id is distinct from old.id or new.firm_id is distinct from old.firm_id
    or new.matter_id is distinct from old.matter_id or new.user_id is distinct from old.user_id
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'Matter grant provenance is immutable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function app.protect_matter_grant_provenance() from public,anon,authenticated;
create trigger protect_matter_grant_provenance before update on public.matter_access
  for each row execute function app.protect_matter_grant_provenance();
