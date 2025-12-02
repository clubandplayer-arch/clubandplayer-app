-- MIGRAZIONE MESSAGGI + FOLLOW (da eseguire in Supabase)
-- Obiettivo: allineare schema e policy RLS con il codice attuale (profili come soggetti)
-- Idempotente: può essere rieseguita in sicurezza.

-- =========================
-- Tabelle conversazioni/messaggi
-- =========================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text
);

-- Unique unordered pair
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'conversations_pair_unique') then
    alter table public.conversations drop constraint conversations_pair_unique;
  end if;
  create unique index if not exists conversations_pair_unique
    on public.conversations (least(participant_a, participant_b), greatest(participant_a, participant_b));
end $$;

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

-- Aggiunge profile_id se manca
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'conversation_participants' and column_name = 'profile_id'
  ) then
    alter table public.conversation_participants add column profile_id uuid references public.profiles(id) on delete cascade;
  end if;
end $$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- colonne opzionali (idempotente)
alter table public.messages
  add column if not exists sender_profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists read_at timestamptz;

create index if not exists idx_conversation_participants_user on public.conversation_participants (user_id);
create index if not exists idx_conversation_participants_profile on public.conversation_participants (profile_id);
create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at desc);
create index if not exists idx_messages_sender_profile on public.messages (sender_profile_id);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Policy conversazioni: accesso solo se partecipante
drop policy if exists conversations_select on public.conversations;
drop policy if exists conversations_insert on public.conversations;
drop policy if exists conversations_update on public.conversations;
drop policy if exists conversations_delete on public.conversations;

create policy conversations_select on public.conversations
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and (p.id = participant_a or p.id = participant_b)
    )
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
    )
  );

create policy conversations_insert on public.conversations
  for insert to authenticated with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and (p.id = participant_a or p.id = participant_b)
    )
  );

create policy conversations_update on public.conversations
  for update to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and (p.id = participant_a or p.id = participant_b)
    )
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and (p.id = participant_a or p.id = participant_b)
    )
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
    )
  );

-- Policy conversation_participants
drop policy if exists conversation_participants_select on public.conversation_participants;
drop policy if exists conversation_participants_insert on public.conversation_participants;
drop policy if exists conversation_participants_update on public.conversation_participants;
drop policy if exists conversation_participants_delete on public.conversation_participants;

create policy conversation_participants_select on public.conversation_participants
  for select to authenticated using (user_id = auth.uid());

create policy conversation_participants_insert on public.conversation_participants
  for insert to authenticated with check (user_id = auth.uid());

create policy conversation_participants_update on public.conversation_participants
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy conversation_participants_delete on public.conversation_participants
  for delete to authenticated using (user_id = auth.uid());

-- Policy messaggi: solo partecipanti
drop policy if exists messages_select on public.messages;
drop policy if exists messages_insert on public.messages;
drop policy if exists messages_update on public.messages;
drop policy if exists messages_delete on public.messages;

create policy messages_select on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.conversations c
      join public.profiles pa on pa.id = c.participant_a
      join public.profiles pb on pb.id = c.participant_b
      where c.id = messages.conversation_id and (pa.user_id = auth.uid() or pb.user_id = auth.uid())
    )
  );

create policy messages_insert on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- =========================
-- Tabella follows basata su profili
-- =========================
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('club','player')),
  created_at timestamptz not null default now(),
  unique (follower_profile_id, target_profile_id)
);

-- Allineamento colonne legacy follower_id/target_id
do $$
begin
  if not exists (
    select 1 from information_schema.columns where table_name = 'follows' and column_name = 'follower_profile_id'
  ) then
    alter table public.follows add column follower_profile_id uuid;
  end if;
  if not exists (
    select 1 from information_schema.columns where table_name = 'follows' and column_name = 'target_profile_id'
  ) then
    alter table public.follows add column target_profile_id uuid;
  end if;

  -- Copia dati da colonne legacy se presenti
  if exists (select 1 from information_schema.columns where table_name = 'follows' and column_name = 'follower_id') then
    update public.follows
      set follower_profile_id = coalesce(follower_profile_id, follower_id);
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'follows' and column_name = 'target_id') then
    update public.follows
      set target_profile_id = coalesce(target_profile_id, target_id);
  end if;

  alter table public.follows alter column follower_profile_id set not null;
  alter table public.follows alter column target_profile_id set not null;

  -- Rimuove constraint unici/chiavi legacy per ricreare quello corretto
  if exists (select 1 from pg_constraint where conname = 'follows_follower_target_unique') then
    alter table public.follows drop constraint follows_follower_target_unique;
  end if;
end $$;

alter table public.follows
  add constraint follows_follower_target_unique unique (follower_profile_id, target_profile_id);

create index if not exists idx_follows_follower on public.follows (follower_profile_id);
create index if not exists idx_follows_target on public.follows (target_profile_id, target_type);

alter table public.follows enable row level security;

-- RLS follows
drop policy if exists follows_select on public.follows;
drop policy if exists follows_insert on public.follows;
drop policy if exists follows_delete on public.follows;

create policy follows_select on public.follows
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = follower_profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = target_profile_id and p.user_id = auth.uid())
  );

create policy follows_insert on public.follows
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = follower_profile_id and p.user_id = auth.uid())
  );

create policy follows_delete on public.follows
  for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = follower_profile_id and p.user_id = auth.uid())
  );
