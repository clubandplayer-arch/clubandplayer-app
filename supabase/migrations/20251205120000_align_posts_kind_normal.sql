-- Allinea la colonna kind di public.posts ai valori 'normal'|'event'
-- e imposta default/indice coerenti con la constraint applicata in Supabase.

alter table public.posts drop constraint if exists posts_kind_check;

update public.posts
set kind = 'normal'
where kind is null or kind = 'post';

alter table public.posts
  alter column kind set default 'normal',
  add constraint posts_kind_check check (kind in ('normal', 'event'));

create index if not exists posts_kind_created_at_idx on public.posts(kind, created_at desc);
