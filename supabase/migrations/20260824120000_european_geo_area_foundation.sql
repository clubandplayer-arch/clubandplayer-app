begin;

-- Phase 3A is an additive, empty canonical geography foundation. It does not
-- seed areas, map legacy Italy rows, or alter any existing application table.
create table if not exists public.geo_areas (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete restrict,
  parent_id uuid,
  code text,
  code_authority text,
  official_name text not null,
  short_name text,
  area_type text not null,
  level smallint not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  source_provider text,
  source_record_id text,
  source_updated_at timestamptz,
  source_license text,
  centroid_lat numeric,
  centroid_lng numeric,
  min_lat numeric,
  min_lng numeric,
  max_lat numeric,
  max_lng numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint geo_areas_id_country_key unique (id, country_id),
  constraint geo_areas_parent_country_fk
    foreign key (parent_id, country_id)
    references public.geo_areas(id, country_id)
    on delete restrict,
  constraint geo_areas_not_self_parent_check check (parent_id is null or parent_id <> id),
  constraint geo_areas_level_check check (level >= 1),
  constraint geo_areas_name_check check (btrim(official_name) <> ''),
  constraint geo_areas_area_type_check
    check (area_type = upper(area_type) and area_type ~ '^[A-Z][A-Z0-9_]*$'),
  constraint geo_areas_code_pair_check
    check ((code is null and code_authority is null) or (code is not null and code_authority is not null)),
  constraint geo_areas_source_pair_check
    check ((source_provider is null and source_record_id is null) or (source_provider is not null and source_record_id is not null)),
  constraint geo_areas_centroid_pair_check
    check ((centroid_lat is null and centroid_lng is null) or (centroid_lat is not null and centroid_lng is not null)),
  constraint geo_areas_centroid_lat_check check (centroid_lat is null or centroid_lat between -90 and 90),
  constraint geo_areas_centroid_lng_check check (centroid_lng is null or centroid_lng between -180 and 180),
  constraint geo_areas_bounds_complete_check check (
    (min_lat is null and min_lng is null and max_lat is null and max_lng is null)
    or
    (min_lat is not null and min_lng is not null and max_lat is not null and max_lng is not null)
  ),
  constraint geo_areas_min_lat_check check (min_lat is null or min_lat between -90 and 90),
  constraint geo_areas_max_lat_check check (max_lat is null or max_lat between -90 and 90),
  constraint geo_areas_min_lng_check check (min_lng is null or min_lng between -180 and 180),
  constraint geo_areas_max_lng_check check (max_lng is null or max_lng between -180 and 180),
  constraint geo_areas_bounds_order_check check (
    min_lat is null or (min_lat <= max_lat and min_lng <= max_lng)
  )
);

create unique index if not exists geo_areas_provider_record_key
  on public.geo_areas (source_provider, source_record_id)
  where source_provider is not null and source_record_id is not null;
create unique index if not exists geo_areas_country_authority_code_key
  on public.geo_areas (country_id, code_authority, code)
  where code_authority is not null and code is not null;
create index if not exists geo_areas_country_idx on public.geo_areas (country_id);
create index if not exists geo_areas_parent_idx on public.geo_areas (parent_id);
create index if not exists geo_areas_country_level_idx on public.geo_areas (country_id, level);
create index if not exists geo_areas_country_parent_active_order_idx
  on public.geo_areas (country_id, parent_id, is_active, display_order);
create index if not exists geo_areas_official_name_idx on public.geo_areas (official_name);
create index if not exists geo_areas_active_idx on public.geo_areas (is_active);

create table if not exists public.geo_area_names (
  geo_area_id uuid not null references public.geo_areas(id) on delete cascade,
  locale text not null,
  name text not null,
  is_preferred boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (geo_area_id, locale, name),
  constraint geo_area_names_locale_check
    check (locale = lower(locale) and locale ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'),
  constraint geo_area_names_name_check check (btrim(name) <> '')
);

create unique index if not exists geo_area_names_preferred_key
  on public.geo_area_names (geo_area_id, locale)
  where is_preferred = true;
create index if not exists geo_area_names_geo_area_idx on public.geo_area_names (geo_area_id);
create index if not exists geo_area_names_locale_idx on public.geo_area_names (locale);
create index if not exists geo_area_names_name_idx on public.geo_area_names (name);

create table if not exists public.legacy_geo_area_mappings (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_entity_type text not null,
  legacy_id text not null,
  legacy_value text,
  geo_area_id uuid not null references public.geo_areas(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint legacy_geo_area_mappings_source_check check (btrim(source_system) <> ''),
  constraint legacy_geo_area_mappings_entity_check check (btrim(source_entity_type) <> ''),
  constraint legacy_geo_area_mappings_id_check check (btrim(legacy_id) <> ''),
  constraint legacy_geo_area_mappings_source_key unique (source_system, source_entity_type, legacy_id)
);

create index if not exists legacy_geo_area_mappings_geo_area_idx
  on public.legacy_geo_area_mappings (geo_area_id);

-- Reuse the verified generic timestamp function. No legacy function is changed.
drop trigger if exists trg_geo_areas_updated_at on public.geo_areas;
create trigger trg_geo_areas_updated_at
before update on public.geo_areas
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.geo_areas enable row level security;
alter table public.geo_area_names enable row level security;
alter table public.legacy_geo_area_mappings enable row level security;

drop policy if exists geo_areas_catalog_read on public.geo_areas;
create policy geo_areas_catalog_read
  on public.geo_areas for select to anon, authenticated using (true);

drop policy if exists geo_area_names_catalog_read on public.geo_area_names;
create policy geo_area_names_catalog_read
  on public.geo_area_names for select to anon, authenticated using (true);

-- Legacy IDs are compatibility infrastructure: authenticated clients may read
-- mappings, while anonymous catalogue consumers cannot.
drop policy if exists legacy_geo_area_mappings_authenticated_read on public.legacy_geo_area_mappings;
create policy legacy_geo_area_mappings_authenticated_read
  on public.legacy_geo_area_mappings for select to authenticated using (true);

-- Authenticated writes require the existing platform-admin signal. The
-- service_role retains its normal RLS bypass for controlled import jobs.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['geo_areas', 'geo_area_names', 'legacy_geo_area_mappings']
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_insert', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))',
      table_name || '_admin_insert', table_name
    );
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_update', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)) with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))',
      table_name || '_admin_update', table_name
    );
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_delete', table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))',
      table_name || '_admin_delete', table_name
    );
  end loop;
end
$$;

-- Intentionally no INSERT/UPDATE/DELETE: all Phase 3A geography tables deploy empty.
commit;
