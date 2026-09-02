-- Read-only comparison of the 3C-A readiness and candidate-audit populations.
-- Both populations are evaluated in the same PostgreSQL snapshot.
with profile_evidence as (
  select
    p.id as profile_id,
    lower(coalesce(p.account_type, p.type, 'unknown')) as account_type,
    coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.full_name), '')) as display_name,
    coalesce(nullif(btrim(pp_country.iso2), ''), nullif(btrim(p.country), '')) as declared_country,
    p.interest_country,
    p.interest_region_id,
    p.interest_province_id,
    p.interest_municipality_id,
    p.updated_at as profile_updated_at,
    pp.updated_at as preferences_updated_at,
    pp.residence_geo_area_id,
    coalesce(
      municipality_mapping.geo_area_id,
      province_mapping.geo_area_id,
      region_mapping.geo_area_id
    ) as mapped_geo_area_id
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
), readiness_classified as (
  select
    *,
    case
      when residence_geo_area_id is not null then 'already_canonical'
      when upper(declared_country) in ('IT', 'ITALIA', 'ITALY')
        and mapped_geo_area_id is not null
        then 'automatically_mappable'
      when coalesce(interest_municipality_id, interest_province_id, interest_region_id) is not null
        and (declared_country is null or upper(declared_country) not in ('IT', 'ITALIA', 'ITALY'))
        then 'ambiguous'
      else 'not_automatically_mappable'
    end as mapping_status
  from profile_evidence
), readiness_population as (
  select profile_id
  from readiness_classified
  where mapping_status = 'automatically_mappable'
), audit_population as (
  select evidence.profile_id
  from profile_evidence evidence
  join public.geo_areas mapped_area on mapped_area.id = evidence.mapped_geo_area_id
  join public.countries canonical_country on canonical_country.id = mapped_area.country_id
  where evidence.residence_geo_area_id is null
    and upper(evidence.declared_country) in ('IT', 'ITALIA', 'ITALY')
    and evidence.mapped_geo_area_id is not null
), membership as (
  select
    evidence.*,
    readiness.profile_id is not null as in_readiness_population,
    audit.profile_id is not null as in_audit_population
  from profile_evidence evidence
  left join readiness_population readiness on readiness.profile_id = evidence.profile_id
  left join audit_population audit on audit.profile_id = evidence.profile_id
), totals as (
  select
    (select count(*) from readiness_population) as readiness_total,
    (select count(*) from audit_population) as audit_total,
    (select count(*) from membership where account_type = 'staff' and in_readiness_population) as readiness_staff_total,
    (select count(*) from membership where account_type = 'staff' and in_audit_population) as audit_staff_total
)
select
  'summary'::text as row_type,
  null::uuid as profile_id,
  null::text as account_type,
  null::text as display_name,
  null::text as declared_country,
  null::text as interest_country,
  null::text as interest_region_id,
  null::text as interest_province_id,
  null::text as interest_municipality_id,
  null::timestamptz as profile_updated_at,
  null::timestamptz as preferences_updated_at,
  null::boolean as in_readiness_population,
  null::boolean as in_audit_population,
  case
    when readiness_total = audit_total and readiness_staff_total = audit_staff_total
      then 'same_snapshot_populations_match'
    else 'same_snapshot_populations_differ'
  end as comparison_result,
  readiness_total,
  audit_total,
  readiness_staff_total,
  audit_staff_total
from totals

union all

select
  'profile_difference'::text,
  membership.profile_id,
  membership.account_type,
  membership.display_name,
  membership.declared_country,
  membership.interest_country,
  membership.interest_region_id::text,
  membership.interest_province_id::text,
  membership.interest_municipality_id::text,
  membership.profile_updated_at,
  membership.preferences_updated_at,
  membership.in_readiness_population,
  membership.in_audit_population,
  case
    when membership.in_readiness_population then 'readiness_only'
    else 'candidate_audit_only'
  end,
  totals.readiness_total,
  totals.audit_total,
  totals.readiness_staff_total,
  totals.audit_staff_total
from membership
cross join totals
where membership.in_readiness_population is distinct from membership.in_audit_population
order by row_type desc, account_type, display_name nulls last, profile_id;
