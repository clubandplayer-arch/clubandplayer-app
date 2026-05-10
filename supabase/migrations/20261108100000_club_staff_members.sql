begin;

create table if not exists public.club_staff_members (
  id uuid primary key default gen_random_uuid(),
  club_profile_id uuid not null references public.profiles (id) on delete cascade,
  staff_profile_id uuid not null references public.profiles (id) on delete cascade,
  staff_role text null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid null references auth.users (id) on delete set null,
  constraint club_staff_members_unique_club_staff unique (club_profile_id, staff_profile_id),
  constraint club_staff_members_status_check check (status in ('active', 'inactive'))
);

create index if not exists idx_club_staff_members_club_profile_id on public.club_staff_members (club_profile_id);
create index if not exists idx_club_staff_members_staff_profile_id on public.club_staff_members (staff_profile_id);
create index if not exists idx_club_staff_members_status on public.club_staff_members (status);

alter table public.club_staff_members enable row level security;
alter table public.club_staff_members force row level security;

drop policy if exists "club_staff_select_active_public" on public.club_staff_members;
drop policy if exists "club_staff_insert_own" on public.club_staff_members;
drop policy if exists "club_staff_update_own" on public.club_staff_members;
drop policy if exists "club_staff_delete_own" on public.club_staff_members;
drop policy if exists "club_staff_service_full" on public.club_staff_members;

create policy "club_staff_select_active_public"
  on public.club_staff_members
  for select
  to public
  using (status = 'active');

create policy "club_staff_insert_own"
  on public.club_staff_members
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = club_profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "club_staff_update_own"
  on public.club_staff_members
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = club_profile_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = club_profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "club_staff_delete_own"
  on public.club_staff_members
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = club_profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "club_staff_service_full"
  on public.club_staff_members
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.set_club_staff_created_by()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_club_staff_set_created_by on public.club_staff_members;
create trigger trg_club_staff_set_created_by
before insert on public.club_staff_members
for each row
execute function public.set_club_staff_created_by();

commit;
