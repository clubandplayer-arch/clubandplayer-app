-- Backfill club_name preferring explicit club profiles then owner/creator profiles
with candidates as (
  select
    o.id,
    1 as priority,
    coalesce(p_id.display_name, p_id.full_name) as name
  from public.opportunities o
  join public.profiles p_id on p_id.id = o.club_id
  where o.club_name is null
    and o.club_id is not null
    and coalesce(p_id.display_name, p_id.full_name) is not null

  union all

  select
    o.id,
    2 as priority,
    coalesce(p_user.display_name, p_user.full_name) as name
  from public.opportunities o
  join public.profiles p_user on p_user.user_id = coalesce(o.owner_id, o.created_by)
  where o.club_name is null
    and coalesce(o.owner_id, o.created_by) is not null
    and coalesce(p_user.display_name, p_user.full_name) is not null
),
ranked as (
  select distinct on (id)
    id,
    name
  from candidates
  order by id, priority
)
update public.opportunities o
set club_name = r.name
from ranked r
where o.id = r.id
  and r.name is not null;
