alter table public.direct_messages
  add column if not exists attachment_path text;

alter table public.direct_messages
  alter column content drop not null;

alter table public.direct_messages
  drop constraint if exists direct_messages_content_or_attachment_check;

alter table public.direct_messages
  add constraint direct_messages_content_or_attachment_check
  check (nullif(btrim(content), '') is not null or attachment_path is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'direct-message-images',
  'direct-message-images',
  false,
  3145728,
  array['image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
