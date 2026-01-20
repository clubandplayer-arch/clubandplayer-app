begin;

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  resource_type text not null,
  resource_id uuid not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz
);

alter table if exists public.share_links
  drop constraint if exists share_links_resource_type_check;

alter table if exists public.share_links
  add constraint share_links_resource_type_check
  check (resource_type in ('post'));

create unique index if not exists share_links_token_key
  on public.share_links (token);

create index if not exists share_links_resource_idx
  on public.share_links (resource_type, resource_id);

create index if not exists share_links_created_by_idx
  on public.share_links (created_by);

alter table if exists public.share_links enable row level security;
alter table if exists public.share_links force row level security;

drop policy if exists "share_links_select_owner" on public.share_links;
create policy "share_links_select_owner"
  on public.share_links
  for select
  to authenticated
  using (created_by = auth.uid());

drop policy if exists "share_links_insert_owner" on public.share_links;
create policy "share_links_insert_owner"
  on public.share_links
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "share_links_update_owner" on public.share_links;
create policy "share_links_update_owner"
  on public.share_links
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "share_links_service_full" on public.share_links;
create policy "share_links_service_full"
  on public.share_links
  for all
  to service_role
  using (true)
  with check (true);

commit;
