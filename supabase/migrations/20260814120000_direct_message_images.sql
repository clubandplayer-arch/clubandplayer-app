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

drop policy if exists "direct message images upload own" on storage.objects;
create policy "direct message images upload own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'direct-message-images'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "direct message images read participant" on storage.objects;
create policy "direct message images read participant"
on storage.objects for select to authenticated
using (
  bucket_id = 'direct-message-images'
  and exists (
    select 1
    from public.direct_messages dm
    join public.profiles p
      on p.id in (dm.sender_profile_id, dm.recipient_profile_id)
    where dm.attachment_path = name
      and p.user_id = auth.uid()
      and dm.deleted_at is null
  )
);

drop policy if exists "direct message images delete own" on storage.objects;
create policy "direct message images delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'direct-message-images'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.id::text = (storage.foldername(name))[1]
  )
);
