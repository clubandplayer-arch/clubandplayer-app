begin;

-- Phase 3C-A is additive: existing profiles remain valid without canonical geography.
alter table public.profile_preferences
  add column if not exists residence_geo_area_id uuid;

alter table public.profile_preferences
  drop constraint if exists profile_preferences_residence_geo_area_fk,
  add constraint profile_preferences_residence_geo_area_fk
    foreign key (residence_geo_area_id)
    references public.geo_areas(id)
    on delete restrict,
  drop constraint if exists profile_preferences_residence_geo_country_required_check,
  add constraint profile_preferences_residence_geo_country_required_check
    check (residence_geo_area_id is null or residence_country_id is not null),
  drop constraint if exists profile_preferences_residence_geo_country_fk,
  add constraint profile_preferences_residence_geo_country_fk
    foreign key (residence_geo_area_id, residence_country_id)
    references public.geo_areas(id, country_id)
    on delete restrict;

create index if not exists profile_preferences_residence_geo_area_idx
  on public.profile_preferences (residence_geo_area_id);

create table if not exists public.profile_geo_area_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  geo_area_id uuid not null references public.geo_areas(id) on delete restrict,
  priority integer,
  created_at timestamptz not null default now(),
  primary key (profile_id, geo_area_id),
  constraint profile_geo_area_interests_priority_check check (priority is null or priority >= 0)
);

create index if not exists profile_geo_area_interests_profile_idx
  on public.profile_geo_area_interests (profile_id);
create index if not exists profile_geo_area_interests_geo_area_idx
  on public.profile_geo_area_interests (geo_area_id);
create index if not exists profile_geo_area_interests_profile_priority_idx
  on public.profile_geo_area_interests (profile_id, priority);

alter table public.profile_geo_area_interests enable row level security;

drop policy if exists profile_geo_area_interests_select_own_or_admin on public.profile_geo_area_interests;
create policy profile_geo_area_interests_select_own_or_admin
  on public.profile_geo_area_interests for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = profile_geo_area_interests.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );

drop policy if exists profile_geo_area_interests_insert_own_or_admin on public.profile_geo_area_interests;
create policy profile_geo_area_interests_insert_own_or_admin
  on public.profile_geo_area_interests for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = profile_geo_area_interests.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );

drop policy if exists profile_geo_area_interests_update_own_or_admin on public.profile_geo_area_interests;
create policy profile_geo_area_interests_update_own_or_admin
  on public.profile_geo_area_interests for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = profile_geo_area_interests.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = profile_geo_area_interests.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );

drop policy if exists profile_geo_area_interests_delete_own_or_admin on public.profile_geo_area_interests;
create policy profile_geo_area_interests_delete_own_or_admin
  on public.profile_geo_area_interests for delete to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = profile_geo_area_interests.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );

-- Intentionally no data mutation or backfill in Phase 3C-A.
commit;
