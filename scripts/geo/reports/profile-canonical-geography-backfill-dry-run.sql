-- Read-only Phase 3C-A candidate audit. Every returned row requires human review.
with recursive profile_evidence as (
  select
    p.id as profile_id,
    lower(coalesce(p.account_type, p.type, 'unknown')) as account_type,
    coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.full_name), '')) as display_name,
    coalesce(nullif(btrim(pp_country.iso2), ''), nullif(btrim(p.country), '')) as declared_country,
    p.country as legacy_country,
    p.region as legacy_region,
    p.province as legacy_province,
    p.city as legacy_city,
    p.interest_country,
    p.interest_region,
    p.interest_province,
    p.interest_city,
    p.interest_region_id,
    p.interest_province_id,
    p.interest_municipality_id,
    pp.residence_geo_area_id,
    municipality_mapping.geo_area_id as municipality_geo_area_id,
    province_mapping.geo_area_id as province_geo_area_id,
    region_mapping.geo_area_id as region_geo_area_id
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
), candidates as (
  select
    *,
    case
      when municipality_geo_area_id is not null then 'municipality'
      when province_geo_area_id is not null then 'province'
      when region_geo_area_id is not null then 'region'
      else null
    end as legacy_level_used,
    coalesce(municipality_geo_area_id, province_geo_area_id, region_geo_area_id) as mapped_geo_area_id,
    case
      when municipality_geo_area_id is not null then 'safe_municipality_candidate'
      when province_geo_area_id is not null then 'province_only_candidate'
      when region_geo_area_id is not null then 'region_only_candidate'
      else null
    end as candidate_classification
  from profile_evidence
  where residence_geo_area_id is null
    and upper(declared_country) in ('IT', 'ITALIA', 'ITALY')
    and coalesce(municipality_geo_area_id, province_geo_area_id, region_geo_area_id) is not null
), ancestor_walk as (
  select
    candidates.profile_id,
    areas.id as area_id,
    areas.parent_id,
    areas.area_type,
    areas.official_name,
    areas.level,
    0 as depth,
    array[areas.id] as visited
  from candidates
  join public.geo_areas areas on areas.id = candidates.mapped_geo_area_id

  union all

  select
    walk.profile_id,
    parent.id,
    parent.parent_id,
    parent.area_type,
    parent.official_name,
    parent.level,
    walk.depth + 1,
    walk.visited || parent.id
  from ancestor_walk walk
  join public.geo_areas parent on parent.id = walk.parent_id
  where walk.depth < 8
    and not parent.id = any(walk.visited)
), candidate_details as (
  select
    candidates.*,
    mapped_area.area_type as canonical_area_type,
    mapped_area.official_name as canonical_official_name,
    canonical_country.iso2 as canonical_country,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ancestors.area_id,
          'area_type', ancestors.area_type,
          'official_name', ancestors.official_name,
          'level', ancestors.level
        ) order by ancestors.depth
      )
      from ancestor_walk ancestors
      where ancestors.profile_id = candidates.profile_id
        and ancestors.depth > 0
    ), '[]'::jsonb) as canonical_ancestors,
    'automatically_mappable_review_required'::text as proposed_classification
  from candidates
  join public.geo_areas mapped_area on mapped_area.id = candidates.mapped_geo_area_id
  join public.countries canonical_country on canonical_country.id = mapped_area.country_id
), report_rows as (
  select
    'candidate'::text as row_type,
    profile_id,
    account_type,
    display_name,
    legacy_country,
    legacy_region,
    legacy_province,
    legacy_city,
    interest_country,
    interest_region,
    interest_province,
    interest_city,
    interest_region_id::text,
    interest_province_id::text,
    interest_municipality_id::text,
    legacy_level_used,
    mapped_geo_area_id,
    canonical_area_type,
    canonical_official_name,
    canonical_country,
    canonical_ancestors,
    candidate_classification,
    proposed_classification,
    count(*) over (partition by account_type, candidate_classification, canonical_area_type) as aggregate_profile_count
  from candidate_details

  union all

  select
    'summary'::text,
    null::uuid,
    account_type,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::uuid,
    canonical_area_type,
    null::text,
    null::text,
    '[]'::jsonb,
    candidate_classification,
    'aggregate_only'::text,
    count(*)
  from candidate_details
  group by account_type, candidate_classification, canonical_area_type
)
select *
from report_rows
order by
  case row_type when 'candidate' then 1 else 2 end,
  account_type,
  candidate_classification,
  canonical_area_type,
  display_name nulls last,
  profile_id;
