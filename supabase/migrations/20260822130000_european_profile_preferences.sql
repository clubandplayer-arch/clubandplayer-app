begin;

-- Phase 2A is additive and safe for clients that only know the legacy profile
-- columns. No legacy row is updated and no existing table is altered.
create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  native_name text not null,
  is_supported boolean not null default false,
  is_active boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint languages_code_format_check check (code ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$')
);

create unique index if not exists languages_code_key on public.languages (code);
create index if not exists languages_active_order_idx
  on public.languages (is_active, is_supported, display_order);

create table if not exists public.profile_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_language_id uuid references public.languages(id) on delete set null,
  residence_country_id uuid references public.countries(id) on delete restrict,
  open_to_relocation boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_preferences_language_idx
  on public.profile_preferences (preferred_language_id);
create index if not exists profile_preferences_residence_country_idx
  on public.profile_preferences (residence_country_id);
create index if not exists profile_preferences_relocation_idx
  on public.profile_preferences (open_to_relocation)
  where open_to_relocation = true;

create table if not exists public.profile_country_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  priority integer,
  created_at timestamptz not null default now(),
  primary key (profile_id, country_id),
  constraint profile_country_interests_priority_check check (priority is null or priority >= 0)
);

create index if not exists profile_country_interests_country_idx
  on public.profile_country_interests (country_id);
create index if not exists profile_country_interests_profile_priority_idx
  on public.profile_country_interests (profile_id, priority);

alter table public.languages enable row level security;
alter table public.profile_preferences enable row level security;
alter table public.profile_country_interests enable row level security;

drop policy if exists languages_catalog_read on public.languages;
create policy languages_catalog_read
  on public.languages for select to anon, authenticated using (true);

drop policy if exists languages_admin_insert on public.languages;
create policy languages_admin_insert
  on public.languages for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );
drop policy if exists languages_admin_update on public.languages;
create policy languages_admin_update
  on public.languages for update to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));
drop policy if exists languages_admin_delete on public.languages;
create policy languages_admin_delete
  on public.languages for delete to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists profile_preferences_select_own_or_admin on public.profile_preferences;
create policy profile_preferences_select_own_or_admin
  on public.profile_preferences for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = profile_preferences.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );
drop policy if exists profile_preferences_insert_own_or_admin on public.profile_preferences;
create policy profile_preferences_insert_own_or_admin
  on public.profile_preferences for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = profile_preferences.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );
drop policy if exists profile_preferences_update_own_or_admin on public.profile_preferences;
create policy profile_preferences_update_own_or_admin
  on public.profile_preferences for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = profile_preferences.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = profile_preferences.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );
drop policy if exists profile_preferences_delete_own_or_admin on public.profile_preferences;
create policy profile_preferences_delete_own_or_admin
  on public.profile_preferences for delete to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = profile_preferences.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );

drop policy if exists profile_country_interests_select_own_or_admin on public.profile_country_interests;
create policy profile_country_interests_select_own_or_admin
  on public.profile_country_interests for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = profile_country_interests.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );
drop policy if exists profile_country_interests_insert_own_or_admin on public.profile_country_interests;
create policy profile_country_interests_insert_own_or_admin
  on public.profile_country_interests for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = profile_country_interests.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );
drop policy if exists profile_country_interests_update_own_or_admin on public.profile_country_interests;
create policy profile_country_interests_update_own_or_admin
  on public.profile_country_interests for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = profile_country_interests.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = profile_country_interests.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );
drop policy if exists profile_country_interests_delete_own_or_admin on public.profile_country_interests;
create policy profile_country_interests_delete_own_or_admin
  on public.profile_country_interests for delete to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = profile_country_interests.profile_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
  );

insert into public.languages
  (code, name, native_name, is_supported, is_active, display_order)
values
  ('it', 'Italian', 'Italiano', true, true, 10),
  ('en', 'English', 'English', true, true, 20),
  ('fr', 'French', 'Français', true, true, 30),
  ('es', 'Spanish', 'Español', true, true, 40),
  ('pt', 'Portuguese', 'Português', false, false, 50),
  ('de', 'German', 'Deutsch', false, false, 60)
on conflict (code) do update set
  name = excluded.name,
  native_name = excluded.native_name,
  is_supported = excluded.is_supported,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

commit;
