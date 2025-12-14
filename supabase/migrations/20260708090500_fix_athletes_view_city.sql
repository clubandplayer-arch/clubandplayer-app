drop view if exists public.athletes_view;

-- Recreate athletes_view using existing profile columns
create view public.athletes_view as
select
  p.id,
  p.user_id,
  p.display_name,
  coalesce(nullif(p.display_name, ''), nullif(p.full_name, '')) as full_name,
  p.headline,
  p.bio,
  p.sport,
  p.role,
  p.country,
  p.region,
  p.province,
  coalesce(nullif(p.city, ''), nullif(p.interest_city, '')) as city,
  p.avatar_url,
  p.account_type,
  p.created_at,
  p.updated_at
from public.profiles p
where p.account_type = 'athlete';
