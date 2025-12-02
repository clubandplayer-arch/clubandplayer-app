create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.direct_messages enable row level security;

create policy "direct_messages_select_own"
  on public.direct_messages
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id in (sender_profile_id, recipient_profile_id)
        and p.user_id = auth.uid()
    )
  );

create policy "direct_messages_insert_own"
  on public.direct_messages
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = sender_profile_id
        and p.user_id = auth.uid()
    )
  );

create index if not exists direct_messages_sender_recipient_created_at_idx
  on public.direct_messages (sender_profile_id, recipient_profile_id, created_at);
