create table if not exists public.ugc_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reporter_profile_id uuid null references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('post', 'comment', 'profile')),
  target_id text not null,
  reason text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ugc_reports_target on public.ugc_reports(target_type, target_id);
create index if not exists idx_ugc_reports_reporter on public.ugc_reports(reporter_user_id);

alter table public.ugc_reports enable row level security;

drop policy if exists "ugc_reports_insert_own" on public.ugc_reports;
create policy "ugc_reports_insert_own"
  on public.ugc_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_user_id);

create table if not exists public.profile_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_profile_id uuid not null references public.profiles(id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_blocks_no_self check (blocker_profile_id <> blocked_profile_id),
  constraint profile_blocks_unique unique (blocker_profile_id, blocked_profile_id)
);

create index if not exists idx_profile_blocks_blocker on public.profile_blocks(blocker_profile_id);
create index if not exists idx_profile_blocks_blocked on public.profile_blocks(blocked_profile_id);

alter table public.profile_blocks enable row level security;

drop policy if exists "profile_blocks_insert_own" on public.profile_blocks;
create policy "profile_blocks_insert_own"
  on public.profile_blocks
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = blocker_profile_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "profile_blocks_select_participants" on public.profile_blocks;
create policy "profile_blocks_select_participants"
  on public.profile_blocks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where (p.id = blocker_profile_id or p.id = blocked_profile_id)
        and p.user_id = auth.uid()
    )
  );
