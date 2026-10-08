-- M02-S02 (D021): firm contact directory and matter-party links. The API writes; clients read.
alter table public.contacts enable row level security;
alter table public.contacts force row level security;
alter table public.matter_parties enable row level security;
alter table public.matter_parties force row level security;
revoke all on public.contacts, public.matter_parties from public, anon, authenticated, service_role;
grant select on public.contacts, public.matter_parties to authenticated;
grant select, insert, update on public.contacts, public.matter_parties to service_role;

-- Live staff of the selected firm read its directory. A party link reveals that a contact
-- belongs to a matter, so it is readable only with a current grant on that matter.
create policy "live staff read firm contacts" on public.contacts for select to authenticated
  using (firm_id=(select app.current_firm_id()) and deleted_at is null
    and (select app.is_active_firm_member(app.current_firm_id())));
create policy "granted staff read matter parties" on public.matter_parties for select to authenticated
  using (app.has_matter_access(firm_id,matter_id));
create trigger set_updated_at before update on public.contacts
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.matter_parties
  for each row execute function app.set_updated_at();

-- An update cannot relocate a contact, change its kind or rewrite who created it.
create function app.protect_contact_provenance()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.id is distinct from old.id or new.firm_id is distinct from old.firm_id
    or new.kind is distinct from old.kind
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'Contact provenance is immutable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function app.protect_contact_provenance() from public,anon,authenticated;
create trigger protect_contact_provenance before update on public.contacts
  for each row execute function app.protect_contact_provenance();

-- A link is history: it starts current and may only be ended, once, after it began.
create function app.protect_matter_party_history()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then
    if new.deleted_at is not null then
      raise exception 'A matter party link starts current' using errcode='42501';
    end if;
    return new;
  end if;
  if old.deleted_at is not null or new.deleted_at is null or new.deleted_at < old.created_at
    or new.id is distinct from old.id or new.firm_id is distinct from old.firm_id
    or new.matter_id is distinct from old.matter_id or new.contact_id is distinct from old.contact_id
    or new.role is distinct from old.role or new.label is distinct from old.label
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'Matter party history is immutable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function app.protect_matter_party_history() from public,anon,authenticated;
create trigger protect_matter_party_history before insert or update on public.matter_parties
  for each row execute function app.protect_matter_party_history();
