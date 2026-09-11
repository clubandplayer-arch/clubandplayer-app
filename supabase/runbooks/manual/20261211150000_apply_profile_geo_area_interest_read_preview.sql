-- PREVIEW-ONLY recovery for fase6-github (jbovlevodfouwuvtdlja).
-- Restores one missing grant; never run on Production.
begin;
set local lock_timeout = '5s';

do $guard$
begin
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20261211140000' and name = 'restore_public_read_contracts'
  ) then
    raise exception 'PREVIEW GUARD: expected head 20261211140000 is absent';
  end if;
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20261211150000') then
    raise exception 'PREVIEW GUARD: migration 20261211150000 is already recorded';
  end if;
  if to_regclass('public.profile_geo_area_interests') is null then
    raise exception 'required table public.profile_geo_area_interests is missing';
  end if;
  if not exists (
    select 1 from pg_class c
    where c.oid = 'public.profile_geo_area_interests'::regclass and c.relrowsecurity
  ) then
    raise exception 'profile_geo_area_interests must keep RLS enabled';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_geo_area_interests'
      and policyname = 'profile_geo_area_interests_select_own_or_admin'
      and cmd = 'SELECT'
      and 'authenticated' = any(roles)
  ) then
    raise exception 'owner-scoped SELECT policy is missing';
  end if;
end
$guard$;

grant select on table public.profile_geo_area_interests to authenticated;

do $verify$
begin
  if not has_table_privilege('authenticated', 'public.profile_geo_area_interests', 'select') then
    raise exception 'EFFECT CHECK FAILED: authenticated SELECT is absent';
  end if;
end
$verify$;

insert into supabase_migrations.schema_migrations(version, name, statements)
values ('20261211150000', 'restore_profile_geo_area_interest_read',
  array['Manual Preview recovery: canonical SQL is supabase/migrations/20261211150000_restore_profile_geo_area_interest_read.sql']);
notify pgrst, 'reload schema';
commit;

select json_build_object(
  'projectRefExpected', 'jbovlevodfouwuvtdlja',
  'version', version,
  'name', name,
  'status', 'applied_and_effects_verified'
) as phase_6_preview_profile_geo_interest_read_result
from supabase_migrations.schema_migrations
where version = '20261211150000';
