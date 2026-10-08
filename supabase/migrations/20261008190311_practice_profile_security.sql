-- M02-S03 (D022): firm practice profiles, immutable field versions and pinned matter values.
-- The API writes; clients read. Matter field values live on matters and keep its grant policy.
alter table public.practice_profiles enable row level security;
alter table public.practice_profiles force row level security;
alter table public.practice_profile_versions enable row level security;
alter table public.practice_profile_versions force row level security;
revoke all on public.practice_profiles, public.practice_profile_versions
  from public, anon, authenticated, service_role;
grant select on public.practice_profiles, public.practice_profile_versions to authenticated;
grant select, insert, update on public.practice_profiles to service_role;
grant select, insert on public.practice_profile_versions to service_role;

-- Profiles are firm configuration: every live staff member of the selected firm reads them,
-- archived ones included, because matters stay pinned to archived versions.
create policy "live staff read firm practice profiles" on public.practice_profiles
  for select to authenticated
  using (firm_id=(select app.current_firm_id())
    and (select app.is_active_firm_member(app.current_firm_id())));
create policy "live staff read firm practice profile versions" on public.practice_profile_versions
  for select to authenticated
  using (firm_id=(select app.current_firm_id())
    and (select app.is_active_firm_member(app.current_firm_id())));
create trigger set_updated_at before update on public.practice_profiles
  for each row execute function app.set_updated_at();

-- A profile's current version always exists. Deferred, because a profile and its first
-- version are created in one transaction and each references the other.
alter table public.practice_profiles add constraint practice_profiles_current_version_fk
  foreign key (firm_id, id, current_version)
  references public.practice_profile_versions(firm_id, profile_id, version)
  deferrable initially deferred;

-- An update cannot relocate a profile, rewrite its provenance or roll back its version or
-- revision.
create function app.protect_practice_profile_provenance()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.id is distinct from old.id or new.firm_id is distinct from old.firm_id
    or new.based_on_key is distinct from old.based_on_key
    or new.based_on_version is distinct from old.based_on_version
    or new.current_version < old.current_version or new.revision < old.revision
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'Practice profile provenance is immutable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function app.protect_practice_profile_provenance() from public,anon,authenticated;
create trigger protect_practice_profile_provenance before update on public.practice_profiles
  for each row execute function app.protect_practice_profile_provenance();

-- Published versions and their profiles are history for pinned matters: versions are never
-- edited, and neither is ever deleted or truncated, whichever role connects.
create function app.protect_practice_profile_history()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'Practice profile history is immutable' using errcode='42501';
end;
$$;
revoke all on function app.protect_practice_profile_history() from public,anon,authenticated;
create trigger protect_practice_profile_version before update or delete on public.practice_profile_versions
  for each row execute function app.protect_practice_profile_history();
create trigger protect_practice_profile_version_truncate before truncate on public.practice_profile_versions
  for each statement execute function app.protect_practice_profile_history();
create trigger protect_practice_profile_delete before delete on public.practice_profiles
  for each row execute function app.protect_practice_profile_history();
create trigger protect_practice_profile_truncate before truncate on public.practice_profiles
  for each statement execute function app.protect_practice_profile_history();

-- A matter's pinned version is assigned once; moving a matter to another version is a
-- later reviewed upgrade command, never an in-place rewrite. Fires only for updates that
-- set profile_version_id on an already pinned matter (field edits do; access bumps do not).
create function app.protect_matter_profile_pin()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.profile_version_id is distinct from old.profile_version_id then
    raise exception 'A matter''s practice profile version is pinned' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function app.protect_matter_profile_pin() from public,anon,authenticated;
create trigger protect_matter_profile_pin before update of profile_version_id on public.matters
  for each row when (old.profile_version_id is not null)
  execute function app.protect_matter_profile_pin();

-- Values are an object within the stored budget. Checked only when values are written, so
-- unrelated matter updates (title, access revision) never re-read large values.
create function app.check_matter_field_values()
returns trigger language plpgsql set search_path='' as $$
begin
  if jsonb_typeof(new.field_values) <> 'object' or octet_length(new.field_values::text) > 400000 then
    raise exception 'Matter field values must be an object within the stored budget'
      using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function app.check_matter_field_values() from public,anon,authenticated;
create trigger check_matter_field_values before insert or update of field_values on public.matters
  for each row execute function app.check_matter_field_values();
