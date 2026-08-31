-- C7 MANUAL APPLY RUNBOOK. Do not execute until the audit counts and Preview
-- smoke have been approved. It is intentionally outside supabase/migrations.
begin;
select pg_advisory_xact_lock(hashtext('opportunity_legacy_geography_backfill_c7'));
\ir opportunity_legacy_geography_backfill_plan.sql

-- Fail closed if the plan contains a geography outside Italy.
do $$
begin
  if exists (
    select 1
    from opportunity_geography_backfill_plan plan
    join public.geo_areas area on area.id = plan.geo_area_id
    where area.country_id <> plan.country_id
  ) then
    raise exception 'C7 opportunity backfill plan contains a country/area mismatch';
  end if;
end
$$;

-- Persist this result securely as the exact allowlist for the rollback file.
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

-- Return reviewable post-write counts before commit. Text, ownership and
-- applications are deliberately absent from the UPDATE allowlist.
select resolution, count(*) as updated_opportunities
from opportunity_geography_backfill_plan
group by resolution
order by resolution;

commit;
