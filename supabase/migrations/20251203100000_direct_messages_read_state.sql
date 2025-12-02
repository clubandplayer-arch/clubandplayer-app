create table if not exists public.direct_message_read_state (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  other_profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  inserted_at timestamptz not null default now(),
  unique (owner_profile_id, other_profile_id)
);

alter table public.direct_message_read_state enable row level security;

create policy "dm_read_state_select_own"
on public.direct_message_read_state
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = owner_profile_id
      and p.user_id = auth.uid()
  )
);

create policy "dm_read_state_upsert_own"
on public.direct_message_read_state
for insert, update
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = owner_profile_id
      and p.user_id = auth.uid()
  )
);
