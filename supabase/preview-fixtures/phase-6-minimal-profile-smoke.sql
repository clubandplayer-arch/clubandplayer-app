-- PREVIEW-ONLY, MANUAL FIXTURE. Never add this file to supabase/migrations.
-- Apply only from the SQL editor of fase6-github (jbovlevodfouwuvtdlja).
-- Contains no users, credentials, real clubs, tax identifiers, or Production data.
begin;

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
