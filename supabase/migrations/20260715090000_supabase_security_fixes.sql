-- Strengthen public.athletes_view and feed_posts RLS
begin;

-- Ensure the athletes_view runs as security invoker so it does not bypass RLS
alter view if exists public.athletes_view set (security_invoker = true);

-- Enable RLS on feed_posts with safe defaults for authenticated users and service role
alter table if exists public.feed_posts enable row level security;
alter table if exists public.feed_posts force row level security;

drop policy if exists "feed_posts_select_auth" on public.feed_posts;
drop policy if exists "feed_posts_service_full" on public.feed_posts;

create policy "feed_posts_select_auth"
  on public.feed_posts
  for select
  to authenticated
  using (true);

create policy "feed_posts_service_full"
  on public.feed_posts
  for all
  to service_role
  using (true)
  with check (true);

commit;
