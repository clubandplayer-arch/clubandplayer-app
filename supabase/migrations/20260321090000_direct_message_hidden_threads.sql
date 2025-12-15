create table if not exists public.direct_message_hidden_threads (
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  other_profile_id uuid not null references public.profiles(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (owner_profile_id, other_profile_id)
);

alter table public.direct_message_hidden_threads enable row level security;
alter table public.direct_message_hidden_threads force row level security;

create index if not exists idx_direct_message_hidden_threads_owner on public.direct_message_hidden_threads (owner_profile_id);
create index if not exists idx_direct_message_hidden_threads_other on public.direct_message_hidden_threads (other_profile_id);

create policy direct_message_hidden_threads_select on public.direct_message_hidden_threads
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = owner_profile_id and p.user_id = auth.uid()
    )
  );

create policy direct_message_hidden_threads_insert on public.direct_message_hidden_threads
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = owner_profile_id and p.user_id = auth.uid()
    )
  );

create policy direct_message_hidden_threads_update on public.direct_message_hidden_threads
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = owner_profile_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = owner_profile_id and p.user_id = auth.uid()
    )
  );

create policy direct_message_hidden_threads_delete on public.direct_message_hidden_threads
  for delete using (
    exists (
      select 1 from public.profiles p
      where p.id = owner_profile_id and p.user_id = auth.uid()
    )
  );
