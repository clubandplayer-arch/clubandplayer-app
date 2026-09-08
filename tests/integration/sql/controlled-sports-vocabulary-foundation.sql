insert into public.sports (id, code)
select gen_random_uuid(), code
from (values
  ('football'), ('volleyball'), ('basketball'), ('water_polo'), ('handball'), ('rugby'),
  ('field_hockey'), ('ice_hockey'), ('baseball'), ('softball'), ('lacrosse'), ('american_football')
) as seed(code);

insert into public.sport_disciplines (id, sport_id, code)
select gen_random_uuid(), s.id, seed.code
from public.sports s
cross join (values ('association_football'), ('futsal')) as seed(code)
where s.code = 'football';

insert into public.sport_variants (id, discipline_id, code)
select gen_random_uuid(), d.id, seed.code
from public.sport_disciplines d
cross join (values ('eleven_a_side'), ('eight_a_side')) as seed(code)
where d.code = 'association_football';
