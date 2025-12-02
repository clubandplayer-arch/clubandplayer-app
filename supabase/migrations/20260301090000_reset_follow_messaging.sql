-- MIGRAZIONE CANONICA FOLLOW + MESSAGING
-- Ricrea da zero schema e policy RLS per follow e messaggistica basati su profili.

-- Pulisce tabelle esistenti (perdita dati di test accettata)
drop table if exists public.messages cascade;
drop table if exists public.conversation_participants cascade;
drop table if exists public.conversations cascade;
drop table if exists public.follows cascade;

-- Conversazioni 1:1 basate su profili
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_participants_profile
  on public.conversation_participants(profile_id);
create index if not exists idx_messages_conversation
  on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_sender_profile
  on public.messages(sender_profile_id);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Policy conversazioni: visibili/gestibili solo ai partecipanti
create policy conversations_select on public.conversations
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      join public.profiles p on p.id = cp.profile_id
      where cp.conversation_id = conversations.id and p.user_id = auth.uid()
    )
  );

create policy conversations_insert on public.conversations
  for insert to authenticated
  with check (true); -- la verifica sui partecipanti avviene nelle tabelle collegate

create policy conversations_update on public.conversations
  for update to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      join public.profiles p on p.id = cp.profile_id
      where cp.conversation_id = conversations.id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.conversation_participants cp
      join public.profiles p on p.id = cp.profile_id
      where cp.conversation_id = conversations.id and p.user_id = auth.uid()
    )
  );

-- Policy partecipanti: un utente può inserire il proprio profilo e aggiungere il peer
-- se la conversazione contiene già il suo profilo.
create policy conversation_participants_select on public.conversation_participants
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = conversation_participants.profile_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.conversation_participants cp
      join public.profiles p on p.id = cp.profile_id
      where cp.conversation_id = conversation_participants.conversation_id and p.user_id = auth.uid()
    )
  );

create policy conversation_participants_insert on public.conversation_participants
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = conversation_participants.profile_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.conversation_participants cp
      join public.profiles p on p.id = cp.profile_id
      where cp.conversation_id = conversation_participants.conversation_id and p.user_id = auth.uid()
    )
  );

create policy conversation_participants_delete on public.conversation_participants
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = conversation_participants.profile_id and p.user_id = auth.uid()
    )
  );

-- Policy messaggi: solo i partecipanti possono leggere/inserire
create policy messages_select on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      join public.profiles p on p.id = cp.profile_id
      where cp.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
  );

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    exists (
      select 1 from public.conversation_participants cp
      join public.profiles p on p.id = cp.profile_id
      where cp.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p2
      where p2.id = messages.sender_profile_id and p2.user_id = auth.uid()
    )
  );

-- =========================
-- Follows basati su profili
-- =========================
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_profile_id, target_profile_id)
);

create index if not exists idx_follows_follower on public.follows(follower_profile_id);
create index if not exists idx_follows_target on public.follows(target_profile_id);

alter table public.follows enable row level security;

create policy follows_select on public.follows
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p where p.id = follows.follower_profile_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p where p.id = follows.target_profile_id and p.user_id = auth.uid()
    )
  );

create policy follows_insert on public.follows
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p where p.id = follows.follower_profile_id and p.user_id = auth.uid()
    )
  );

create policy follows_delete on public.follows
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles p where p.id = follows.follower_profile_id and p.user_id = auth.uid()
    )
  );
