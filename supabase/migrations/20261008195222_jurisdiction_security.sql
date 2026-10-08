-- M02-S04 (D023): firm forums and matter jurisdiction references. The API writes; clients read.
alter table public.forums enable row level security;
alter table public.forums force row level security;
alter table public.matter_jurisdictions enable row level security;
alter table public.matter_jurisdictions force row level security;
revoke all on public.forums, public.matter_jurisdictions from public, anon, authenticated, service_role;
grant select on public.forums, public.matter_jurisdictions to authenticated;
grant select, insert, update on public.forums, public.matter_jurisdictions to service_role;

-- Forums are firm configuration: every live staff member of the selected firm reads them,
-- archived ones included, because existing references keep naming archived forums. A
-- reference reveals what a matter is about, so it is readable only with a current grant.
create policy "live staff read firm forums" on public.forums for select to authenticated
  using (firm_id=(select app.current_firm_id())
    and (select app.is_active_firm_member(app.current_firm_id())));
create policy "granted staff read matter jurisdictions" on public.matter_jurisdictions
  for select to authenticated using (app.has_matter_access(firm_id,matter_id));
create trigger set_updated_at before update on public.forums
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.matter_jurisdictions
  for each row execute function app.set_updated_at();

-- An update cannot relocate a forum, change what kind of body it is or where it sits, or
-- rewrite who created it. Renaming and archiving are the only changes, and each advances the
-- revision by exactly one, so a reviewed edit can never be skipped silently.
create function app.protect_forum_provenance()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.id is distinct from old.id or new.firm_id is distinct from old.firm_id
    or new.kind is distinct from old.kind or new.jurisdiction is distinct from old.jurisdiction
    or new.revision <> old.revision + (case when new.name is distinct from old.name
      or new.archived_at is distinct from old.archived_at then 1 else 0 end)
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'Forum provenance is immutable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function app.protect_forum_provenance() from public,anon,authenticated;
create trigger protect_forum_provenance before update on public.forums
  for each row execute function app.protect_forum_provenance();

-- A reference is history: it starts current, on a live matter, naming an active forum if any,
-- and may only be ended, once, between when it began and now.
create function app.protect_matter_jurisdiction_history()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then
    if new.deleted_at is not null or new.created_at > clock_timestamp() then
      raise exception 'A matter jurisdiction reference starts current' using errcode='42501';
    end if;
    if exists(select 1 from public.matters m where m.firm_id=new.firm_id and m.id=new.matter_id
        and m.deleted_at is not null)
      or exists(select 1 from public.forums f where f.firm_id=new.firm_id and f.id=new.forum_id
        and f.archived_at is not null) then
      raise exception 'A new reference needs a live matter and an active forum' using errcode='42501';
    end if;
    return new;
  end if;
  if old.deleted_at is not null or new.deleted_at is null or new.deleted_at < old.created_at
    or new.deleted_at > clock_timestamp()
    or new.id is distinct from old.id or new.firm_id is distinct from old.firm_id
    or new.matter_id is distinct from old.matter_id or new.purpose is distinct from old.purpose
    or new.jurisdiction is distinct from old.jurisdiction or new.forum_id is distinct from old.forum_id
    or new.docket_number is distinct from old.docket_number or new.label is distinct from old.label
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'Matter jurisdiction history is immutable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function app.protect_matter_jurisdiction_history() from public,anon,authenticated;
create trigger protect_matter_jurisdiction_history before insert or update on public.matter_jurisdictions
  for each row execute function app.protect_matter_jurisdiction_history();

-- Forums and references are never deleted or truncated by any role while triggers run (only a
-- superuser's replication-role maintenance bypasses this).
create function app.refuse_jurisdiction_history_removal()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'Jurisdiction history is immutable' using errcode='42501';
end;
$$;
revoke all on function app.refuse_jurisdiction_history_removal() from public,anon,authenticated;
create trigger refuse_forum_delete before delete on public.forums
  for each row execute function app.refuse_jurisdiction_history_removal();
create trigger refuse_forum_truncate before truncate on public.forums
  for each statement execute function app.refuse_jurisdiction_history_removal();
create trigger refuse_matter_jurisdiction_delete before delete on public.matter_jurisdictions
  for each row execute function app.refuse_jurisdiction_history_removal();
create trigger refuse_matter_jurisdiction_truncate before truncate on public.matter_jurisdictions
  for each statement execute function app.refuse_jurisdiction_history_removal();
