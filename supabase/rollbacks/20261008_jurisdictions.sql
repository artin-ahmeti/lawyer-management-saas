-- An unused additive upgrade can be reversed. Never discard forum or reference history.
-- Run it in a maintenance window: dropping the tables removes foreign keys to firms, profiles
-- and matters, so it holds every firm read for up to the lock timeout and then gives up rather
-- than queueing. A timeout or deadlock abort leaves nothing changed. Afterwards, mark
-- 20261008195221/22 as reverted in the migration history (supabase migration repair) so a
-- later push reapplies them.
do $$ begin
  if exists(select 1 from public.forums) or exists(select 1 from public.matter_jurisdictions) then
    raise exception 'Rollback refused: forum or jurisdiction history exists; use a reviewed forward correction';
  end if;
end; $$;
begin;
set local lock_timeout='3s';
set local statement_timeout='10s';
-- An RLS-filtered read must fail, never pass the history check by seeing no rows.
set local row_security=off;
-- Take every lock the drops need before the audit lock, in the order API commands use
-- (firm and profile, then matter, then the slice's tables), so no command waits in a cycle.
lock table public.firms, public.profiles, public.matters in access exclusive mode;
lock table public.forums, public.matter_jurisdictions in access exclusive mode;
lock table public.command_receipts, public.audit_logs in share mode;
do $$ begin
  if exists(select 1 from public.forums) or exists(select 1 from public.matter_jurisdictions)
    or exists(select 1 from public.command_receipts where command in
      ('forum.create.v1','forum.update.v1','matter.jurisdiction.add.v1','matter.jurisdiction.end.v1'))
    or exists(select 1 from public.audit_logs where action in
      ('forum.create.v1','forum.update.v1','matter.jurisdiction.add.v1','matter.jurisdiction.end.v1')) then
    raise exception 'Rollback refused: forum or jurisdiction history exists; use a reviewed forward correction';
  end if;
end; $$;
drop table if exists public.matter_jurisdictions;
drop table if exists public.forums;
drop function if exists app.protect_forum_provenance();
drop function if exists app.protect_matter_jurisdiction_history();
drop function if exists app.refuse_jurisdiction_history_removal();
commit;
