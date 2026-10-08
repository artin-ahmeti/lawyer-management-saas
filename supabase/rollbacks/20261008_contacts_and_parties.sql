-- An unused additive upgrade can be reversed. Never discard contact or party history.
begin;
-- Hold writers off until the tables are gone, so nothing commits between check and drop.
lock table public.contacts, public.matter_parties in access exclusive mode;
lock table public.command_receipts, public.audit_logs in share mode;
do $$ begin
  if exists(select 1 from public.contacts) or exists(select 1 from public.matter_parties)
    or exists(select 1 from public.command_receipts where command in
      ('contact.create.v1','contact.update.v1','matter.party.add.v1','matter.party.end.v1'))
    or exists(select 1 from public.audit_logs where action in
      ('contact.create.v1','contact.update.v1','matter.party.add.v1','matter.party.end.v1')) then
    raise exception 'Rollback refused: contact or party history exists; use a reviewed forward correction';
  end if;
end; $$;
drop table public.matter_parties;
drop table public.contacts;
drop function app.protect_contact_provenance();
drop function app.protect_matter_party_history();
commit;
