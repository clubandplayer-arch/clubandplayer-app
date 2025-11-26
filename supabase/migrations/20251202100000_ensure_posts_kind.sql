-- Ensure posts.kind exists for normal posts and events
begin;

alter table if exists public.posts
  add column if not exists kind text,
  add column if not exists event_payload jsonb;

-- backfill existing rows
update public.posts set kind = coalesce(kind, 'post');

alter table if exists public.posts
  alter column kind set default 'post';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_kind_check'
  ) then
    alter table public.posts
      add constraint posts_kind_check check (kind in ('post', 'event'));
  end if;
end;
$$;

create index if not exists posts_kind_created_at_idx on public.posts(kind, created_at desc);

commit;
