-- Supabase security hardening: password/OTP policy + profiles/clubs RLS alignment
begin;

-- Auth service policy is not database state and cannot be configured through
-- functions in the private auth schema. Password strength and email OTP expiry
-- are declared in supabase/config.toml, which GitHub Integration applies to the
-- Preview Auth service before this database migration runs.

-- Profiles RLS: public read, self-service writes guarded by WITH CHECK
alter table if exists public.profiles enable row level security;

drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles insert self" on public.profiles;
drop policy if exists "profiles update self" on public.profiles;
drop policy if exists "profiles delete self" on public.profiles;

create policy "profiles public read"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles insert self"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy "profiles update self"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "profiles delete self"
on public.profiles
for delete
to authenticated
using (user_id = auth.uid());

create index if not exists profiles_user_idx on public.profiles(user_id);

-- Clubs RLS: keep owner-only visibility with WITH CHECK on updates
alter table if exists public.clubs enable row level security;

drop policy if exists "clubs select own" on public.clubs;
drop policy if exists "clubs insert own" on public.clubs;
drop policy if exists "clubs update own" on public.clubs;
drop policy if exists "clubs delete own" on public.clubs;

create policy "clubs select own"
on public.clubs
for select
to authenticated
using (owner_id = auth.uid());

create policy "clubs insert own"
on public.clubs
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "clubs update own"
on public.clubs
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "clubs delete own"
on public.clubs
for delete
to authenticated
using (owner_id = auth.uid());

commit;
