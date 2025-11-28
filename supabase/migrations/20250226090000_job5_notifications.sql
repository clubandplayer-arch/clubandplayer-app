begin;

-- Estensione tabella notifications per Job 5 (notifiche)
alter table public.notifications
  add column if not exists recipient_profile_id uuid references public.profiles(id),
  add column if not exists actor_profile_id uuid references public.profiles(id),
  add column if not exists payload jsonb,
  add column if not exists read_at timestamptz,
  add column if not exists read boolean default false,
  add column if not exists updated_at timestamptz not null default now(),
  alter column kind set default 'system';

-- Backfill recipient_profile_id a partire da user_id
update public.notifications n
set recipient_profile_id = p.id
from public.profiles p
where n.recipient_profile_id is null
  and p.user_id = n.user_id;

-- Backfill flag read
update public.notifications
set read = true
where read_at is not null;

-- Indici utili per filtri
create index if not exists idx_notifications_recipient on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_recipient_profile on public.notifications (recipient_profile_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications (read, read_at);

-- Trigger updated_at
create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row
execute function public.set_current_timestamp_updated_at();

-- RLS allineate a recipient
alter table public.notifications enable row level security;
alter table public.notifications force row level security;

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_insert on public.notifications;
drop policy if exists notifications_update on public.notifications;

do $$
begin
  create policy notifications_select on public.notifications
    for select
    using (
      user_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = recipient_profile_id and p.user_id = auth.uid()
      )
    );

  create policy notifications_insert on public.notifications
    for insert to authenticated
    with check (
      user_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = recipient_profile_id and p.user_id = auth.uid()
      )
    );

  create policy notifications_update on public.notifications
    for update to authenticated
    using (
      user_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = recipient_profile_id and p.user_id = auth.uid()
      )
    )
    with check (
      user_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = recipient_profile_id and p.user_id = auth.uid()
      )
    );
end
$$;

-- Funzione helper per trovare user_id dal profilo
create or replace function public.profile_user_id(p_profile_id uuid)
returns uuid
language sql
stable
as $$
  select user_id from public.profiles where id = p_profile_id;
$$;

-- Trigger: nuova follow -> notifica target
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
as $$
declare
  follower_profile uuid;
  target_user uuid;
begin
  select id into follower_profile from public.profiles where user_id = new.follower_id limit 1;
  select user_id into target_user from public.profiles where id = new.target_id limit 1;

  if target_user is null then
    return new;
  end if;

  insert into public.notifications (id, user_id, recipient_profile_id, actor_profile_id, kind, payload, read)
  values (
    gen_random_uuid(),
    target_user,
    new.target_id,
    follower_profile,
    'new_follower',
    jsonb_build_object('target_profile_id', new.target_id, 'follower_profile_id', follower_profile),
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_on_follow on public.follows;
create trigger trg_notify_on_follow
after insert on public.follows
for each row
execute function public.notify_on_follow();

-- Trigger: nuovo messaggio -> notifica il peer
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
as $$
declare
  conv record;
  recipient_profile uuid;
  recipient_user uuid;
begin
  select participant_a, participant_b into conv from public.conversations where id = new.conversation_id;
  if not found then
    return new;
  end if;

  if conv.participant_a = new.sender_profile_id then
    recipient_profile := conv.participant_b;
  else
    recipient_profile := conv.participant_a;
  end if;

  if recipient_profile is null then
    return new;
  end if;

  select user_id into recipient_user from public.profiles where id = recipient_profile limit 1;
  if recipient_user is null then
    return new;
  end if;

  insert into public.notifications (id, user_id, recipient_profile_id, actor_profile_id, kind, payload, read)
  values (
    gen_random_uuid(),
    recipient_user,
    recipient_profile,
    new.sender_profile_id,
    'new_message',
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'message_id', new.id,
      'preview', left(coalesce(new.body, ''), 140)
    ),
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message
after insert on public.messages
for each row
execute function public.notify_on_message();

commit;
