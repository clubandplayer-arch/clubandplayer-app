-- Harden feed posts/applications/storage so uploads e candidature funzionano anche su ambienti non allineati
begin;

-- POSTS: assicurati che le colonne media esistano e che le policy permettano agli autori di operare
alter table if exists public.posts add column if not exists media_url text;
alter table if exists public.posts add column if not exists media_type text check (media_type in ('image','video'));

create index if not exists idx_posts_author_id_created on public.posts(author_id, created_at desc);

alter table if exists public.posts enable row level security;
alter table if exists public.posts force row level security;

drop policy if exists "posts_select_auth" on public.posts;
drop policy if exists "posts_insert_own" on public.posts;
drop policy if exists "posts_update_own" on public.posts;
drop policy if exists "posts_delete_own" on public.posts;

create policy "posts_select_auth"
  on public.posts
  for select
  to authenticated
  using (true);

create policy "posts_insert_own"
  on public.posts
  for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "posts_update_own"
  on public.posts
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "posts_delete_own"
  on public.posts
  for delete
  to authenticated
  using (author_id = auth.uid());

-- APPLICATIONS: colonna club_id e policy simmetriche per atleta e club owner
alter table if exists public.applications add column if not exists club_id uuid;

update public.applications a
set club_id = coalesce(o.owner_id, o.created_by)
from public.opportunities o
where a.opportunity_id = o.id
  and a.club_id is null;

create index if not exists idx_applications_owner_lookup on public.applications(club_id, opportunity_id);

alter table if exists public.applications enable row level security;
alter table if exists public.applications force row level security;

drop policy if exists "applications_select_club_or_athlete" on public.applications;
drop policy if exists "applications_insert_only_athlete" on public.applications;
drop policy if exists "applications_update_club_or_athlete" on public.applications;
drop policy if exists "applications_delete_club_or_athlete" on public.applications;

drop policy if exists "applications_select_auth" on public.applications;
drop policy if exists "applications_insert_athlete" on public.applications;
drop policy if exists "applications_update_owner" on public.applications;
drop policy if exists "applications_delete_owner" on public.applications;

create policy "applications_select_club_or_athlete"
  on public.applications
  for select
  to authenticated
  using (
    athlete_id = auth.uid()
    or club_id = auth.uid()
  );

create policy "applications_insert_only_athlete"
  on public.applications
  for insert
  to authenticated
  with check (
    athlete_id = auth.uid()
  );

create policy "applications_update_club_or_athlete"
  on public.applications
  for update
  to authenticated
  using (
    athlete_id = auth.uid()
    or club_id = auth.uid()
  )
  with check (
    athlete_id = auth.uid()
    or club_id = auth.uid()
  );

create policy "applications_delete_club_or_athlete"
  on public.applications
  for delete
  to authenticated
  using (
    athlete_id = auth.uid()
    or club_id = auth.uid()
  );

-- STORAGE: abilita bucket e policy per posts/avatars
insert into storage.buckets (id, name, public)
select 'posts', 'posts', true
where not exists (select 1 from storage.buckets where id = 'posts');

insert into storage.buckets (id, name, public)
select 'avatars', 'avatars', true
where not exists (select 1 from storage.buckets where id = 'avatars');

drop policy if exists "posts_read_public" on storage.objects;
drop policy if exists "posts_upload_own" on storage.objects;
drop policy if exists "posts_update_own" on storage.objects;
drop policy if exists "posts_delete_own" on storage.objects;

drop policy if exists "avatars_read_public" on storage.objects;
drop policy if exists "avatars_upload_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

create policy "posts_read_public"
  on storage.objects
  for select
  using (bucket_id = 'posts');

create policy "posts_upload_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'posts'
    and position(auth.uid()::text || '/' in name) = 1
  );

create policy "posts_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'posts'
    and position(auth.uid()::text || '/' in name) = 1
  );

create policy "posts_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'posts'
    and position(auth.uid()::text || '/' in name) = 1
  );

create policy "avatars_read_public"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "avatars_upload_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and position(auth.uid()::text || '/' in name) = 1
  );

create policy "avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and position(auth.uid()::text || '/' in name) = 1
  );

create policy "avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and position(auth.uid()::text || '/' in name) = 1
  );

commit;
