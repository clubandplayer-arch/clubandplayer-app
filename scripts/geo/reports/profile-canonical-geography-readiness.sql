-- Read-only Phase 3C-A readiness report. Run manually after the migration exists.
with profile_geo_evidence as (
  select
    p.id as profile_id,
    lower(coalesce(p.account_type, p.type, 'unknown')) as account_type,
    coalesce(nullif(btrim(pp_country.iso2), ''), nullif(btrim(p.country), '')) as declared_country,
    nullif(btrim(p.interest_country), '') as interest_country,
    pp.residence_geo_area_id,
    case
      when p.interest_municipality_id is not null then 'municipality'
      when p.interest_province_id is not null then 'province'
      when p.interest_region_id is not null then 'region'
      else null
    end as most_specific_legacy_level,
    coalesce(
      municipality_mapping.geo_area_id,
      province_mapping.geo_area_id,
      region_mapping.geo_area_id
    ) as mapped_geo_area_id,
    coalesce(p.region, p.province, p.city, p.interest_country, p.interest_region, p.interest_province, p.interest_city) is not null as has_legacy_text
  from public.profiles p
  left join public.profile_preferences pp on pp.profile_id = p.id
  left join public.countries pp_country on pp_country.id = pp.residence_country_id
  left join public.legacy_geo_area_mappings municipality_mapping
    on municipality_mapping.source_system = 'italy_legacy'
   and municipality_mapping.source_entity_type = 'municipality'
   and municipality_mapping.legacy_id = p.interest_municipality_id::text
  left join public.legacy_geo_area_mappings province_mapping
    on province_mapping.source_system = 'italy_legacy'
   and province_mapping.source_entity_type = 'province'
   and province_mapping.legacy_id = p.interest_province_id::text
  left join public.legacy_geo_area_mappings region_mapping
    on region_mapping.source_system = 'italy_legacy'
   and region_mapping.source_entity_type = 'region'
   and region_mapping.legacy_id = p.interest_region_id::text
), classified as (
  select
    *,
    case
      when residence_geo_area_id is not null then 'already_canonical'
      when upper(declared_country) in ('IT', 'ITALIA', 'ITALY')
        and mapped_geo_area_id is not null
        then 'automatically_mappable'
      when most_specific_legacy_level is not null
        and (declared_country is null or upper(declared_country) not in ('IT', 'ITALIA', 'ITALY'))
        then 'ambiguous'
      when declared_country is not null or has_legacy_text or most_specific_legacy_level is not null
        then 'not_mappable'
      else 'no_geography'
    end as mapping_status
  from profile_geo_evidence
)
select
  account_type,
  coalesce(declared_country, 'unknown') as country,
  mapping_status,
  count(*) as profile_count,
  count(*) filter (where mapped_geo_area_id is not null) as mapped_profile_count,
  count(*) filter (where most_specific_legacy_level = 'municipality') as municipality_id_profile_count,
  count(*) filter (where most_specific_legacy_level = 'province') as province_id_profile_count,
  count(*) filter (where most_specific_legacy_level = 'region') as region_id_profile_count,
  array_remove(array_agg(distinct interest_country), null) as observed_interest_countries
from classified
group by account_type, coalesce(declared_country, 'unknown'), mapping_status
order by account_type, country, mapping_status;
