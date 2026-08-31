-- Manual rollback template for the C7 backfill. Populate the VALUES list only
-- from the approved audit/apply evidence. It deliberately cannot clear every
-- canonical Opportunity indiscriminately.
begin;
create temporary table c7_opportunity_backfill_rollback_ids (id uuid primary key) on commit drop;
insert into c7_opportunity_backfill_rollback_ids (id)
select id from (values
  -- ('00000000-0000-0000-0000-000000000000'::uuid)
  (null::uuid)
) approved(id) where id is not null
on conflict do nothing;

update public.opportunities opportunity
set country_id = null, geo_area_id = null
from c7_opportunity_backfill_rollback_ids rollback
where opportunity.id = rollback.id;
commit;
