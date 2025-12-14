-- Backfill club_name on opportunities using linked profiles
with candidate as (
  select
    o.id,
    coalesce(p_by_id.display_name, p_by_id.full_name, p_by_user.display_name, p_by_user.full_name) as club_name
  from public.opportunities o
  left join public.profiles p_by_id on p_by_id.id = coalesce(o.club_id, o.owner_id, o.created_by)
  left join public.profiles p_by_user on p_by_user.user_id = coalesce(o.club_id, o.owner_id, o.created_by)
  where o.club_name is null
)
update public.opportunities o
set club_name = c.club_name
from candidate c
where o.id = c.id
  and c.club_name is not null;
