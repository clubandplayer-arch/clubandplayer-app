-- Hardening RLS for social/interaction tables

-- POSTS: keep existing policies but ensure presence (idempotent handled by previous migrations).
-- No changes required here.

-- POST COMMENTS: restrict to authenticated users, owner manage own
alter table if exists public.post_comments enable row level security;
alter table if exists public.post_comments force row level security;

drop policy if exists post_comments_select on public.post_comments;
drop policy if exists post_comments_insert on public.post_comments;
drop policy if exists post_comments_update on public.post_comments;
drop policy if exists post_comments_delete on public.post_comments;

create policy post_comments_select on public.post_comments
  for select
  to authenticated
  using (auth.uid() is not null);

create policy post_comments_insert on public.post_comments
  for insert
  to authenticated
  with check (author_id = auth.uid());

create policy post_comments_update on public.post_comments
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy post_comments_delete on public.post_comments
  for delete
  to authenticated
  using (author_id = auth.uid());

-- POST REACTIONS: keep stricter manage_own policy but ensure RLS enforced
alter table if exists public.post_reactions enable row level security;
alter table if exists public.post_reactions force row level security;

drop policy if exists post_reactions_select on public.post_reactions;
drop policy if exists post_reactions_insert_self on public.post_reactions;
drop policy if exists post_reactions_update_self on public.post_reactions;
drop policy if exists post_reactions_delete_self on public.post_reactions;
drop policy if exists post_reactions_select_auth on public.post_reactions;
drop policy if exists post_reactions_manage_own on public.post_reactions;

create policy post_reactions_select_auth on public.post_reactions
  for select
  to authenticated
  using (auth.uid() is not null);

create policy post_reactions_manage_own on public.post_reactions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- POSTS already handled in previous migrations (RLS forced, author-only mutations)

-- OPPORTUNITIES already force RLS with owner-only mutations and authenticated select; no change

-- APPLICATIONS: split update/delete to explicit roles
alter table if exists public.applications enable row level security;
alter table if exists public.applications force row level security;

drop policy if exists applications_select_club_or_athlete on public.applications;
drop policy if exists applications_insert_only_athlete on public.applications;
drop policy if exists applications_update_club_or_athlete on public.applications;
drop policy if exists applications_delete_club_or_athlete on public.applications;

drop policy if exists applications_select_auth on public.applications;
drop policy if exists applications_insert_athlete on public.applications;
drop policy if exists applications_update_owner on public.applications;
drop policy if exists applications_delete_owner on public.applications;

create policy applications_select_club_or_athlete on public.applications
  for select
  to authenticated
  using (athlete_id = auth.uid() or club_id = auth.uid());

create policy applications_insert_only_athlete on public.applications
  for insert
  to authenticated
  with check (athlete_id = auth.uid());

create policy applications_update_club on public.applications
  for update
  to authenticated
  using (club_id = auth.uid())
  with check (club_id = auth.uid());

create policy applications_update_athlete on public.applications
  for update
  to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

create policy applications_delete_club on public.applications
  for delete
  to authenticated
  using (club_id = auth.uid());

create policy applications_delete_athlete on public.applications
  for delete
  to authenticated
  using (athlete_id = auth.uid());

-- NOTIFICATIONS: restrict to recipient for all ops
alter table if exists public.notifications enable row level security;
alter table if exists public.notifications force row level security;

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_insert on public.notifications;
drop policy if exists notifications_update on public.notifications;

drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_manage_own on public.notifications;

create policy notifications_select_own on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

create policy notifications_insert_own on public.notifications
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete
  to authenticated
  using (user_id = auth.uid());

-- FOLLOWS: allow follower/target to read, only follower can mutate own relations
alter table if exists public.follows enable row level security;
alter table if exists public.follows force row level security;

drop policy if exists follows_select on public.follows;
drop policy if exists follows_insert_self on public.follows;
drop policy if exists follows_delete_self on public.follows;

drop policy if exists follows_select_self on public.follows;

drop policy if exists follows_manage on public.follows;

create policy follows_select_self on public.follows
  for select
  to authenticated
  using (follower_id = auth.uid() or target_id = auth.uid());

create policy follows_insert_self on public.follows
  for insert
  to authenticated
  with check (follower_id = auth.uid());

create policy follows_delete_self on public.follows
  for delete
  to authenticated
  using (follower_id = auth.uid());

-- CONVERSATION PARTICIPANTS: participants manage their own entry
alter table if exists public.conversation_participants enable row level security;
alter table if exists public.conversation_participants force row level security;

drop policy if exists conversation_participants_select on public.conversation_participants;
drop policy if exists conversation_participants_insert on public.conversation_participants;

drop policy if exists conversation_participants_manage on public.conversation_participants;

drop policy if exists conversation_participants_delete on public.conversation_participants;

create policy conversation_participants_select on public.conversation_participants
  for select
  to authenticated
  using (user_id = auth.uid());

create policy conversation_participants_insert on public.conversation_participants
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy conversation_participants_delete on public.conversation_participants
  for delete
  to authenticated
  using (user_id = auth.uid());

-- CONVERSATIONS: only participants can see/update/delete; insert allowed to authenticated for creation
alter table if exists public.conversations enable row level security;
alter table if exists public.conversations force row level security;

drop policy if exists conversations_select on public.conversations;
drop policy if exists conversations_insert on public.conversations;
drop policy if exists conversations_update on public.conversations;

drop policy if exists conversations_manage on public.conversations;

drop policy if exists conversations_delete on public.conversations;

create policy conversations_select on public.conversations
  for select
  to authenticated
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
  ));

create policy conversations_insert on public.conversations
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy conversations_update on public.conversations
  for update
  to authenticated
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
  ));

create policy conversations_delete on public.conversations
  for delete
  to authenticated
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
  ));

-- MESSAGES: participants only, sender required on insert
alter table if exists public.messages enable row level security;
alter table if exists public.messages force row level security;

drop policy if exists messages_select on public.messages;
drop policy if exists messages_insert on public.messages;

drop policy if exists messages_manage on public.messages;

drop policy if exists messages_delete on public.messages;

drop policy if exists messages_select_participants on public.messages;

create policy messages_select on public.messages
  for select
  to authenticated
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
  ));

create policy messages_insert on public.messages
  for insert
  to authenticated
  with check (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
  ) and sender_id = auth.uid());

-- Optional updates/deletes remain blocked unless future UX requires it (no policy provided)

