-- PREVIEW-ONLY recovery for fase6-github (jbovlevodfouwuvtdlja).
-- Apply only after the read-contract audit. Never run on Production.
begin;
set local lock_timeout = '5s';

do $preflight$
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261211130000' and name = 'complete_profile_edit_schema') then
    raise exception 'PREVIEW GUARD: expected profile schema head 20261211130000 is absent';
  end if;
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20261211140000') then
    raise exception 'PREVIEW GUARD: migration 20261211140000 is already recorded';
  end if;
end
$preflight$;

-- Recreated views lose explicit grants; retain security-invoker/RLS semantics.
do $check_views$
declare view_name text;
begin
  foreach view_name in array array['players_view', 'athletes_view'] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = view_name and c.relkind = 'v'
        and coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true']
    ) then raise exception 'public.% must exist and remain security_invoker', view_name;
    end if;
  end loop;
end
$check_views$;

grant usage on schema public to anon, authenticated;
grant select on table public.players_view, public.athletes_view to anon, authenticated;
alter table public.regions enable row level security;
alter table public.provinces enable row level security;
alter table public.municipalities enable row level security;
drop policy if exists regions_reference_read on public.regions;
create policy regions_reference_read on public.regions for select to anon, authenticated using (true);
drop policy if exists provinces_reference_read on public.provinces;
create policy provinces_reference_read on public.provinces for select to anon, authenticated using (true);
drop policy if exists municipalities_reference_read on public.municipalities;
create policy municipalities_reference_read on public.municipalities for select to anon, authenticated using (true);
grant select on table public.regions, public.provinces, public.municipalities to anon, authenticated;

do $verify$
begin
  if not has_table_privilege('authenticated', 'public.players_view', 'select')
     or not has_table_privilege('authenticated', 'public.athletes_view', 'select')
     or not has_table_privilege('anon', 'public.players_view', 'select')
     or not has_table_privilege('anon', 'public.athletes_view', 'select')
     or not has_table_privilege('authenticated', 'public.regions', 'select')
     or not has_table_privilege('authenticated', 'public.provinces', 'select')
     or not has_table_privilege('authenticated', 'public.municipalities', 'select')
     or not has_table_privilege('anon', 'public.regions', 'select')
     or not has_table_privilege('anon', 'public.provinces', 'select')
     or not has_table_privilege('anon', 'public.municipalities', 'select') then
    raise exception 'EFFECT CHECK FAILED: API read grants incomplete';
  end if;

  if exists (
    select 1
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('regions', 'provinces', 'municipalities')
      and not c.relrowsecurity
  ) then
    raise exception 'EFFECT CHECK FAILED: geography RLS is not enabled';
  end if;
end
$verify$;

insert into supabase_migrations.schema_migrations(version, name, statements)
values ('20261211140000', 'restore_public_read_contracts',
  array['Manual Preview recovery: canonical SQL is supabase/migrations/20261211140000_restore_public_read_contracts.sql']);
notify pgrst, 'reload schema';
commit;

select json_build_object('projectRefExpected', 'jbovlevodfouwuvtdlja', 'version', version,
  'name', name, 'status', 'applied_and_effects_verified') as phase_6_preview_read_contract_result
from supabase_migrations.schema_migrations where version = '20261211140000';
