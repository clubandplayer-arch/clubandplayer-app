-- A recent heartbeat represents an authenticated profile that is actively using the app.
create table if not exists public.profile_presence (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

create index if not exists profile_presence_last_seen_at_idx
  on public.profile_presence (last_seen_at desc);

alter table public.profile_presence enable row level security;

drop policy if exists "profile_presence_select_authenticated" on public.profile_presence;
create policy "profile_presence_select_authenticated"
  on public.profile_presence for select to authenticated using (true);

drop policy if exists "profile_presence_insert_own" on public.profile_presence;
create policy "profile_presence_insert_own"
  on public.profile_presence for insert to authenticated
  with check (exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  ));

drop policy if exists "profile_presence_update_own" on public.profile_presence;
create policy "profile_presence_update_own"
  on public.profile_presence for update to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  ));
