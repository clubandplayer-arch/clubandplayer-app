-- Ensure applications table exists with status management for opportunity candidates
begin;

-- Create table if missing (idempotent on environments where it already exists)
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  athlete_id uuid references auth.users(id),
  club_id uuid references auth.users(id),
  note text,
  status text check (status in ('submitted', 'seen', 'accepted', 'rejected')) default 'submitted',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure columns and defaults exist even if the table was previously created
alter table if exists public.applications add column if not exists club_id uuid references auth.users(id);
alter table if exists public.applications add column if not exists note text;
alter table if exists public.applications add column if not exists status text;

alter table if exists public.applications
  alter column status set default 'submitted',
  alter column status set not null;

-- Re-create status check constraint idempotently
alter table if exists public.applications drop constraint if exists applications_status_check;
alter table if exists public.applications
  add constraint applications_status_check
    check (status in ('submitted', 'seen', 'accepted', 'rejected'));

alter table if exists public.applications add column if not exists created_at timestamptz default now();
alter table if exists public.applications add column if not exists updated_at timestamptz default now();

-- Align club_id using opportunity ownership when available
update public.applications a
set club_id = coalesce(o.owner_id, o.created_by)
from public.opportunities o
where a.opportunity_id = o.id
  and a.club_id is null;

-- Indexes useful for lookups
create index if not exists idx_applications_athlete_id on public.applications(athlete_id);
create index if not exists idx_applications_opportunity_id on public.applications(opportunity_id);
create index if not exists idx_applications_club_id on public.applications(club_id);
create index if not exists idx_applications_owner_lookup on public.applications(club_id, opportunity_id);

-- Trigger updated_at
create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_applications_updated_at on public.applications;
create trigger trg_applications_updated_at
before update on public.applications
for each row
execute function public.set_current_timestamp_updated_at();

-- RLS: athletes and owning clubs can read/update their applications
alter table if exists public.applications enable row level security;
alter table if exists public.applications force row level security;

drop policy if exists "applications_select_club_or_athlete" on public.applications;
drop policy if exists "applications_insert_only_athlete" on public.applications;
drop policy if exists "applications_update_club_or_athlete" on public.applications;
drop policy if exists "applications_delete_club_or_athlete" on public.applications;

create policy "applications_select_club_or_athlete"
  on public.applications
  for select
  to authenticated
  using (
    athlete_id = auth.uid()
    or club_id = auth.uid()
  );

create policy "applications_insert_only_athlete"
  on public.applications
  for insert
  to authenticated
  with check (
    athlete_id = auth.uid()
  );

create policy "applications_update_club_or_athlete"
  on public.applications
  for update
  to authenticated
  using (
    athlete_id = auth.uid()
    or club_id = auth.uid()
  )
  with check (
    athlete_id = auth.uid()
    or club_id = auth.uid()
  );

create policy "applications_delete_club_or_athlete"
  on public.applications
  for delete
  to authenticated
  using (
    athlete_id = auth.uid()
    or club_id = auth.uid()
  );

commit;
