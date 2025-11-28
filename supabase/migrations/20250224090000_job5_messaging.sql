begin;

-- Funzione helper per updated_at (idempotente)
do $$
begin
  if not exists (
    select 1
    from pg_proc
    where proname = 'set_current_timestamp_updated_at'
      and pg_function_is_visible(oid)
  ) then
    create or replace function public.set_current_timestamp_updated_at()
    returns trigger
    language plpgsql
    as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$;
  end if;
end
$$;

-- Tabelle base (idempotenti)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  subject text,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Allineamento conversazioni a schema Job 5 (1-a-1 con profili)
alter table public.conversations
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists participant_a uuid references public.profiles(id),
  add column if not exists participant_b uuid references public.profiles(id),
  add column if not exists last_message_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'conversations_participants_distinct'
  ) then
    alter table public.conversations
      add constraint conversations_participants_distinct
      check (
        participant_a is null
        or participant_b is null
        or participant_a <> participant_b
      );
  end if;
end
$$;

create index if not exists idx_conversations_participant_a on public.conversations(participant_a);
create index if not exists idx_conversations_participant_b on public.conversations(participant_b);
create index if not exists idx_conversations_last_message on public.conversations(last_message_at desc nulls last, updated_at desc);

-- Partecipanti: aggiungi profile_id per mapping esplicito
alter table public.conversation_participants
  add column if not exists profile_id uuid references public.profiles(id);

update public.conversation_participants cp
set profile_id = p.id
from public.profiles p
where cp.profile_id is null and p.user_id = cp.user_id;

create index if not exists idx_conversation_participants_profile on public.conversation_participants(profile_id);

-- Messaggi: collega al profilo mittente
alter table public.messages
  add column if not exists sender_profile_id uuid references public.profiles(id);

update public.messages m
set sender_profile_id = p.id
from public.profiles p
where m.sender_profile_id is null and p.user_id = m.sender_id;

create index if not exists idx_messages_sender_profile on public.messages(sender_profile_id);

-- Trigger di mantenimento updated_at / preview ultimo messaggio
drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.sync_conversation_on_message()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.conversations
  set last_message_at = coalesce(new.created_at, now()),
      last_message_preview = left(coalesce(new.body, ''), 240),
      updated_at = greatest(coalesce(new.created_at, now()), updated_at)
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_messages_after_insert on public.messages;
create trigger trg_messages_after_insert
after insert on public.messages
for each row
execute function public.sync_conversation_on_message();

-- RLS coerente con profili e conversazioni 1-a-1
alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table public.conversation_participants enable row level security;
alter table public.conversation_participants force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;

drop policy if exists conversations_select on public.conversations;
drop policy if exists conversations_insert on public.conversations;
drop policy if exists conversations_update on public.conversations;

create policy conversations_select on public.conversations
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = public.conversations.participant_a and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = public.conversations.participant_b and p.user_id = auth.uid()
    )
  );

create policy conversations_insert on public.conversations
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = public.conversations.participant_a and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = public.conversations.participant_b and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = public.conversations.created_by and p.user_id = auth.uid()
    )
  );

create policy conversations_update on public.conversations
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = public.conversations.participant_a and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = public.conversations.participant_b and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = public.conversations.participant_a and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = public.conversations.participant_b and p.user_id = auth.uid()
    )
  );

drop policy if exists conversation_participants_select on public.conversation_participants;
drop policy if exists conversation_participants_insert on public.conversation_participants;

drop policy if exists conversation_participants_update on public.conversation_participants;
drop policy if exists conversation_participants_delete on public.conversation_participants;

create policy conversation_participants_select on public.conversation_participants
  for select
  using (
    conversation_participants.user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = conversation_participants.profile_id and p.user_id = auth.uid()
    )
  );

create policy conversation_participants_insert on public.conversation_participants
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.conversations c
      join public.profiles pa on pa.id = c.participant_a
      join public.profiles pb on pb.id = c.participant_b
      where c.id = conversation_participants.conversation_id
        and (
          pa.user_id = auth.uid()
          or pb.user_id = auth.uid()
        )
    )
  );

drop policy if exists messages_select on public.messages;
drop policy if exists messages_insert on public.messages;
drop policy if exists messages_update on public.messages;
drop policy if exists messages_delete on public.messages;

create policy messages_select on public.messages
  for select
  using (
    exists (
      select 1 from public.conversations c
      join public.profiles pa on pa.id = c.participant_a
      join public.profiles pb on pb.id = c.participant_b
      where c.id = public.messages.conversation_id
        and (
          pa.user_id = auth.uid()
          or pb.user_id = auth.uid()
        )
    )
  );

create policy messages_insert on public.messages
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = public.messages.sender_profile_id
        and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.conversations c
      where c.id = public.messages.conversation_id
        and (
          c.participant_a = public.messages.sender_profile_id
          or c.participant_b = public.messages.sender_profile_id
        )
    )
  );

commit;
