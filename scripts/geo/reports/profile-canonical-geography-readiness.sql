-- Read-only Phase 3C-A readiness report. Run manually after the migration exists.
with legacy_candidates as (
  select
    p.id as profile_id,
    lower(coalesce(p.account_type, p.type, 'unknown')) as account_type,
    coalesce(nullif(btrim(pp_country.iso2), ''), nullif(btrim(p.country), ''), nullif(btrim(p.interest_country), ''), 'unknown') as country,
    pp.residence_geo_area_id,
    coalesce(
      municipality_mapping.geo_area_id,
      province_mapping.geo_area_id,
      region_mapping.geo_area_id
    ) as mapped_geo_area_id,
    case
      when pp.residence_geo_area_id is not null then 'already_canonical'
      when coalesce(p.interest_country, p.country) is not null
        and upper(coalesce(p.interest_country, p.country)) not in ('IT', 'ITALIA', 'ITALY')
        and coalesce(p.interest_municipality_id, p.interest_province_id, p.interest_region_id) is not null
        then 'ambiguous'
      when coalesce(municipality_mapping.geo_area_id, province_mapping.geo_area_id, region_mapping.geo_area_id) is not null
        then 'automatically_mappable'
      when coalesce(p.country, p.region, p.province, p.city, p.interest_country, p.interest_region, p.interest_province, p.interest_city) is not null
        then 'not_mappable'
      else 'no_geography'
    end as mapping_status
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
)
select account_type, country, mapping_status, count(*) as profile_count
from legacy_candidates
group by account_type, country, mapping_status
order by account_type, country, mapping_status;
