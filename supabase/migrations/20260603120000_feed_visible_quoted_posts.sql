-- Allow the feed API to hydrate quoted/original posts referenced by reposts that
-- are visible to the authenticated viewer, even when the original author is not
-- followed directly. The function is intentionally narrow: it only returns rows
-- whose id is requested and that are quoted by the viewer or by an author the
-- viewer follows.

alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists media_type text;
alter table public.posts add column if not exists media_aspect text;
alter table public.posts add column if not exists kind text;
alter table public.posts add column if not exists event_payload jsonb;
alter table public.posts add column if not exists link_url text;
alter table public.posts add column if not exists link_title text;
alter table public.posts add column if not exists link_description text;
alter table public.posts add column if not exists link_image text;
alter table public.posts add column if not exists quoted_post_id uuid references public.posts(id) on delete set null;

create index if not exists posts_quoted_post_id_idx on public.posts(quoted_post_id);

create or replace function public.feed_visible_quoted_posts(quoted_ids uuid[])
returns table (
  id uuid,
  author_id uuid,
  content text,
  created_at timestamptz,
  media_url text,
  media_type text,
  media_aspect text,
  kind text,
  event_payload jsonb,
  link_url text,
  link_title text,
  link_description text,
  link_image text,
  quoted_post_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.author_id,
    p.content,
    p.created_at,
    p.media_url,
    p.media_type,
    p.media_aspect,
    p.kind,
    p.event_payload,
    p.link_url,
    p.link_title,
    p.link_description,
    p.link_image,
    p.quoted_post_id
  from public.posts p
  where p.id = any(quoted_ids)
    and exists (
      select 1
      from public.posts repost
      where repost.quoted_post_id = p.id
        and (
          repost.author_id = auth.uid()
          or exists (
            select 1
            from public.profiles repost_author
            join public.follows f
              on f.target_profile_id = repost_author.id
            join public.profiles viewer_profile
              on viewer_profile.id = f.follower_profile_id
            where repost_author.user_id = repost.author_id
              and viewer_profile.user_id = auth.uid()
          )
        )
    );
$$;

revoke all on function public.feed_visible_quoted_posts(uuid[]) from public;
grant execute on function public.feed_visible_quoted_posts(uuid[]) to authenticated;
