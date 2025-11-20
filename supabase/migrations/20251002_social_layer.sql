-- Social layer tables for follows, reactions, comments, conversations and notifications
-- Follows (users can follow clubs or players)
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null,
  target_type text not null check (target_type in ('club','player')),
  created_at timestamptz not null default now(),
  unique (follower_id, target_id, target_type)
);

alter table public.follows enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'follows' and policyname = 'follows_select'
  ) then
    create policy follows_select on public.follows for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'follows' and policyname = 'follows_insert_self'
  ) then
    create policy follows_insert_self on public.follows for insert with check (auth.uid() = follower_id);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'follows' and policyname = 'follows_delete_self'
  ) then
    create policy follows_delete_self on public.follows for delete using (auth.uid() = follower_id);
  end if;
end $$;

create index if not exists idx_follows_follower on public.follows (follower_id);
create index if not exists idx_follows_target on public.follows (target_id, target_type);

-- Post reactions
create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.post_reactions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'post_reactions' and policyname = 'post_reactions_select'
  ) then
    create policy post_reactions_select on public.post_reactions for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'post_reactions' and policyname = 'post_reactions_insert_self'
  ) then
    create policy post_reactions_insert_self on public.post_reactions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'post_reactions' and policyname = 'post_reactions_update_self'
  ) then
    create policy post_reactions_update_self on public.post_reactions for update using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'post_reactions' and policyname = 'post_reactions_delete_self'
  ) then
    create policy post_reactions_delete_self on public.post_reactions for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_post_reactions_post on public.post_reactions (post_id);
create index if not exists idx_post_reactions_user on public.post_reactions (user_id);

-- Post comments
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  parent_comment_id uuid references public.post_comments(id) on delete cascade
);

alter table public.post_comments enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'post_comments' and policyname = 'post_comments_select'
  ) then
    create policy post_comments_select on public.post_comments for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'post_comments' and policyname = 'post_comments_insert'
  ) then
    create policy post_comments_insert on public.post_comments for insert with check (auth.uid() = author_id);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'post_comments' and policyname = 'post_comments_update'
  ) then
    create policy post_comments_update on public.post_comments for update using (auth.uid() = author_id);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'post_comments' and policyname = 'post_comments_delete'
  ) then
    create policy post_comments_delete on public.post_comments for delete using (auth.uid() = author_id);
  end if;
end $$;

create index if not exists idx_post_comments_post on public.post_comments (post_id, created_at desc);

-- Conversations and messages
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

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create index if not exists idx_conversation_participants_user on public.conversation_participants (user_id);
create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at desc);

-- RLS for conversations: participants only

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'conversation_participants' and policyname = 'conversation_participants_select'
  ) then
    create policy conversation_participants_select on public.conversation_participants for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'conversation_participants' and policyname = 'conversation_participants_insert'
  ) then
    create policy conversation_participants_insert on public.conversation_participants for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'conversations' and policyname = 'conversations_select'
  ) then
    create policy conversations_select on public.conversations for select using (
      exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
      )
    );
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'conversations' and policyname = 'conversations_insert'
  ) then
    create policy conversations_insert on public.conversations for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'conversations' and policyname = 'conversations_update'
  ) then
    create policy conversations_update on public.conversations for update using (
      exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'messages' and policyname = 'messages_select'
  ) then
    create policy messages_select on public.messages for select using (
      exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
      )
    );
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'messages' and policyname = 'messages_insert'
  ) then
    create policy messages_insert on public.messages for insert with check (
      exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
      ) and sender_id = auth.uid()
    );
  end if;
end $$;

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_select'
  ) then
    create policy notifications_select on public.notifications for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_insert'
  ) then
    create policy notifications_insert on public.notifications for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_update'
  ) then
    create policy notifications_update on public.notifications for update using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);
