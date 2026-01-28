begin;

create table if not exists public.ad_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  company text not null,
  email text not null,
  phone text,
  location text,
  budget text,
  message text not null,
  source text not null default 'sponsor',
  status text not null default 'new',
  notes text,
  profile_id uuid references public.profiles(id) on delete set null
);

create index if not exists idx_ad_leads_created_at_desc
  on public.ad_leads (created_at desc);

create index if not exists idx_ad_leads_status
  on public.ad_leads (status);

create index if not exists idx_ad_leads_company
  on public.ad_leads (company);

alter table if exists public.ad_leads enable row level security;

-- Admin-only policies

drop policy if exists ad_leads_admin_select on public.ad_leads;
create policy ad_leads_admin_select on public.ad_leads
  for select
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists ad_leads_admin_update on public.ad_leads;
create policy ad_leads_admin_update on public.ad_leads
  for update
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
  with check (true);

drop policy if exists ad_leads_admin_delete on public.ad_leads;
create policy ad_leads_admin_delete on public.ad_leads
  for delete
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

commit;
