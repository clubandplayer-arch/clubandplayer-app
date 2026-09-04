begin;

-- Phase 5C is schema-only: no catalogue seeds, user-data backfill, or changes to
-- profiles, athlete_experiences, opportunities, applications, ownership semantics.
-- Composite candidate keys make the existing sport -> discipline -> variant chain
-- available to downstream foreign keys without duplicating canonical identities.
create unique index if not exists sport_disciplines_id_sport_key
  on public.sport_disciplines (id, sport_id);
create unique index if not exists sport_variants_id_discipline_key
  on public.sport_variants (id, discipline_id);

create table if not exists public.player_positions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  canonical_name text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_positions_code_check check (code ~ '^[a-z][a-z0-9_]*$')
);

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  canonical_name text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_roles_code_check check (code ~ '^[a-z][a-z0-9_]*$')
);

create table if not exists public.player_position_applicability (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.player_positions(id) on delete restrict,
  sport_id uuid not null references public.sports(id) on delete restrict,
  discipline_id uuid,
  variant_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint player_position_applicability_scope_key
    unique nulls not distinct (position_id, sport_id, discipline_id, variant_id),
  constraint player_position_discipline_requires_sport_fk
    foreign key (discipline_id, sport_id) references public.sport_disciplines(id, sport_id) on delete restrict,
  constraint player_position_variant_requires_discipline_fk
    foreign key (variant_id, discipline_id) references public.sport_variants(id, discipline_id) on delete restrict,
  constraint player_position_scope_shape_check check (
    (discipline_id is not null or variant_id is null)
  )
);

create table if not exists public.staff_role_applicability (
  id uuid primary key default gen_random_uuid(),
  staff_role_id uuid not null references public.staff_roles(id) on delete restrict,
  sport_id uuid not null references public.sports(id) on delete restrict,
  discipline_id uuid,
  variant_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint staff_role_applicability_scope_key
    unique nulls not distinct (staff_role_id, sport_id, discipline_id, variant_id),
  constraint staff_role_discipline_requires_sport_fk
    foreign key (discipline_id, sport_id) references public.sport_disciplines(id, sport_id) on delete restrict,
  constraint staff_role_variant_requires_discipline_fk
    foreign key (variant_id, discipline_id) references public.sport_variants(id, discipline_id) on delete restrict,
  constraint staff_role_scope_shape_check check (
    (discipline_id is not null or variant_id is null)
  )
);

create table if not exists public.sports_organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  canonical_name text not null,
  organization_type text not null,
  parent_id uuid references public.sports_organizations(id) on delete restrict,
  primary_country_id uuid references public.countries(id) on delete restrict,
  provider text not null,
  source_record_id text not null,
  source_version text,
  source_metadata jsonb not null default '{}'::jsonb,
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_organizations_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint sports_organizations_type_check check (organization_type ~ '^[a-z][a-z0-9_]*$'),
  constraint sports_organizations_source_check check (btrim(provider) <> '' and btrim(source_record_id) <> ''),
  constraint sports_organizations_validity_check check (valid_to is null or valid_from is null or valid_to >= valid_from),
  constraint sports_organizations_not_self_parent check (parent_id is null or parent_id <> id),
  constraint sports_organizations_provider_source_key unique (provider, source_record_id),
  constraint sports_organizations_provider_code_key unique (provider, code)
);

create table if not exists public.sports_organization_countries (
  organization_id uuid not null references public.sports_organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (organization_id, country_id)
);

create table if not exists public.gender_categories (
  code text primary key,
  canonical_name text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  constraint gender_categories_code_check check (code ~ '^[a-z][a-z0-9_]*$')
);

create table if not exists public.competition_formats (
  code text primary key,
  canonical_name text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  constraint competition_formats_code_check check (code ~ '^[a-z][a-z0-9_]*$')
);

create table if not exists public.territorial_scopes (
  code text primary key,
  canonical_name text not null,
  requires_country boolean not null default false,
  allows_multiple_countries boolean not null default false,
  allows_geo_area boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  constraint territorial_scopes_code_check check (code ~ '^[a-z][a-z0-9_]*$')
);

create table if not exists public.competition_levels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.sports_organizations(id) on delete restrict,
  sport_id uuid not null references public.sports(id) on delete restrict,
  code text not null,
  canonical_name text not null,
  country_id uuid references public.countries(id) on delete restrict,
  level_rank integer,
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_levels_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint competition_levels_rank_check check (level_rank is null or level_rank > 0),
  constraint competition_levels_validity_check check (valid_to is null or valid_from is null or valid_to >= valid_from),
  constraint competition_levels_scope_key unique nulls not distinct (organization_id, sport_id, country_id, code),
  constraint competition_levels_id_organization_key unique (id, organization_id),
  constraint competition_levels_id_organization_sport_key unique (id, organization_id, sport_id)
);

create table if not exists public.age_classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.sports_organizations(id) on delete restrict,
  sport_id uuid not null references public.sports(id) on delete restrict,
  code text not null,
  canonical_name text not null,
  min_age smallint,
  max_age smallint,
  cutoff_rule text,
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint age_classes_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint age_classes_age_check check (
    (min_age is null or min_age >= 0) and
    (max_age is null or max_age >= 0) and
    (min_age is null or max_age is null or max_age >= min_age)
  ),
  constraint age_classes_validity_check check (valid_to is null or valid_from is null or valid_to >= valid_from),
  constraint age_classes_scope_key unique (organization_id, sport_id, code),
  constraint age_classes_id_organization_key unique (id, organization_id),
  constraint age_classes_id_organization_sport_key unique (id, organization_id, sport_id)
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.sports_organizations(id) on delete restrict,
  code text not null,
  display_label text not null,
  season_type text not null,
  start_date date not null,
  end_date date not null,
  parent_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_code_check check (code ~ '^[a-z0-9][a-z0-9_\-]*$'),
  constraint seasons_type_check check (season_type ~ '^[a-z][a-z0-9_]*$'),
  constraint seasons_date_check check (end_date >= start_date),
  constraint seasons_scope_key unique (organization_id, code),
  constraint seasons_id_organization_key unique (id, organization_id),
  constraint seasons_parent_same_organization_fk
    foreign key (parent_id, organization_id) references public.seasons(id, organization_id) on delete restrict,
  constraint seasons_not_self_parent check (parent_id is null or parent_id <> id)
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.sports_organizations(id) on delete restrict,
  sport_id uuid not null references public.sports(id) on delete restrict,
  discipline_id uuid,
  variant_id uuid,
  code text not null,
  canonical_name text not null,
  primary_country_id uuid references public.countries(id) on delete restrict,
  territorial_scope_code text not null references public.territorial_scopes(code) on delete restrict,
  default_level_id uuid,
  default_age_class_id uuid,
  gender_code text references public.gender_categories(code) on delete restrict,
  format_code text references public.competition_formats(code) on delete restrict,
  provider text not null,
  source_record_id text not null,
  source_version text,
  source_metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competitions_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint competitions_source_check check (btrim(provider) <> '' and btrim(source_record_id) <> ''),
  constraint competitions_provider_source_key unique (provider, source_record_id),
  constraint competitions_organization_code_key unique (organization_id, code),
  constraint competitions_id_organization_key unique (id, organization_id),
  constraint competitions_id_organization_sport_key unique (id, organization_id, sport_id),
  constraint competitions_discipline_sport_fk
    foreign key (discipline_id, sport_id) references public.sport_disciplines(id, sport_id) on delete restrict,
  constraint competitions_variant_discipline_fk
    foreign key (variant_id, discipline_id) references public.sport_variants(id, discipline_id) on delete restrict,
  constraint competitions_scope_shape_check check (discipline_id is not null or variant_id is null),
  constraint competitions_default_level_fk
    foreign key (default_level_id, organization_id, sport_id)
    references public.competition_levels(id, organization_id, sport_id) on delete restrict,
  constraint competitions_default_age_class_fk
    foreign key (default_age_class_id, organization_id, sport_id)
    references public.age_classes(id, organization_id, sport_id) on delete restrict
);

create table if not exists public.competition_countries (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (competition_id, country_id)
);

create table if not exists public.competition_geo_areas (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  geo_area_id uuid not null references public.geo_areas(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (competition_id, geo_area_id)
);

create table if not exists public.competition_editions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null,
  organization_id uuid not null,
  sport_id uuid not null,
  season_id uuid not null,
  level_id uuid,
  age_class_id uuid,
  gender_code text references public.gender_categories(code) on delete restrict,
  format_code text references public.competition_formats(code) on delete restrict,
  code text not null,
  display_label text not null,
  starts_on date,
  ends_on date,
  status text not null default 'planned',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_editions_code_check check (code ~ '^[a-z0-9][a-z0-9_\-]*$'),
  constraint competition_editions_status_check check (status in ('planned', 'active', 'completed', 'cancelled')),
  constraint competition_editions_date_check check (ends_on is null or starts_on is null or ends_on >= starts_on),
  constraint competition_editions_scope_key unique (competition_id, season_id, code),
  constraint competition_editions_id_key unique (id),
  constraint competition_editions_competition_organization_fk
    foreign key (competition_id, organization_id, sport_id) references public.competitions(id, organization_id, sport_id) on delete restrict,
  constraint competition_editions_season_organization_fk
    foreign key (season_id, organization_id) references public.seasons(id, organization_id) on delete restrict,
  constraint competition_editions_level_fk
    foreign key (level_id, organization_id, sport_id) references public.competition_levels(id, organization_id, sport_id) on delete restrict,
  constraint competition_editions_age_class_fk
    foreign key (age_class_id, organization_id, sport_id) references public.age_classes(id, organization_id, sport_id) on delete restrict
);

create table if not exists public.competition_groups (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.competition_editions(id) on delete restrict,
  parent_id uuid,
  code text not null,
  canonical_name text not null,
  group_type text not null default 'group',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_groups_code_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint competition_groups_type_check check (group_type ~ '^[a-z][a-z0-9_]*$'),
  constraint competition_groups_scope_key unique (edition_id, code),
  constraint competition_groups_id_edition_key unique (id, edition_id),
  constraint competition_groups_parent_same_edition_fk
    foreign key (parent_id, edition_id) references public.competition_groups(id, edition_id) on delete restrict,
  constraint competition_groups_not_self_parent check (parent_id is null or parent_id <> id)
);

create table if not exists public.legacy_player_position_mappings (
  id uuid primary key default gen_random_uuid(),
  normalized_source_value text not null,
  source_value text not null,
  sport_id uuid not null references public.sports(id) on delete restrict,
  discipline_id uuid,
  variant_id uuid,
  position_id uuid not null references public.player_positions(id) on delete restrict,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  constraint legacy_player_position_normalized_check check (normalized_source_value = lower(normalized_source_value) and btrim(normalized_source_value) <> ''),
  constraint legacy_player_position_scope_key unique nulls not distinct (normalized_source_value, sport_id, discipline_id, variant_id),
  constraint legacy_player_position_discipline_sport_fk foreign key (discipline_id, sport_id) references public.sport_disciplines(id, sport_id) on delete restrict,
  constraint legacy_player_position_variant_discipline_fk foreign key (variant_id, discipline_id) references public.sport_variants(id, discipline_id) on delete restrict,
  constraint legacy_player_position_scope_shape_check check (discipline_id is not null or variant_id is null)
);

create table if not exists public.legacy_staff_role_mappings (
  id uuid primary key default gen_random_uuid(),
  normalized_source_value text not null unique,
  source_value text not null,
  staff_role_id uuid not null references public.staff_roles(id) on delete restrict,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  constraint legacy_staff_role_normalized_check check (normalized_source_value = lower(normalized_source_value) and btrim(normalized_source_value) <> '')
);

create index if not exists player_position_applicability_scope_idx on public.player_position_applicability(sport_id, discipline_id, variant_id, is_active);
create index if not exists staff_role_applicability_scope_idx on public.staff_role_applicability(sport_id, discipline_id, variant_id, is_active);
create index if not exists sports_organizations_parent_idx on public.sports_organizations(parent_id);
create index if not exists sports_organizations_country_idx on public.sports_organizations(primary_country_id, is_active);
create index if not exists competition_levels_scope_idx on public.competition_levels(organization_id, sport_id, country_id, is_active);
create index if not exists age_classes_scope_idx on public.age_classes(organization_id, sport_id, is_active);
create index if not exists seasons_scope_dates_idx on public.seasons(organization_id, start_date, end_date);
create index if not exists competitions_scope_idx on public.competitions(organization_id, sport_id, primary_country_id, is_active);
create index if not exists competitions_discipline_variant_idx on public.competitions(sport_id, discipline_id, variant_id);
create index if not exists competition_editions_competition_season_idx on public.competition_editions(competition_id, season_id, status);
create index if not exists competition_groups_edition_idx on public.competition_groups(edition_id, display_order);
create index if not exists legacy_player_position_target_idx on public.legacy_player_position_mappings(position_id, is_active);
create index if not exists legacy_staff_role_target_idx on public.legacy_staff_role_mappings(staff_role_id, is_active);

create or replace function public.prevent_sports_organization_cycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.parent_id is null then return new; end if;
  if exists (
    with recursive ancestors(id, parent_id) as (
      select o.id, o.parent_id from public.sports_organizations o where o.id = new.parent_id
      union all
      select o.id, o.parent_id from public.sports_organizations o join ancestors a on o.id = a.parent_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'sports organization hierarchy cycle';
  end if;
  return new;
end
$$;

drop trigger if exists trg_sports_organizations_prevent_cycle on public.sports_organizations;
create trigger trg_sports_organizations_prevent_cycle
before insert or update of parent_id on public.sports_organizations
for each row execute function public.prevent_sports_organization_cycle();

create or replace function public.prevent_season_cycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.parent_id is null then return new; end if;
  if exists (
    with recursive ancestors(id, parent_id) as (
      select s.id, s.parent_id from public.seasons s where s.id = new.parent_id and s.organization_id = new.organization_id
      union all
      select s.id, s.parent_id from public.seasons s join ancestors a on s.id = a.parent_id
      where s.organization_id = new.organization_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'season hierarchy cycle';
  end if;
  return new;
end
$$;

drop trigger if exists trg_seasons_prevent_cycle on public.seasons;
create trigger trg_seasons_prevent_cycle
before insert or update of parent_id on public.seasons
for each row execute function public.prevent_season_cycle();

create or replace function public.prevent_competition_group_cycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.parent_id is null then return new; end if;
  if exists (
    with recursive ancestors(id, parent_id) as (
      select g.id, g.parent_id from public.competition_groups g where g.id = new.parent_id and g.edition_id = new.edition_id
      union all
      select g.id, g.parent_id from public.competition_groups g join ancestors a on g.id = a.parent_id
      where g.edition_id = new.edition_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'competition group hierarchy cycle';
  end if;
  return new;
end
$$;

drop trigger if exists trg_competition_groups_prevent_cycle on public.competition_groups;
create trigger trg_competition_groups_prevent_cycle
before insert or update of parent_id on public.competition_groups
for each row execute function public.prevent_competition_group_cycle();

revoke all on function public.prevent_sports_organization_cycle() from public, anon, authenticated;
revoke all on function public.prevent_season_cycle() from public, anon, authenticated;
revoke all on function public.prevent_competition_group_cycle() from public, anon, authenticated;

-- New Phase 5C catalogue objects only. Existing profile/opportunity/application
-- policies and grants are deliberately untouched.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'player_positions', 'staff_roles', 'player_position_applicability', 'staff_role_applicability',
    'sports_organizations', 'sports_organization_countries', 'gender_categories',
    'competition_formats', 'territorial_scopes', 'competition_levels', 'age_classes',
    'seasons', 'competitions', 'competition_countries', 'competition_geo_areas',
    'competition_editions', 'competition_groups', 'legacy_player_position_mappings',
    'legacy_staff_role_mappings'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_catalog_read', table_name);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', table_name || '_catalog_read', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_insert', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))', table_name || '_admin_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_update', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)) with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))', table_name || '_admin_update', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_delete', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))', table_name || '_admin_delete', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant select on table public.%I to anon, authenticated', table_name);
    execute format('grant insert, update, delete on table public.%I to authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end
$$;

commit;
