-- C7 Production apply candidate. PREPARED BUT NOT AUTHORIZED FOR EXECUTION.
-- Run with psql from this directory so the shared plan include resolves.
begin;
select pg_advisory_xact_lock(hashtext('opportunity_legacy_geography_backfill_c7'));
\ir opportunity_legacy_geography_backfill_plan.sql

do $$
declare
  municipality_count bigint;
  province_count bigint;
  region_count bigint;
  ambiguous_count bigint;
  unresolved_count bigint;
begin
  select
    count(*) filter (where resolution = 'municipality'),
    count(*) filter (where resolution = 'province'),
    count(*) filter (where resolution = 'region'),
    count(*) filter (where resolution = 'ambiguous_country_only'),
    count(*) filter (where resolution = 'unresolved_country_only')
  into municipality_count, province_count, region_count, ambiguous_count, unresolved_count
  from opportunity_geography_backfill_plan;

  if municipality_count <> 31
     or province_count <> 0
     or region_count <> 0
     or ambiguous_count <> 0
     or unresolved_count <> 0 then
    raise exception 'C7 approved-count gate failed: municipality=%, province=%, region=%, ambiguous=%, unresolved=%',
      municipality_count, province_count, region_count, ambiguous_count, unresolved_count;
  end if;

  if exists (
    select 1
    from opportunity_geography_backfill_plan plan
    left join public.geo_areas area on area.id = plan.geo_area_id
    where plan.resolution <> 'municipality'
       or plan.geo_area_id is null
       or area.id is null
       or area.country_id <> plan.country_id
       or area.area_type <> 'MUNICIPALITY'
       or area.is_active is not true
  ) then
    raise exception 'C7 approved plan contains a non-active or incoherent Municipality';
  end if;
end
$$;

-- Save this result securely before commit; it is the rollback allowlist.
select opportunity_id, resolution, country_id, geo_area_id
from opportunity_geography_backfill_plan
order by opportunity_id;

update public.opportunities opportunity
set country_id = plan.country_id,
    geo_area_id = plan.geo_area_id
from opportunity_geography_backfill_plan plan
where opportunity.id = plan.opportunity_id
  and opportunity.country_id is null
  and opportunity.geo_area_id is null;

do $$
begin
  if (select count(*) from opportunity_geography_backfill_plan) <> 31 then
    raise exception 'C7 post-update plan cardinality changed';
  end if;
  if exists (
    select 1
    from opportunity_geography_backfill_plan plan
    join public.opportunities opportunity on opportunity.id = plan.opportunity_id
    where opportunity.country_id is distinct from plan.country_id
       or opportunity.geo_area_id is distinct from plan.geo_area_id
  ) then
    raise exception 'C7 post-update canonical verification failed';
  end if;
end
$$;

select 'municipality'::text as resolution, count(*) as updated_opportunities
from opportunity_geography_backfill_plan;
commit;
