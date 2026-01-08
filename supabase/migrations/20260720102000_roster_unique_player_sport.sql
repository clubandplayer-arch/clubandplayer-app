begin;

alter table public.club_roster_members
  add column if not exists club_sport text;

update public.club_roster_members crm
set club_sport = p.sport
from public.profiles p
where crm.club_profile_id = p.id
  and crm.club_sport is null;

create or replace function public.set_club_roster_sport()
returns trigger
language plpgsql
security definer
as $$
begin
  select p.sport into new.club_sport
  from public.profiles p
  where p.id = new.club_profile_id;

  return new;
end;
$$;

drop trigger if exists trg_club_roster_set_sport on public.club_roster_members;
create trigger trg_club_roster_set_sport
before insert or update of club_profile_id on public.club_roster_members
for each row
execute function public.set_club_roster_sport();

drop index if exists public.club_roster_members_unique_player;

create unique index if not exists club_roster_members_unique_player_sport
on public.club_roster_members (player_profile_id, club_sport)
where status = 'active';

commit;
