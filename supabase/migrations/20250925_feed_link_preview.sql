-- Feed link preview metadata
begin;

alter table if exists public.posts add column if not exists link_url text;
alter table if exists public.posts add column if not exists link_title text;
alter table if exists public.posts add column if not exists link_description text;
alter table if exists public.posts add column if not exists link_image text;

commit;
