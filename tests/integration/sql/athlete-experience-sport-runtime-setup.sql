\set ON_ERROR_STOP on

create table public.athlete_experiences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  club_name text, sport text, role text, category text,
  start_year smallint, end_year smallint, is_current boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.athlete_experiences enable row level security;
alter table public.athlete_experiences force row level security;
create policy athlete_experiences_manage_own on public.athlete_experiences for all to authenticated
using (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));
grant select,insert,delete,update on public.athlete_experiences to authenticated;
