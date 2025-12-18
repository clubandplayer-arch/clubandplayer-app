-- Enforce: a player can be in ONLY ONE club roster at a time
create unique index if not exists club_roster_members_unique_player
on public.club_roster_members (player_profile_id);
