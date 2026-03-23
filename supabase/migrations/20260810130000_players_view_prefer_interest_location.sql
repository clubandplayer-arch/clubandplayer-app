-- Keep player public location consistent by preferring interest_* labels together

drop view if exists public.athletes_view;
drop view if exists public.players_view;

create view public.players_view with (security_invoker = true) as
select
  p.id,
  p.user_id,
  coalesce(nullif(p.full_name, ''), p.full_name) as full_name,
  coalesce(
    nullif(p.full_name, ''),
    case
      when coalesce(p.display_name, '') = '' then null
      when position('@' in p.display_name) > 0 then null
      else p.display_name
    end,
    'Player'
  ) as display_name,
  p.headline,
  p.bio,
  p.sport,
  p.role,
  coalesce(nullif(p.interest_country, ''), nullif(p.country, '')) as country,
  coalesce(nullif(p.interest_region, ''), nullif(p.region, '')) as region,
  coalesce(nullif(p.interest_province, ''), nullif(p.province, '')) as province,
  coalesce(nullif(p.interest_city, ''), nullif(p.city, '')) as city,
  p.avatar_url,
  p.links,
  p.account_type,
  p.status,
  p.created_at,
  p.updated_at,
  p.matches_played,
  p.goals_scored,
  p.assists,
  p.open_to_opportunities,
  p.preferred_roles,
  p.preferred_locations
from public.profiles p
where p.account_type = 'athlete';

create view public.athletes_view with (security_invoker = true) as
select * from public.players_view;
