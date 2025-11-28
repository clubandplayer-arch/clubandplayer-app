begin;

-- Nuova tabella esperienze sportive degli atleti
create table if not exists public.athlete_experiences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  club_name text,
  club_id uuid references public.profiles(id) on delete set null,
  sport text,
  role text,
  category text,
  start_year smallint,
  end_year smallint,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_athlete_experiences_profile on public.athlete_experiences(profile_id);
create index if not exists idx_athlete_experiences_timeline on public.athlete_experiences(profile_id, is_current desc, start_year desc, end_year desc);

alter table public.athlete_experiences enable row level security;
alter table public.athlete_experiences force row level security;

drop policy if exists athlete_experiences_select_public on public.athlete_experiences;
drop policy if exists athlete_experiences_manage_own on public.athlete_experiences;

drop trigger if exists trg_athlete_experiences_updated_at on public.athlete_experiences;
create trigger trg_athlete_experiences_updated_at
before update on public.athlete_experiences
for each row
execute function public.set_current_timestamp_updated_at();

-- Lettura: chiunque può leggere le esperienze di profili attivi
create policy athlete_experiences_select_public
  on public.athlete_experiences
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = athlete_experiences.profile_id
        and p.status = 'active'
    )
  );

-- Scrittura: solo il proprietario (profilo o user collegato)
create policy athlete_experiences_manage_own
  on public.athlete_experiences
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = athlete_experiences.profile_id
        and (p.id = auth.uid() or p.user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = athlete_experiences.profile_id
        and (p.id = auth.uid() or p.user_id = auth.uid())
    )
  );

-- Statistiche base sul profilo atleta
alter table public.profiles
  add column if not exists matches_played integer,
  add column if not exists goals_scored integer,
  add column if not exists assists integer,
  add column if not exists open_to_opportunities boolean default false,
  add column if not exists preferred_roles text,
  add column if not exists preferred_locations text;

commit;
