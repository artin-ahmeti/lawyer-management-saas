-- An unused additive upgrade can be reversed. Never discard profile versions or matter values.
-- Run it while matter traffic is quiet. It refuses early without locks, then fails after the
-- lock or statement timeout rather than queueing ahead of matter reads; a timeout or deadlock
-- abort leaves nothing changed. Afterwards, mark 20261008190310/11 as reverted in the
-- migration history (supabase migration repair) so a later push reapplies them.
do $$ begin
  if exists(select 1 from public.practice_profiles) then
    raise exception 'Rollback refused: practice profile history exists; use a reviewed forward correction';
  end if;
end; $$;
begin;
set local lock_timeout='3s';
set local statement_timeout='10s';
-- Small tables first, then matters; hold writers off until the objects are gone.
lock table public.practice_profiles, public.practice_profile_versions in access exclusive mode;
lock table public.matters in access exclusive mode;
lock table public.command_receipts, public.audit_logs in share mode;
do $$ begin
  -- A matter holds values only with a pinned version (matters_field_values), and the partial
  -- index on pinned matters answers this without reading values.
  if exists(select 1 from public.practice_profiles)
    or exists(select 1 from public.practice_profile_versions)
    or exists(select 1 from public.matters where profile_version_id is not null)
    or exists(select 1 from public.command_receipts where command in
      ('practice_profile.create.v1','practice_profile.revise.v1','matter.fields.update.v1'))
    or exists(select 1 from public.audit_logs where action in
      ('practice_profile.create.v1','practice_profile.revise.v1','matter.fields.update.v1')) then
    raise exception 'Rollback refused: practice profile history exists; use a reviewed forward correction';
  end if;
end; $$;
drop trigger protect_matter_profile_pin on public.matters;
drop trigger check_matter_field_values on public.matters;
alter table public.matters drop constraint matters_profile_version_fk;
alter table public.matters drop constraint matters_field_values;
alter table public.matters drop column field_values;
alter table public.matters drop column profile_version_id;
alter table public.practice_profiles drop constraint practice_profiles_current_version_fk;
drop table public.practice_profile_versions;
drop table public.practice_profiles;
drop function app.protect_matter_profile_pin();
drop function app.check_matter_field_values();
drop function app.protect_practice_profile_provenance();
drop function app.protect_practice_profile_history();
commit;
