begin;

do $$
begin
  if not exists (select 1 from public.countries where iso2 = 'IT') then
    raise exception 'Canonical country IT is required before importing legacy Italian geography';
  end if;
end
$$;

insert into public.geo_areas (
  country_id, parent_id, code, code_authority, official_name, area_type, level,
  source_provider, source_record_id, source_license, metadata
)
select
  countries.id, null, null, null, regions.name, 'REGION', 1,
  'clubandplayer_italy_legacy', 'region:' || regions.id::text,
  'internal_legacy_catalog',
  jsonb_build_object('legacy_table', 'regions', 'legacy_id', regions.id::text)
from public.regions
cross join public.countries
where countries.iso2 = 'IT'
on conflict (source_provider, source_record_id) where source_provider is not null and source_record_id is not null
do update set
  country_id = excluded.country_id,
  parent_id = excluded.parent_id,
  code = excluded.code,
  code_authority = excluded.code_authority,
  official_name = excluded.official_name,
  area_type = excluded.area_type,
  level = excluded.level,
  source_license = excluded.source_license,
  metadata = excluded.metadata;

insert into public.geo_areas (
  country_id, parent_id, code, code_authority, official_name, area_type, level,
  source_provider, source_record_id, source_license, metadata
)
select
  countries.id,
  parent.id,
  nullif(btrim(provinces.sigla), ''),
  case when nullif(btrim(provinces.sigla), '') is null then null else 'IT_PROVINCE_ABBREVIATION' end,
  provinces.name,
  'PROVINCE',
  2,
  'clubandplayer_italy_legacy',
  'province:' || provinces.id::text,
  'internal_legacy_catalog',
  jsonb_strip_nulls(jsonb_build_object(
    'legacy_table', 'provinces',
    'legacy_id', provinces.id::text,
    'legacy_region_id', provinces.region_id::text,
    'province_abbreviation', nullif(btrim(provinces.sigla), '')
  ))
from public.provinces
cross join public.countries
join public.geo_areas parent
  on parent.source_provider = 'clubandplayer_italy_legacy'
 and parent.source_record_id = 'region:' || provinces.region_id::text
where countries.iso2 = 'IT'
on conflict (source_provider, source_record_id) where source_provider is not null and source_record_id is not null
do update set
  country_id = excluded.country_id,
  parent_id = excluded.parent_id,
  code = excluded.code,
  code_authority = excluded.code_authority,
  official_name = excluded.official_name,
  area_type = excluded.area_type,
  level = excluded.level,
  source_license = excluded.source_license,
  metadata = excluded.metadata;

insert into public.geo_areas (
  country_id, parent_id, code, code_authority, official_name, area_type, level,
  source_provider, source_record_id, source_license, metadata
)
select
  countries.id,
  parent.id,
  null,
  null,
  municipalities.name,
  'MUNICIPALITY',
  3,
  'clubandplayer_italy_legacy',
  'municipality:' || municipalities.id::text,
  'internal_legacy_catalog',
  jsonb_build_object(
    'legacy_table', 'municipalities',
    'legacy_id', municipalities.id::text,
    'legacy_province_id', municipalities.province_id::text,
    'legacy_region_id', municipalities.region_id::text
  )
from public.municipalities
cross join public.countries
join public.geo_areas parent
  on parent.source_provider = 'clubandplayer_italy_legacy'
 and parent.source_record_id = 'province:' || municipalities.province_id::text
where countries.iso2 = 'IT'
on conflict (source_provider, source_record_id) where source_provider is not null and source_record_id is not null
do update set
  country_id = excluded.country_id,
  parent_id = excluded.parent_id,
  code = excluded.code,
  code_authority = excluded.code_authority,
  official_name = excluded.official_name,
  area_type = excluded.area_type,
  level = excluded.level,
  source_license = excluded.source_license,
  metadata = excluded.metadata;

insert into public.legacy_geo_area_mappings (
  source_system, source_entity_type, legacy_id, legacy_value, geo_area_id
)
select
  'italy_legacy', source.source_entity_type, source.legacy_id, source.legacy_value, areas.id
from (
  select 'region'::text as source_entity_type, id::text as legacy_id, name as legacy_value
  from public.regions
  union all
  select 'province', id::text, name from public.provinces
  union all
  select 'municipality', id::text, name from public.municipalities
) source
join public.geo_areas areas
  on areas.source_provider = 'clubandplayer_italy_legacy'
 and areas.source_record_id = source.source_entity_type || ':' || source.legacy_id
on conflict (source_system, source_entity_type, legacy_id)
do update set legacy_value = excluded.legacy_value, geo_area_id = excluded.geo_area_id;

do $$
begin
  if exists (
    select 1
    from (
      select 'region'::text entity_type, id::text legacy_id from public.regions
      union all select 'province', id::text from public.provinces
      union all select 'municipality', id::text from public.municipalities
    ) legacy
    left join public.legacy_geo_area_mappings mappings
      on mappings.source_system = 'italy_legacy'
     and mappings.source_entity_type = legacy.entity_type
     and mappings.legacy_id = legacy.legacy_id
    where mappings.id is null
  ) then
    raise exception 'Incomplete italy_legacy canonical geography mapping';
  end if;

  if exists (
    select 1
    from public.legacy_geo_area_mappings mappings
    join public.geo_areas areas on areas.id = mappings.geo_area_id
    join public.countries countries on countries.id = areas.country_id
    where mappings.source_system = 'italy_legacy'
      and countries.iso2 <> 'IT'
  ) then
    raise exception 'italy_legacy mapping points outside canonical country IT';
  end if;

  if exists (
    select 1 from public.provinces legacy
    join public.geo_areas child
      on child.source_provider = 'clubandplayer_italy_legacy'
     and child.source_record_id = 'province:' || legacy.id::text
    join public.geo_areas parent on parent.id = child.parent_id
    where parent.source_record_id <> 'region:' || legacy.region_id::text
       or child.country_id <> parent.country_id
  ) or exists (
    select 1 from public.municipalities legacy
    join public.geo_areas child
      on child.source_provider = 'clubandplayer_italy_legacy'
     and child.source_record_id = 'municipality:' || legacy.id::text
    join public.geo_areas parent on parent.id = child.parent_id
    where parent.source_record_id <> 'province:' || legacy.province_id::text
       or child.country_id <> parent.country_id
  ) then
    raise exception 'Invalid italy_legacy canonical geography hierarchy';
  end if;
end
$$;

commit;
