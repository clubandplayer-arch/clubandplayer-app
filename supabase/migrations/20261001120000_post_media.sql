-- Add post_media table for mixed media posts
begin;

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_type text not null check (media_type in ('image','video')),
  url text not null,
  poster_url text null,
  width int null,
  height int null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists post_media_post_id_idx on public.post_media (post_id);
create unique index if not exists post_media_post_id_position_idx on public.post_media (post_id, position);

alter table public.post_media enable row level security;
alter table public.post_media force row level security;

drop policy if exists "post_media_select_auth" on public.post_media;
drop policy if exists "post_media_insert_own" on public.post_media;
drop policy if exists "post_media_update_own" on public.post_media;
drop policy if exists "post_media_delete_own" on public.post_media;

create policy "post_media_select_auth"
  on public.post_media
  for select
  to authenticated
  using (true);

create policy "post_media_insert_own"
  on public.post_media
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.posts
      where posts.id = post_media.post_id
        and posts.author_id = auth.uid()
    )
  );

create policy "post_media_update_own"
  on public.post_media
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.posts
      where posts.id = post_media.post_id
        and posts.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.posts
      where posts.id = post_media.post_id
        and posts.author_id = auth.uid()
    )
  );

create policy "post_media_delete_own"
  on public.post_media
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.posts
      where posts.id = post_media.post_id
        and posts.author_id = auth.uid()
    )
  );

commit;
