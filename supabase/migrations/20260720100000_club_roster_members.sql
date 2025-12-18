-- Tabella per gestire i player nella rosa di un club
begin;

create table if not exists public.club_roster_members (
  club_profile_id uuid not null references public.profiles (id) on delete cascade,
  player_profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid,
  constraint club_roster_members_pk primary key (club_profile_id, player_profile_id)
);

create index if not exists idx_club_roster_members_club on public.club_roster_members (club_profile_id);
create index if not exists idx_club_roster_members_player on public.club_roster_members (player_profile_id);

alter table public.club_roster_members enable row level security;
alter table public.club_roster_members force row level security;

drop policy if exists "club_roster_select_authenticated" on public.club_roster_members;
drop policy if exists "club_roster_insert_own" on public.club_roster_members;
drop policy if exists "club_roster_update_own" on public.club_roster_members;
drop policy if exists "club_roster_delete_own" on public.club_roster_members;
drop policy if exists "club_roster_service_full" on public.club_roster_members;

create policy "club_roster_select_authenticated"
  on public.club_roster_members
  for select
  to authenticated
  using (true);

create policy "club_roster_insert_own"
  on public.club_roster_members
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = club_profile_id and p.user_id = auth.uid()
    )
  );

create policy "club_roster_update_own"
  on public.club_roster_members
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = club_profile_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = club_profile_id and p.user_id = auth.uid()
    )
  );

create policy "club_roster_delete_own"
  on public.club_roster_members
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = club_profile_id and p.user_id = auth.uid()
    )
  );

create policy "club_roster_service_full"
  on public.club_roster_members
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.set_club_roster_created_by()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_club_roster_set_created_by on public.club_roster_members;
create trigger trg_club_roster_set_created_by
before insert on public.club_roster_members
for each row
execute function public.set_club_roster_created_by();

commit;
