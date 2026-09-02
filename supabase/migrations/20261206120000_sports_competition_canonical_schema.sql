begin;

-- Phase 5C is structural and additive. It creates empty catalogues and nullable
-- references only. It never infers, translates or backfills user data.
create unique index if not exists sport_disciplines_id_sport_key
  on public.sport_disciplines (id, sport_id);
create unique index if not exists sport_variants_id_discipline_key
  on public.sport_variants (id, discipline_id);

create table if not exists public.sports_organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  canonical_name text not null,
  country_id uuid references public.countries(id) on delete restrict,
  parent_id uuid references public.sports_organizations(id) on delete restrict,
  organization_type text not null,
  territorial_scope text not null,
  source_provider text,
  source_record_id text,
  source_license text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_organizations_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint sports_organizations_name_check check (btrim(canonical_name) <> ''),
  constraint sports_organizations_not_self_parent_check check (parent_id is null or parent_id <> id),
  constraint sports_organizations_scope_check check (territorial_scope in ('GLOBAL', 'CONTINENTAL', 'NATIONAL', 'SUBNATIONAL', 'LOCAL')),
  constraint sports_organizations_source_pair_check check (
    (source_provider is null and source_record_id is null)
    or (source_provider is not null and source_record_id is not null)
  ),
  constraint sports_organizations_code_key unique (code)
);
create unique index if not exists sports_organizations_source_key
  on public.sports_organizations (source_provider, source_record_id)
  where source_provider is not null and source_record_id is not null;
create index if not exists sports_organizations_country_idx on public.sports_organizations (country_id);
create index if not exists sports_organizations_parent_idx on public.sports_organizations (parent_id);

create table if not exists public.sports_organization_sports (
  organization_id uuid not null references public.sports_organizations(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (organization_id, sport_id)
);
create index if not exists sports_organization_sports_sport_idx
  on public.sports_organization_sports (sport_id);

create table if not exists public.player_roles (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete restrict,
  code text not null,
  canonical_name text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_roles_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint player_roles_name_check check (btrim(canonical_name) <> ''),
  constraint player_roles_sport_code_key unique (sport_id, code),
  constraint player_roles_id_sport_key unique (id, sport_id)
);
create index if not exists player_roles_sport_active_idx on public.player_roles (sport_id, is_active, display_order);

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  canonical_name text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_roles_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint staff_roles_name_check check (btrim(canonical_name) <> '')
);

create table if not exists public.age_classes (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid references public.sports(id) on delete restrict,
  country_id uuid references public.countries(id) on delete restrict,
  code text not null,
  canonical_name text not null,
  min_age smallint,
  max_age smallint,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint age_classes_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint age_classes_age_check check (
    (min_age is null or min_age >= 0) and (max_age is null or max_age >= 0)
    and (min_age is null or max_age is null or min_age <= max_age)
  )
);
create unique index if not exists age_classes_scope_code_key
  on public.age_classes (coalesce(sport_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(country_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

create table if not exists public.gender_classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  canonical_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gender_classes_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint gender_classes_name_check check (btrim(canonical_name) <> '')
);

create table if not exists public.competition_formats (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  canonical_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_formats_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint competition_formats_name_check check (btrim(canonical_name) <> '')
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.sports_organizations(id) on delete restrict,
  sport_id uuid not null references public.sports(id) on delete restrict,
  discipline_id uuid,
  variant_id uuid,
  country_id uuid references public.countries(id) on delete restrict,
  code text not null,
  canonical_name text not null,
  territorial_scope text not null,
  source_provider text,
  source_record_id text,
  source_license text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competitions_discipline_requires_sport_check check (discipline_id is null or sport_id is not null),
  constraint competitions_variant_requires_discipline_check check (variant_id is null or discipline_id is not null),
  constraint competitions_discipline_sport_fk foreign key (discipline_id, sport_id)
    references public.sport_disciplines(id, sport_id) on delete restrict,
  constraint competitions_variant_discipline_fk foreign key (variant_id, discipline_id)
    references public.sport_variants(id, discipline_id) on delete restrict,
  constraint competitions_organization_sport_fk foreign key (organization_id, sport_id)
    references public.sports_organization_sports(organization_id, sport_id) on delete restrict,
  constraint competitions_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint competitions_name_check check (btrim(canonical_name) <> ''),
  constraint competitions_scope_check check (territorial_scope in ('GLOBAL', 'CONTINENTAL', 'NATIONAL', 'SUBNATIONAL', 'LOCAL')),
  constraint competitions_source_pair_check check (
    (source_provider is null and source_record_id is null)
    or (source_provider is not null and source_record_id is not null)
  ),
  constraint competitions_organization_code_key unique (organization_id, code)
);
create unique index if not exists competitions_source_key
  on public.competitions (source_provider, source_record_id)
  where source_provider is not null and source_record_id is not null;
create index if not exists competitions_sport_idx on public.competitions (sport_id, is_active);
create index if not exists competitions_country_idx on public.competitions (country_id);

create table if not exists public.competition_levels (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  code text not null,
  canonical_name text not null,
  rank smallint,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_levels_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint competition_levels_rank_check check (rank is null or rank > 0),
  constraint competition_levels_competition_code_key unique (competition_id, code),
  constraint competition_levels_id_competition_key unique (id, competition_id)
);

create table if not exists public.competition_seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  code text not null,
  display_label text not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_seasons_dates_check check (starts_on <= ends_on),
  constraint competition_seasons_code_check check (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  constraint competition_seasons_label_check check (btrim(display_label) <> ''),
  constraint competition_seasons_competition_code_key unique (competition_id, code),
  constraint competition_seasons_id_competition_key unique (id, competition_id)
);
create index if not exists competition_seasons_dates_idx on public.competition_seasons (starts_on, ends_on);

create table if not exists public.competition_groups (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  season_id uuid not null,
  competition_level_id uuid,
  geo_area_id uuid references public.geo_areas(id) on delete restrict,
  code text not null,
  canonical_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_groups_season_competition_fk foreign key (season_id, competition_id)
    references public.competition_seasons(id, competition_id) on delete cascade,
  constraint competition_groups_level_competition_fk foreign key (competition_level_id, competition_id)
    references public.competition_levels(id, competition_id) on delete restrict,
  constraint competition_groups_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint competition_groups_name_check check (btrim(canonical_name) <> ''),
  constraint competition_groups_season_code_key unique (season_id, code)
);
create index if not exists competition_groups_geo_area_idx on public.competition_groups (geo_area_id);

create table if not exists public.profile_sports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete restrict,
  discipline_id uuid,
  variant_id uuid,
  player_role_id uuid,
  staff_role_id uuid references public.staff_roles(id) on delete restrict,
  is_primary boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_sports_discipline_sport_fk foreign key (discipline_id, sport_id)
    references public.sport_disciplines(id, sport_id) on delete restrict,
  constraint profile_sports_variant_discipline_fk foreign key (variant_id, discipline_id)
    references public.sport_variants(id, discipline_id) on delete restrict,
  constraint profile_sports_player_role_sport_fk foreign key (player_role_id, sport_id)
    references public.player_roles(id, sport_id) on delete restrict,
  constraint profile_sports_variant_requires_discipline_check check (variant_id is null or discipline_id is not null),
  constraint profile_sports_role_kind_check check (player_role_id is null or staff_role_id is null)
);
create unique index if not exists profile_sports_one_primary_idx on public.profile_sports (profile_id) where is_primary;
create index if not exists profile_sports_profile_order_idx on public.profile_sports (profile_id, display_order);
create index if not exists profile_sports_sport_idx on public.profile_sports (sport_id);

-- Nullable canonical references preserve all existing rows and payloads.
alter table public.athlete_experiences
  add column if not exists sport_id uuid references public.sports(id) on delete restrict,
  add column if not exists discipline_id uuid references public.sport_disciplines(id) on delete restrict,
  add column if not exists variant_id uuid references public.sport_variants(id) on delete restrict,
  add column if not exists player_role_id uuid references public.player_roles(id) on delete restrict,
  add column if not exists competition_id uuid references public.competitions(id) on delete restrict,
  add column if not exists competition_level_id uuid references public.competition_levels(id) on delete restrict,
  add column if not exists age_class_id uuid references public.age_classes(id) on delete restrict,
  add column if not exists season_id uuid references public.competition_seasons(id) on delete restrict;

alter table public.athlete_experiences
  drop constraint if exists athlete_experiences_discipline_sport_fk,
  add constraint athlete_experiences_discipline_sport_fk foreign key (discipline_id, sport_id)
    references public.sport_disciplines(id, sport_id) on delete restrict,
  drop constraint if exists athlete_experiences_variant_discipline_fk,
  add constraint athlete_experiences_variant_discipline_fk foreign key (variant_id, discipline_id)
    references public.sport_variants(id, discipline_id) on delete restrict,
  drop constraint if exists athlete_experiences_player_role_sport_fk,
  add constraint athlete_experiences_player_role_sport_fk foreign key (player_role_id, sport_id)
    references public.player_roles(id, sport_id) on delete restrict,
  drop constraint if exists athlete_experiences_variant_parent_check,
  add constraint athlete_experiences_variant_parent_check check (variant_id is null or discipline_id is not null);

alter table public.opportunities
  add column if not exists sport_id uuid references public.sports(id) on delete restrict,
  add column if not exists discipline_id uuid references public.sport_disciplines(id) on delete restrict,
  add column if not exists variant_id uuid references public.sport_variants(id) on delete restrict,
  add column if not exists player_role_id uuid references public.player_roles(id) on delete restrict,
  add column if not exists staff_role_id uuid references public.staff_roles(id) on delete restrict,
  add column if not exists sports_organization_id uuid references public.sports_organizations(id) on delete restrict,
  add column if not exists competition_id uuid references public.competitions(id) on delete restrict,
  add column if not exists competition_level_id uuid references public.competition_levels(id) on delete restrict,
  add column if not exists age_class_id uuid references public.age_classes(id) on delete restrict,
  add column if not exists gender_class_id uuid references public.gender_classes(id) on delete restrict,
  add column if not exists season_id uuid references public.competition_seasons(id) on delete restrict,
  add column if not exists competition_format_id uuid references public.competition_formats(id) on delete restrict;

alter table public.opportunities
  drop constraint if exists opportunities_discipline_sport_fk,
  add constraint opportunities_discipline_sport_fk foreign key (discipline_id, sport_id)
    references public.sport_disciplines(id, sport_id) on delete restrict,
  drop constraint if exists opportunities_variant_discipline_fk,
  add constraint opportunities_variant_discipline_fk foreign key (variant_id, discipline_id)
    references public.sport_variants(id, discipline_id) on delete restrict,
  drop constraint if exists opportunities_player_role_sport_fk,
  add constraint opportunities_player_role_sport_fk foreign key (player_role_id, sport_id)
    references public.player_roles(id, sport_id) on delete restrict,
  drop constraint if exists opportunities_variant_parent_check,
  add constraint opportunities_variant_parent_check check (variant_id is null or discipline_id is not null),
  drop constraint if exists opportunities_role_kind_check,
  add constraint opportunities_role_kind_check check (player_role_id is null or staff_role_id is null);

create index if not exists athlete_experiences_sport_id_idx on public.athlete_experiences (sport_id);
create index if not exists athlete_experiences_competition_id_idx on public.athlete_experiences (competition_id);
create index if not exists opportunities_sport_id_idx on public.opportunities (sport_id);
create index if not exists opportunities_competition_id_idx on public.opportunities (competition_id);

-- Empty reference catalogues are public-readable and admin-managed. Explicit
-- grants prevent the generic Data API grant from making catalogue writes broad.
do $$
declare
  catalog_table text;
begin
  foreach catalog_table in array array[
    'sports_organizations', 'sports_organization_sports', 'player_roles', 'staff_roles',
    'age_classes', 'gender_classes', 'competition_formats', 'competitions',
    'competition_levels', 'competition_seasons', 'competition_groups'
  ] loop
    execute format('alter table public.%I enable row level security', catalog_table);
    execute format('drop policy if exists %I on public.%I', catalog_table || '_catalog_read', catalog_table);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', catalog_table || '_catalog_read', catalog_table);
    execute format('drop policy if exists %I on public.%I', catalog_table || '_admin_all', catalog_table);
    execute format(
      'create policy %I on public.%I for all to authenticated using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)) with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))',
      catalog_table || '_admin_all', catalog_table
    );
    execute format('revoke insert, update, delete on table public.%I from anon', catalog_table);
    execute format('grant select on table public.%I to anon, authenticated', catalog_table);
    execute format('grant insert, update, delete on table public.%I to authenticated', catalog_table);
    execute format('grant select, insert, update, delete on table public.%I to service_role', catalog_table);
  end loop;
end
$$;

alter table public.profile_sports enable row level security;
drop policy if exists profile_sports_owner_admin_select on public.profile_sports;
create policy profile_sports_owner_admin_select on public.profile_sports for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = profile_id and (p.user_id = auth.uid() or p.is_admin = true))
);
drop policy if exists profile_sports_owner_admin_insert on public.profile_sports;
create policy profile_sports_owner_admin_insert on public.profile_sports for insert to authenticated with check (
  exists (select 1 from public.profiles p where p.id = profile_id and (p.user_id = auth.uid() or p.is_admin = true))
);
drop policy if exists profile_sports_owner_admin_update on public.profile_sports;
create policy profile_sports_owner_admin_update on public.profile_sports for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = profile_id and (p.user_id = auth.uid() or p.is_admin = true))
) with check (
  exists (select 1 from public.profiles p where p.id = profile_id and (p.user_id = auth.uid() or p.is_admin = true))
);
drop policy if exists profile_sports_owner_admin_delete on public.profile_sports;
create policy profile_sports_owner_admin_delete on public.profile_sports for delete to authenticated using (
  exists (select 1 from public.profiles p where p.id = profile_id and (p.user_id = auth.uid() or p.is_admin = true))
);
revoke all on table public.profile_sports from anon;
grant select, insert, update, delete on table public.profile_sports to authenticated, service_role;

-- Existing profile, experience and Opportunity policies/ownership are unchanged.
-- Applications are deliberately untouched. No INSERT/UPDATE/DELETE targets user data.
commit;
