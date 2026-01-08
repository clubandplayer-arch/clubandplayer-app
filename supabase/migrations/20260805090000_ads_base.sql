begin;

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft',
  priority int not null default 0,
  daily_cap int,
  total_cap int,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.ad_campaigns
  drop constraint if exists ad_campaigns_status_check;

alter table if exists public.ad_campaigns
  add constraint ad_campaigns_status_check
  check (status in ('draft', 'active', 'paused', 'archived'));

create table if not exists public.ad_targets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  country text,
  region text,
  city text,
  sport text,
  audience text,
  device text,
  created_at timestamptz not null default now()
);

create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  slot text not null,
  title text,
  body text,
  image_url text,
  target_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  creative_id uuid references public.ad_creatives(id) on delete set null,
  event_type text not null,
  slot text,
  page text,
  user_id uuid references auth.users(id) on delete set null,
  country text,
  region text,
  city text,
  device text,
  created_at timestamptz not null default now()
);

alter table if exists public.ad_events
  drop constraint if exists ad_events_type_check;

alter table if exists public.ad_events
  add constraint ad_events_type_check
  check (event_type in ('impression', 'click'));

alter table if exists public.ad_campaigns enable row level security;
alter table if exists public.ad_targets enable row level security;
alter table if exists public.ad_creatives enable row level security;
alter table if exists public.ad_events enable row level security;

-- Admin-only policies

drop policy if exists ad_campaigns_admin_select on public.ad_campaigns;
create policy ad_campaigns_admin_select on public.ad_campaigns
  for select
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists ad_campaigns_admin_insert on public.ad_campaigns;
create policy ad_campaigns_admin_insert on public.ad_campaigns
  for insert
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists ad_campaigns_admin_update on public.ad_campaigns;
create policy ad_campaigns_admin_update on public.ad_campaigns
  for update
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
  with check (true);

drop policy if exists ad_campaigns_admin_delete on public.ad_campaigns;
create policy ad_campaigns_admin_delete on public.ad_campaigns
  for delete
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists ad_targets_admin_select on public.ad_targets;
create policy ad_targets_admin_select on public.ad_targets
  for select
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists ad_targets_admin_insert on public.ad_targets;
create policy ad_targets_admin_insert on public.ad_targets
  for insert
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists ad_targets_admin_update on public.ad_targets;
create policy ad_targets_admin_update on public.ad_targets
  for update
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
  with check (true);

drop policy if exists ad_targets_admin_delete on public.ad_targets;
create policy ad_targets_admin_delete on public.ad_targets
  for delete
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists ad_creatives_admin_select on public.ad_creatives;
create policy ad_creatives_admin_select on public.ad_creatives
  for select
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists ad_creatives_admin_insert on public.ad_creatives;
create policy ad_creatives_admin_insert on public.ad_creatives
  for insert
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists ad_creatives_admin_update on public.ad_creatives;
create policy ad_creatives_admin_update on public.ad_creatives
  for update
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
  with check (true);

drop policy if exists ad_creatives_admin_delete on public.ad_creatives;
create policy ad_creatives_admin_delete on public.ad_creatives
  for delete
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists ad_events_admin_select on public.ad_events;
create policy ad_events_admin_select on public.ad_events
  for select
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists ad_events_admin_insert on public.ad_events;
create policy ad_events_admin_insert on public.ad_events
  for insert
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

commit;
