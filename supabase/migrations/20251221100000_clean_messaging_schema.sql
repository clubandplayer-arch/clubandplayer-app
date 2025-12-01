-- Consolidamento schema messaging (conversations/messages) con RLS basata sui profili
-- Idempotente: riapplicabile su ambienti che hanno già tabelle/indici/policy pregresse

-- Tabelle principali
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text
);

-- Colonne aggiuntive (idempotente)
alter table public.conversations
  add column if not exists last_message_at timestamptz,
  add column if not exists last_message_preview text,
  add column if not exists participant_a uuid references public.profiles(id) on delete cascade,
  add column if not exists participant_b uuid references public.profiles(id) on delete cascade;

-- Coppia partecipanti unica (indipendente dal verso)
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'conversations_pair_unique') then
    alter table public.conversations drop constraint if exists conversations_pair_unique;
  end if;
  -- Unique sul pair ordinato
  create unique index if not exists conversations_pair_unique
    on public.conversations (least(participant_a, participant_b), greatest(participant_a, participant_b));
end $$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.messages
  add column if not exists sender_profile_id uuid references public.profiles(id);

create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_sender_profile on public.messages(sender_profile_id);
create index if not exists idx_conversations_participant_a on public.conversations(participant_a);
create index if not exists idx_conversations_participant_b on public.conversations(participant_b);
create index if not exists idx_conversations_last_message on public.conversations(last_message_at desc nulls last, updated_at desc);

-- RLS: partecipanti via profili
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations policies
drop policy if exists conversations_select on public.conversations;
drop policy if exists conversations_insert on public.conversations;
drop policy if exists conversations_update on public.conversations;
drop policy if exists conversations_delete on public.conversations;

create policy conversations_select on public.conversations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and (p.id = participant_a or p.id = participant_b)
    )
  );

create policy conversations_insert on public.conversations
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and (p.id = participant_a or p.id = participant_b)
    )
  );

create policy conversations_update on public.conversations
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and (p.id = participant_a or p.id = participant_b)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and (p.id = participant_a or p.id = participant_b)
    )
  );

-- Messages policies
drop policy if exists messages_select on public.messages;
drop policy if exists messages_insert on public.messages;
drop policy if exists messages_update on public.messages;
drop policy if exists messages_delete on public.messages;

create policy messages_select on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      join public.profiles pa on pa.id = c.participant_a
      join public.profiles pb on pb.id = c.participant_b
      where c.id = messages.conversation_id
        and (pa.user_id = auth.uid() or pb.user_id = auth.uid())
    )
  );

create policy messages_insert on public.messages
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = sender_profile_id and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = sender_profile_id or c.participant_b = sender_profile_id)
    )
  );

