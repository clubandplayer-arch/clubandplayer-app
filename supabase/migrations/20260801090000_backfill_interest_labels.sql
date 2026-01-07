set search_path = public, pg_temp;

update public.profiles p
set interest_country = 'IT'
where p.interest_country is null
  and (p.interest_region_id is not null or p.interest_province_id is not null or p.interest_municipality_id is not null);

update public.profiles p
set interest_region = r.name
from public.regions r
where p.interest_region is null
  and p.interest_region_id = r.id;

update public.profiles p
set interest_province = pr.name
from public.provinces pr
where p.interest_province is null
  and p.interest_province_id = pr.id;

update public.profiles p
set interest_city = m.name
from public.municipalities m
where p.interest_city is null
  and p.interest_municipality_id = m.id;
