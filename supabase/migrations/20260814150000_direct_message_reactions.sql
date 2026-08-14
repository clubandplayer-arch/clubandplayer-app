create table if not exists public.direct_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (message_id, profile_id)
);

create index if not exists direct_message_reactions_message_idx
  on public.direct_message_reactions (message_id, created_at);

alter table public.direct_message_reactions enable row level security;

drop policy if exists "direct message reactions read participants" on public.direct_message_reactions;
create policy "direct message reactions read participants" on public.direct_message_reactions for select
using (exists (
  select 1 from public.direct_messages dm join public.profiles p
    on p.id in (dm.sender_profile_id, dm.recipient_profile_id)
  where dm.id = message_id and p.user_id = auth.uid() and dm.deleted_at is null
));

drop policy if exists "direct message reactions insert own" on public.direct_message_reactions;
create policy "direct message reactions insert own" on public.direct_message_reactions for insert
with check (exists (
  select 1 from public.direct_messages dm join public.profiles p on p.id = profile_id
  where dm.id = message_id and p.user_id = auth.uid()
    and profile_id in (dm.sender_profile_id, dm.recipient_profile_id) and dm.deleted_at is null
));

drop policy if exists "direct message reactions update own" on public.direct_message_reactions;
create policy "direct message reactions update own" on public.direct_message_reactions for update
using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()))
with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

drop policy if exists "direct message reactions delete own" on public.direct_message_reactions;
create policy "direct message reactions delete own" on public.direct_message_reactions for delete
using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
