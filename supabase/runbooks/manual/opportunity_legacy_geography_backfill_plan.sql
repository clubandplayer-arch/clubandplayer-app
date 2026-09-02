-- Internal shared plan for the C7 audit/apply runbooks. This creates only a
-- session-local temporary table; it never mutates application data.
drop table if exists pg_temp.opportunity_geography_backfill_plan;
create temporary table opportunity_geography_backfill_plan on commit drop as
with italy as (
  select id
  from public.countries
  where iso2 = 'IT' and is_supported = true and is_active = true
), eligible as (
  select o.id, o.country, o.region, o.province, o.city, italy.id as country_id
  from public.opportunities o
  cross join italy
  where o.country_id is null
    and o.geo_area_id is null
    and lower(btrim(coalesce(o.country, ''))) in ('it', 'italia', 'italy')
), municipality_candidates as (
  select e.id as opportunity_id, m.geo_area_id, 3 as specificity
  from eligible e
  join public.municipalities municipality
    on lower(btrim(municipality.name)) = lower(btrim(e.city))
  join public.provinces province on province.id = municipality.province_id
  join public.regions region on region.id = municipality.region_id
  join public.legacy_geo_area_mappings m
    on m.source_system = 'italy_legacy'
   and m.source_entity_type = 'municipality'
   and m.legacy_id = municipality.id::text
  where nullif(btrim(e.city), '') is not null
    and (nullif(btrim(e.province), '') is null
      or lower(btrim(e.province)) in (lower(btrim(province.name)), lower(btrim(province.sigla))))
    and (nullif(btrim(e.region), '') is null
      or lower(btrim(e.region)) = lower(btrim(region.name)))
), province_candidates as (
  select e.id as opportunity_id, m.geo_area_id, 2 as specificity
  from eligible e
  join public.provinces province
    on lower(btrim(e.province)) in (lower(btrim(province.name)), lower(btrim(province.sigla)))
  join public.regions region on region.id = province.region_id
  join public.legacy_geo_area_mappings m
    on m.source_system = 'italy_legacy'
   and m.source_entity_type = 'province'
   and m.legacy_id = province.id::text
  where nullif(btrim(e.city), '') is null
    and nullif(btrim(e.province), '') is not null
    and (nullif(btrim(e.region), '') is null
      or lower(btrim(e.region)) = lower(btrim(region.name)))
), region_candidates as (
  select e.id as opportunity_id, m.geo_area_id, 1 as specificity
  from eligible e
  join public.regions region on lower(btrim(region.name)) = lower(btrim(e.region))
  join public.legacy_geo_area_mappings m
    on m.source_system = 'italy_legacy'
   and m.source_entity_type = 'region'
   and m.legacy_id = region.id::text
  where nullif(btrim(e.city), '') is null
    and nullif(btrim(e.province), '') is null
    and nullif(btrim(e.region), '') is not null
), candidates as (
  select * from municipality_candidates
  union all select * from province_candidates
  union all select * from region_candidates
), resolved as (
  select opportunity_id, (array_agg(geo_area_id))[1] as geo_area_id, max(specificity) as specificity
  from candidates
  group by opportunity_id
  having count(*) = 1
), candidate_counts as (
  select opportunity_id, count(*) as candidate_count
  from candidates
  group by opportunity_id
)
select
  e.id as opportunity_id,
  e.country_id,
  r.geo_area_id,
  coalesce(cc.candidate_count, 0)::integer as candidate_count,
  case
    when r.specificity = 3 then 'municipality'
    when r.specificity = 2 then 'province'
    when r.specificity = 1 then 'region'
    when coalesce(cc.candidate_count, 0) > 1 then 'ambiguous_country_only'
    else 'unresolved_country_only'
  end as resolution,
  e.country as legacy_country,
  e.region as legacy_region,
  e.province as legacy_province,
  e.city as legacy_city
from eligible e
left join resolved r on r.opportunity_id = e.id
left join candidate_counts cc on cc.opportunity_id = e.id;
