-- Add club_id column to opportunities and backfill from legacy owner fields
alter table public.opportunities
  add column if not exists club_id uuid;

-- Backfill club_id from existing owner columns
update public.opportunities
  set club_id = coalesce(club_id, owner_id, created_by)
  where club_id is null;

-- Foreign key to profiles (club) with defensive IF NOT EXISTS guards
alter table public.opportunities
  add constraint if not exists opportunities_club_id_fkey
  foreign key (club_id) references public.profiles(id)
  on delete set null;

-- Index to speed up queries filtered by club
create index if not exists opportunities_club_id_idx
  on public.opportunities(club_id);

-- Keep club_id aligned with owner fields on insert/update
create or replace function public.trg_opportunities_set_club_id()
returns trigger
language plpgsql
as $$
begin
  if new.club_id is null then
    new.club_id := coalesce(new.owner_id, new.created_by);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_opportunities_set_club_id on public.opportunities;
create trigger trg_opportunities_set_club_id
before insert or update on public.opportunities
for each row
execute function public.trg_opportunities_set_club_id();
