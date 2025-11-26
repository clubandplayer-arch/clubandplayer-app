-- Aggiunge supporto eventi nel feed tramite colonna kind e payload strutturato
begin;

alter table if exists public.posts add column if not exists kind text default 'post';
alter table if exists public.posts add column if not exists event_payload jsonb;

update public.posts set kind = coalesce(kind, 'post');

create index if not exists posts_kind_created_at_idx on public.posts(kind, created_at desc);

commit;
