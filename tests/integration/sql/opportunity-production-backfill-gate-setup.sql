truncate table public.applications, public.opportunities;
insert into public.opportunities (id,title,country,region,province,city,owner_id,created_by,club_id)
select
  ('30000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'Exact Subiaco ' || n,
  case when n % 3 = 0 then 'Italia' when n % 3 = 1 then 'IT' else 'Italy' end,
  'Lazio', 'RM', 'Subiaco',
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001'
from generate_series(1,31) n;
insert into public.applications values (
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'submitted'
);
