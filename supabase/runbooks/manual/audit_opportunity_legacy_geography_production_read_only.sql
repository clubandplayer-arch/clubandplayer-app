with italy as (
  select id
  from public.countries
  where iso2 = 'IT' and is_supported = true and is_active = true
), eligible as (
  select o.id, o.region, o.province, o.city
  from public.opportunities o
  where o.country_id is null
    and o.geo_area_id is null
    and lower(btrim(coalesce(o.country, ''))) in ('it', 'italia', 'italy')
    and exists (select 1 from italy)
), municipality_candidates as (
  select e.id as opportunity_id, 3 as specificity
  from eligible e
  join public.municipalities municipality
    on lower(btrim(municipality.name)) = lower(btrim(e.city))
  join public.provinces province on province.id = municipality.province_id
  join public.regions region on region.id = municipality.region_id
  join public.legacy_geo_area_mappings mapping
    on mapping.source_system = 'italy_legacy'
   and mapping.source_entity_type = 'municipality'
   and mapping.legacy_id = municipality.id::text
  join public.geo_areas area on area.id = mapping.geo_area_id
  join italy on italy.id = area.country_id
  where nullif(btrim(e.city), '') is not null
    and (nullif(btrim(e.province), '') is null
      or lower(btrim(e.province)) in (lower(btrim(province.name)), lower(btrim(province.sigla))))
    and (nullif(btrim(e.region), '') is null
      or lower(btrim(e.region)) = lower(btrim(region.name)))
), province_candidates as (
  select e.id as opportunity_id, 2 as specificity
  from eligible e
  join public.provinces province
    on lower(btrim(e.province)) in (lower(btrim(province.name)), lower(btrim(province.sigla)))
  join public.regions region on region.id = province.region_id
  join public.legacy_geo_area_mappings mapping
    on mapping.source_system = 'italy_legacy'
   and mapping.source_entity_type = 'province'
   and mapping.legacy_id = province.id::text
  join public.geo_areas area on area.id = mapping.geo_area_id
  join italy on italy.id = area.country_id
  where nullif(btrim(e.city), '') is null
    and nullif(btrim(e.province), '') is not null
    and (nullif(btrim(e.region), '') is null
      or lower(btrim(e.region)) = lower(btrim(region.name)))
), region_candidates as (
  select e.id as opportunity_id, 1 as specificity
  from eligible e
  join public.regions region on lower(btrim(region.name)) = lower(btrim(e.region))
  join public.legacy_geo_area_mappings mapping
    on mapping.source_system = 'italy_legacy'
   and mapping.source_entity_type = 'region'
   and mapping.legacy_id = region.id::text
  join public.geo_areas area on area.id = mapping.geo_area_id
  join italy on italy.id = area.country_id
  where nullif(btrim(e.city), '') is null
    and nullif(btrim(e.province), '') is null
    and nullif(btrim(e.region), '') is not null
), candidates as (
  select * from municipality_candidates
  union all select * from province_candidates
  union all select * from region_candidates
), candidate_summary as (
  select opportunity_id, count(*) as candidate_count, max(specificity) as specificity
  from candidates
  group by opportunity_id
), classified as (
  select
    eligible.id as opportunity_id,
    case
      when summary.candidate_count = 1 and summary.specificity = 3 then 'municipality'
      when summary.candidate_count = 1 and summary.specificity = 2 then 'province'
      when summary.candidate_count = 1 and summary.specificity = 1 then 'region'
      when coalesce(summary.candidate_count, 0) > 1 then 'ambiguous_country_only'
      else 'unresolved_country_only'
    end as resolution
  from eligible
  left join candidate_summary summary on summary.opportunity_id = eligible.id
), categories(resolution, ordering) as (
  values
    ('municipality', 1),
    ('province', 2),
    ('region', 3),
    ('ambiguous_country_only', 4),
    ('unresolved_country_only', 5)
)
select categories.resolution, count(classified.opportunity_id) as opportunities
from categories
left join classified on classified.resolution = categories.resolution
group by categories.resolution, categories.ordering
order by categories.ordering;
