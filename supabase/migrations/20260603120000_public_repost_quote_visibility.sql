-- Ensure reposts can always render their original/quoted post for every authenticated viewer.
--
-- Reposts store only public.posts.quoted_post_id. If a SELECT policy restricts the
-- quoted/original row to followed authors or the current author, the feed can still
-- return the repost itself but cannot hydrate quoted_post, causing the UI fallback
-- "Questo post non è più disponibile". Keep writes author-owned, but make post and
-- post_media reads globally available to authenticated Club, Player, Staff, and Fan
-- accounts.

begin;

alter table if exists public.posts enable row level security;
alter table if exists public.posts force row level security;

-- Recreate the historical broad read policy and add a dedicated policy name so this
-- remains effective even if another migration/environment has a narrower select
-- policy with a different name.
drop policy if exists "posts_select_auth" on public.posts;
create policy "posts_select_auth"
  on public.posts
  for select
  to authenticated
  using (true);

drop policy if exists "posts_select_all_authenticated_for_reposts" on public.posts;
create policy "posts_select_all_authenticated_for_reposts"
  on public.posts
  for select
  to authenticated
  using (true);

-- Quoted posts may use the multi-media table. Keep media reads aligned with post
-- reads so quoted_post cards can render media for originals from any public author.
do $$
begin
  if to_regclass('public.post_media') is not null then
    alter table public.post_media enable row level security;
    alter table public.post_media force row level security;

    drop policy if exists "post_media_select_auth" on public.post_media;
    create policy "post_media_select_auth"
      on public.post_media
      for select
      to authenticated
      using (true);

    drop policy if exists "post_media_select_all_authenticated_for_reposts" on public.post_media;
    create policy "post_media_select_all_authenticated_for_reposts"
      on public.post_media
      for select
      to authenticated
      using (true);
  end if;
end $$;

commit;
