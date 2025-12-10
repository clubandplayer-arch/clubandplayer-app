alter table public.direct_messages
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists edited_by uuid references public.profiles(id) on delete set null;

drop policy if exists "direct_messages_update_own" on public.direct_messages;

create policy "direct_messages_update_own"
  on public.direct_messages
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = sender_profile_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = sender_profile_id
        and p.user_id = auth.uid()
    )
  );
