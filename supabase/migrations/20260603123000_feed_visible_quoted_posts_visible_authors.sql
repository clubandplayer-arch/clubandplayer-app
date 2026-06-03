-- Make repost quote hydration independent from the original author's visibility.
-- The feed API passes the visible repost authors (user ids and profile ids) so
-- quoted posts can be returned when they are referenced by a visible repost,
-- including reposts of posts authored by admin/system profiles.

create or replace function public.feed_visible_quoted_posts(
  quoted_ids uuid[],
  visible_author_ids uuid[] default array[]::uuid[]
)
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
          or repost.author_id = any(visible_author_ids)
          or exists (
            select 1
            from public.profiles repost_author
            join public.follows f
              on f.target_profile_id = repost_author.id
            join public.profiles viewer_profile
              on viewer_profile.id = f.follower_profile_id
            where (repost_author.user_id = repost.author_id or repost_author.id = repost.author_id)
              and viewer_profile.user_id = auth.uid()
          )
        )
    );
$$;

revoke all on function public.feed_visible_quoted_posts(uuid[], uuid[]) from public;
grant execute on function public.feed_visible_quoted_posts(uuid[], uuid[]) to authenticated;
