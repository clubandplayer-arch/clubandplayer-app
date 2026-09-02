-- C7 READ-ONLY AUDIT. Safe to run before the apply runbook: the only object
-- created is a transaction-scoped temporary plan table.
begin;
\ir opportunity_legacy_geography_backfill_plan.sql

select resolution, count(*) as opportunities
from opportunity_geography_backfill_plan
group by resolution
order by resolution;

select opportunity_id, resolution, candidate_count,
       legacy_country, legacy_region, legacy_province, legacy_city
from opportunity_geography_backfill_plan
where resolution in ('ambiguous_country_only', 'unresolved_country_only')
order by resolution, opportunity_id;

rollback;
