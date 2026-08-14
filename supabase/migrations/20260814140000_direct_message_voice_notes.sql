alter table public.direct_messages add column if not exists voice_path text;
alter table public.direct_messages add column if not exists voice_mime_type text;

alter table public.direct_messages drop constraint if exists direct_messages_content_or_attachment_check;
alter table public.direct_messages add constraint direct_messages_content_or_attachment_check
check (nullif(btrim(content), '') is not null or attachment_path is not null or voice_path is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('direct-message-audio', 'direct-message-audio', false, 5000000,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "direct message audio upload own" on storage.objects;
create policy "direct message audio upload own" on storage.objects for insert to authenticated
with check (bucket_id = 'direct-message-audio' and exists (
  select 1 from public.profiles p where p.user_id = auth.uid()
  and p.id::text = (storage.foldername(name))[1]
));

drop policy if exists "direct message audio read participant" on storage.objects;
create policy "direct message audio read participant" on storage.objects for select to authenticated
using (bucket_id = 'direct-message-audio' and exists (
  select 1 from public.direct_messages dm join public.profiles p
  on p.id in (dm.sender_profile_id, dm.recipient_profile_id)
  where dm.voice_path = name and p.user_id = auth.uid() and dm.deleted_at is null
));

drop policy if exists "direct message audio delete own" on storage.objects;
create policy "direct message audio delete own" on storage.objects for delete to authenticated
using (bucket_id = 'direct-message-audio' and exists (
  select 1 from public.profiles p where p.user_id = auth.uid()
  and p.id::text = (storage.foldername(name))[1]
));
