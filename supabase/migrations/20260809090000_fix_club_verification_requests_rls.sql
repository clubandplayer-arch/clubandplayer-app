begin;

-- Align club verification requests RLS with club profile id (profiles.id tied to auth.uid())

alter table if exists public.club_verification_requests enable row level security;

drop policy if exists "club verification select own" on public.club_verification_requests;
drop policy if exists "club verification insert own" on public.club_verification_requests;
drop policy if exists "club verification update own" on public.club_verification_requests;

create policy "club verification select own"
on public.club_verification_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = club_verification_requests.club_id
      and p.user_id = auth.uid()
      and coalesce(p.account_type, p.type) = 'club'
  )
);

create policy "club verification insert own"
on public.club_verification_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = club_verification_requests.club_id
      and p.user_id = auth.uid()
      and coalesce(p.account_type, p.type) = 'club'
  )
);

create policy "club verification update own"
on public.club_verification_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = club_verification_requests.club_id
      and p.user_id = auth.uid()
      and coalesce(p.account_type, p.type) = 'club'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = club_verification_requests.club_id
      and p.user_id = auth.uid()
      and coalesce(p.account_type, p.type) = 'club'
  )
);

commit;
