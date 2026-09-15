-- PREVIEW-ONLY, MANUAL FIXTURE. Never add this file to supabase/migrations.
-- Apply only from the SQL editor of fase6-github (jbovlevodfouwuvtdlja).
-- Contains no users, credentials, real clubs, tax identifiers, or Production data.
begin;

do $preview_guard$
begin
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20261211140000' and name = 'restore_public_read_contracts'
  ) then
    raise exception 'PREVIEW GUARD: expected read-contract migration 20261211140000 is absent';
  end if;
end
$preview_guard$;

do $$
declare
  preview_region_id bigint;
  preview_province_id bigint;
begin
  select id into preview_region_id
  from public.regions
  where name = 'Preview Test Region'
  order by id
  limit 1;

  if preview_region_id is null then
    insert into public.regions (name)
    values ('Preview Test Region')
    returning id into preview_region_id;
  end if;

  select id into preview_province_id
  from public.provinces
  where region_id = preview_region_id and name = 'Preview Test Province'
  order by id
  limit 1;

  if preview_province_id is null then
    insert into public.provinces (region_id, name, code, sigla)
    values (preview_region_id, 'Preview Test Province', 'PTP', 'PT')
    returning id into preview_province_id;
  end if;

  if not exists (
    select 1 from public.municipalities
    where province_id = preview_province_id and name = 'Preview Test City'
  ) then
    insert into public.municipalities (province_id, region_id, name)
    values (preview_province_id, preview_region_id, 'Preview Test City');
  end if;
end
$$;

-- Synthetic public profiles exercise search and suggestions without Auth users
-- or Production data. The publication trigger derives visibility consistently.
insert into public.profiles
  (id, user_id, account_type, type, full_name, display_name, status, birth_year,
   country, interest_country, region, province, city, sport, role)
values
  ('60000000-0000-4000-8000-000000000001', null, 'athlete', 'athlete',
   'Preview Test Player', 'Preview Test Player', 'active', 2000,
   'Italia', 'IT', 'Preview Test Region', 'Preview Test Province', 'Preview Test City',
   'Calcio a 7', 'Portiere'),
  ('60000000-0000-4000-8000-000000000002', null, 'club', 'club',
   'ASD Preview C7 Test Club', 'ASD Preview C7 Test Club', 'active', null,
   'Italia', 'IT', 'Preview Test Region', 'Preview Test Province', 'Preview Test City',
   'Calcio a 7', null)
on conflict (id) do update set
  full_name = excluded.full_name,
  display_name = excluded.display_name,
  status = excluded.status,
  country = excluded.country,
  interest_country = excluded.interest_country,
  region = excluded.region,
  province = excluded.province,
  city = excluded.city,
  sport = excluded.sport,
  role = excluded.role,
  updated_at = now();

insert into public.registry_clubs_master
  (master_id, denominazione, regione, provincia, comune, sport_normalizzati, organisms, source_count, is_claimed)
values
  ('preview-phase6-c7-club-001', 'Preview C7 Test Club', 'Preview Test Region', 'Preview Test Province', 'Preview Test City', 'Calcio a 7', 'TEST_ONLY', 1, false),
  ('preview-phase6-c8-club-001', 'Preview C8 Test Club', 'Preview Test Region', 'Preview Test Province', 'Preview Test City', 'Calcio a 8', 'TEST_ONLY', 1, false)
on conflict (master_id) do update set
  denominazione = excluded.denominazione,
  regione = excluded.regione,
  provincia = excluded.provincia,
  comune = excluded.comune,
  sport_normalizzati = excluded.sport_normalizzati,
  organisms = excluded.organisms,
  source_count = excluded.source_count,
  is_claimed = false,
  claimed_profile_id = null,
  updated_at = now();

commit;

select json_build_object(
  'projectRefExpected', 'jbovlevodfouwuvtdlja',
  'status', 'fixture_applied_and_verified',
  'regions', (select count(*) from public.regions where name = 'Preview Test Region'),
  'provinces', (select count(*) from public.provinces where name = 'Preview Test Province'),
  'municipalities', (select count(*) from public.municipalities where name = 'Preview Test City'),
  'profiles', (
    select count(*) from public.profiles
    where id in ('60000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002')
      and user_id is null
  ),
  'registryClubs', (
    select count(*) from public.registry_clubs_master
    where master_id in ('preview-phase6-c7-club-001', 'preview-phase6-c8-club-001')
  )
) as phase_6_preview_fixture_result;
