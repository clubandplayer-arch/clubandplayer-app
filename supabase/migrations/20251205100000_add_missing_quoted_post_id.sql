-- Ensure posts table supports quoted posts
alter table public.posts
  add column if not exists quoted_post_id uuid references public.posts(id) on delete set null;

create index if not exists posts_quoted_post_id_idx
  on public.posts (quoted_post_id);
