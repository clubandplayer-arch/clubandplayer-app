-- Schema suggerito per abilitare DM, notifiche e seguiti multi-target

-- Conversazioni
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Partecipanti a una conversazione
create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (conversation_id, user_id)
);
create index if not exists conversation_participants_user_idx on public.conversation_participants(user_id);

-- Messaggi
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  receiver_id uuid references auth.users(id) on delete set null,
  body text,
  text text, -- compatibilità con il codice esistente
  folder text default 'inbox' check (folder in ('inbox','spam','archived')),
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists messages_conversation_idx on public.messages(conversation_id);
create index if not exists messages_receiver_unread_idx on public.messages(receiver_id, read_at);

-- Notifiche
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null,
  payload jsonb default '{}'::jsonb,
  read_at timestamptz,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_unread_idx on public.notifications(user_id, read_at);

-- Follow multi-target (club o player)
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references auth.users(id) on delete cascade,
  target_id uuid references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('club','player')),
  created_at timestamptz default now(),
  unique (follower_id, target_id, target_type)
);
create index if not exists follows_follower_idx on public.follows(follower_id, target_type);

-- RLS (da abilitare):
-- enable row level security on conversations, conversation_participants, messages, notifications, follows;
-- consentire SELECT/INSERT/UPDATE/DELETE solo ai record che coinvolgono auth.uid();
