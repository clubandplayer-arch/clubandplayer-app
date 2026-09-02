begin;

-- Phase 1 is intentionally additive. It does not alter or backfill profiles,
-- opportunities, applications, legacy geography, registry objects or views.
create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  iso2 text not null,
  iso3 text,
  official_name text not null,
  is_supported boolean not null default false,
  is_active boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint countries_iso2_format_check check (iso2 = upper(iso2) and iso2 ~ '^[A-Z]{2}$'),
  constraint countries_iso3_format_check check (iso3 is null or (iso3 = upper(iso3) and iso3 ~ '^[A-Z]{3}$'))
);

create unique index if not exists countries_iso2_key on public.countries (iso2);
create unique index if not exists countries_iso3_key on public.countries (iso3) where iso3 is not null;
create index if not exists countries_active_order_idx on public.countries (is_active, is_supported, display_order);

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  canonical_name text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_code_format_check check (code ~ '^[a-z][a-z0-9_]*$')
);

create unique index if not exists sports_code_key on public.sports (code);
create index if not exists sports_active_order_idx on public.sports (is_active, display_order);

create table if not exists public.sport_disciplines (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete restrict,
  code text not null,
  canonical_name text not null,
  is_independently_selectable boolean not null default true,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sport_disciplines_code_format_check check (code ~ '^[a-z][a-z0-9_]*$')
);

create unique index if not exists sport_disciplines_sport_code_key
  on public.sport_disciplines (sport_id, code);
create index if not exists sport_disciplines_sport_idx on public.sport_disciplines (sport_id);
create index if not exists sport_disciplines_active_order_idx
  on public.sport_disciplines (sport_id, is_active, display_order);

create table if not exists public.sport_variants (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.sport_disciplines(id) on delete restrict,
  code text not null,
  canonical_name text not null,
  team_size integer,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sport_variants_code_format_check check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint sport_variants_team_size_check check (team_size is null or team_size > 0)
);

create unique index if not exists sport_variants_discipline_code_key
  on public.sport_variants (discipline_id, code);
create index if not exists sport_variants_discipline_idx on public.sport_variants (discipline_id);
create index if not exists sport_variants_active_order_idx
  on public.sport_variants (discipline_id, is_active, display_order);

-- Domain-specific mapping tables retain strong foreign keys. A polymorphic
-- target would make invalid canonical targets possible at database level.
create table if not exists public.legacy_country_mappings (
  id uuid primary key default gen_random_uuid(),
  source_value text not null,
  normalized_source_value text not null,
  country_id uuid not null references public.countries(id) on delete restrict,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  constraint legacy_country_mappings_normalized_check
    check (normalized_source_value = lower(normalized_source_value) and btrim(normalized_source_value) <> '')
);

create unique index if not exists legacy_country_mappings_source_key
  on public.legacy_country_mappings (normalized_source_value);
create index if not exists legacy_country_mappings_target_idx
  on public.legacy_country_mappings (country_id, is_active);

create table if not exists public.legacy_sport_mappings (
  id uuid primary key default gen_random_uuid(),
  source_value text not null,
  normalized_source_value text not null,
  sport_id uuid not null references public.sports(id) on delete restrict,
  discipline_id uuid references public.sport_disciplines(id) on delete restrict,
  variant_id uuid references public.sport_variants(id) on delete restrict,
  legacy_display_label text not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  constraint legacy_sport_mappings_normalized_check
    check (normalized_source_value = lower(normalized_source_value) and btrim(normalized_source_value) <> '')
);

create unique index if not exists legacy_sport_mappings_source_key
  on public.legacy_sport_mappings (normalized_source_value);
create index if not exists legacy_sport_mappings_target_idx
  on public.legacy_sport_mappings (sport_id, discipline_id, variant_id, is_active);

-- Catalogues are public reference data. With RLS enabled and only SELECT
-- policies, authenticated/anonymous users cannot mutate them; service_role
-- keeps its standard RLS bypass. Platform-admin writes remain explicit.
alter table public.countries enable row level security;
alter table public.sports enable row level security;
alter table public.sport_disciplines enable row level security;
alter table public.sport_variants enable row level security;
alter table public.legacy_country_mappings enable row level security;
alter table public.legacy_sport_mappings enable row level security;

drop policy if exists countries_catalog_read on public.countries;
create policy countries_catalog_read on public.countries for select to anon, authenticated using (true);
drop policy if exists sports_catalog_read on public.sports;
create policy sports_catalog_read on public.sports for select to anon, authenticated using (true);
drop policy if exists sport_disciplines_catalog_read on public.sport_disciplines;
create policy sport_disciplines_catalog_read on public.sport_disciplines for select to anon, authenticated using (true);
drop policy if exists sport_variants_catalog_read on public.sport_variants;
create policy sport_variants_catalog_read on public.sport_variants for select to anon, authenticated using (true);
drop policy if exists legacy_country_mappings_catalog_read on public.legacy_country_mappings;
create policy legacy_country_mappings_catalog_read on public.legacy_country_mappings for select to anon, authenticated using (true);
drop policy if exists legacy_sport_mappings_catalog_read on public.legacy_sport_mappings;
create policy legacy_sport_mappings_catalog_read on public.legacy_sport_mappings for select to anon, authenticated using (true);

-- Admin policies are scoped only to the new catalogues and use the existing
-- platform-admin signal. Service-role access does not require a policy.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'countries', 'sports', 'sport_disciplines', 'sport_variants',
    'legacy_country_mappings', 'legacy_sport_mappings'
  ]
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

insert into public.countries (iso2, iso3, official_name, is_supported, is_active, display_order)
values
  ('IT', 'ITA', 'Italy', true, true, 10),
  ('FR', 'FRA', 'France', true, true, 20),
  ('ES', 'ESP', 'Spain', true, true, 30),
  ('CH', 'CHE', 'Switzerland', true, true, 40),
  ('SI', 'SVN', 'Slovenia', true, true, 50),
  ('PL', 'POL', 'Poland', true, true, 60),
  ('PT', 'PRT', 'Portugal', false, false, 70),
  ('DE', 'DEU', 'Germany', false, false, 80),
  ('AT', 'AUT', 'Austria', false, false, 90),
  ('AL', 'ALB', 'Albania', false, false, 100),
  ('AR', 'ARG', 'Argentina', false, false, 110),
  ('BJ', 'BEN', 'Benin', false, false, 120),
  ('BR', 'BRA', 'Brazil', false, false, 130),
  ('DO', 'DOM', 'Dominican Republic', false, false, 140),
  ('GH', 'GHA', 'Ghana', false, false, 150),
  ('GQ', 'GNQ', 'Equatorial Guinea', false, false, 160),
  ('PY', 'PRY', 'Paraguay', false, false, 170),
  ('RU', 'RUS', 'Russian Federation', false, false, 180),
  ('SN', 'SEN', 'Senegal', false, false, 190),
  ('UA', 'UKR', 'Ukraine', false, false, 200)
on conflict (iso2) do update set
  iso3 = excluded.iso3,
  official_name = excluded.official_name,
  is_supported = excluded.is_supported,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.sports (code, canonical_name, is_active, display_order)
values
  ('football', 'Football', true, 10),
  ('volleyball', 'Volleyball', true, 20),
  ('basketball', 'Basketball', true, 30),
  ('water_polo', 'Water Polo', true, 40),
  ('handball', 'Handball', true, 50),
  ('rugby', 'Rugby', true, 60),
  ('field_hockey', 'Field Hockey', true, 70),
  ('ice_hockey', 'Ice Hockey', true, 80),
  ('baseball', 'Baseball', true, 90),
  ('softball', 'Softball', true, 100),
  ('lacrosse', 'Lacrosse', true, 110),
  ('american_football', 'American Football', true, 120),
  ('cricket', 'Cricket', false, 900)
on conflict (code) do update set
  canonical_name = excluded.canonical_name,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.sport_disciplines
  (sport_id, code, canonical_name, is_independently_selectable, is_active, display_order)
select s.id, seed.code, seed.canonical_name, true, true, seed.display_order
from public.sports s
cross join (values
  ('association_football', 'Association Football', 10),
  ('futsal', 'Futsal', 20)
) as seed(code, canonical_name, display_order)
where s.code = 'football'
on conflict (sport_id, code) do update set
  canonical_name = excluded.canonical_name,
  is_independently_selectable = excluded.is_independently_selectable,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.sport_variants (discipline_id, code, canonical_name, team_size, is_active, display_order)
select d.id, seed.code, seed.canonical_name, seed.team_size, true, seed.display_order
from public.sport_disciplines d
join public.sports s on s.id = d.sport_id and s.code = 'football'
cross join (values
  ('eleven_a_side', '11-a-side', 11, 10),
  ('eight_a_side', '8-a-side', 8, 20)
) as seed(code, canonical_name, team_size, display_order)
where d.code = 'association_football'
on conflict (discipline_id, code) do update set
  canonical_name = excluded.canonical_name,
  team_size = excluded.team_size,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.legacy_country_mappings
  (source_value, normalized_source_value, country_id, notes)
select seed.source_value, seed.normalized_source_value, c.id, 'Phase 1 controlled country alias'
from (values
  ('IT', 'it', 'IT'), ('ITA', 'ita', 'IT'), ('Italia', 'italia', 'IT'), ('Italy', 'italy', 'IT'),
  ('FR', 'fr', 'FR'), ('FRA', 'fra', 'FR'), ('Francia', 'francia', 'FR'), ('France', 'france', 'FR'),
  ('ES', 'es', 'ES'), ('ESP', 'esp', 'ES'), ('Spagna', 'spagna', 'ES'), ('Spain', 'spain', 'ES'),
  ('CH', 'ch', 'CH'), ('CHE', 'che', 'CH'), ('Svizzera', 'svizzera', 'CH'), ('Switzerland', 'switzerland', 'CH'),
  ('SI', 'si', 'SI'), ('SVN', 'svn', 'SI'), ('Slovenia', 'slovenia', 'SI'),
  ('PL', 'pl', 'PL'), ('POL', 'pol', 'PL'), ('Polonia', 'polonia', 'PL'), ('Poland', 'poland', 'PL'),
  ('PT', 'pt', 'PT'), ('PRT', 'prt', 'PT'), ('Portogallo', 'portogallo', 'PT'), ('Portugal', 'portugal', 'PT'),
  ('DE', 'de', 'DE'), ('DEU', 'deu', 'DE'), ('Germania', 'germania', 'DE'), ('Germany', 'germany', 'DE'),
  ('AT', 'at', 'AT'), ('AUT', 'aut', 'AT'), ('Austria', 'austria', 'AT')
) as seed(source_value, normalized_source_value, iso2)
join public.countries c on c.iso2 = seed.iso2
on conflict (normalized_source_value) do update set
  source_value = excluded.source_value,
  country_id = excluded.country_id,
  is_active = true,
  notes = excluded.notes;

with mapping_seed(source_value, normalized_source_value, sport_code, discipline_code, variant_code, legacy_label, notes) as (
  values
    ('Calcio', 'calcio', 'football', 'association_football', 'eleven_a_side', 'Calcio', 'Primary legacy label'),
    ('Calcio a 8', 'calcio_a_8', 'football', 'association_football', 'eight_a_side', 'Calcio a 8', 'Football variant'),
    ('Futsal', 'futsal', 'football', 'futsal', null, 'Futsal', 'Independently selectable discipline'),
    ('Volley', 'volley', 'volleyball', null, null, 'Volley', 'Current application label'),
    ('Pallavolo', 'pallavolo', 'volleyball', null, null, 'Volley', 'Legacy alias'),
    ('Basket', 'basket', 'basketball', null, null, 'Basket', null),
    ('Pallanuoto', 'pallanuoto', 'water_polo', null, null, 'Pallanuoto', null),
    ('Pallamano', 'pallamano', 'handball', null, null, 'Pallamano', null),
    ('Rugby', 'rugby', 'rugby', null, null, 'Rugby', null),
    ('Hockey su prato', 'hockey_su_prato', 'field_hockey', null, null, 'Hockey su prato', 'Current application label'),
    ('hockey_prato', 'hockey_prato', 'field_hockey', null, null, 'Hockey su prato', 'Legacy enum alias'),
    ('Hockey su ghiaccio', 'hockey_su_ghiaccio', 'ice_hockey', null, null, 'Hockey su ghiaccio', 'Current application label'),
    ('hockey_ghiaccio', 'hockey_ghiaccio', 'ice_hockey', null, null, 'Hockey su ghiaccio', 'Legacy enum alias'),
    ('Baseball', 'baseball', 'baseball', null, null, 'Baseball', null),
    ('Softball', 'softball', 'softball', null, null, 'Softball', null),
    ('Lacrosse', 'lacrosse', 'lacrosse', null, null, 'Lacrosse', null),
    ('Football americano', 'football_americano', 'american_football', null, null, 'Football americano', 'Current label and legacy enum normalize identically'),
    ('Cricket', 'cricket', 'cricket', null, null, 'Cricket', 'Inactive legacy-only sport')
)
insert into public.legacy_sport_mappings
  (source_value, normalized_source_value, sport_id, discipline_id, variant_id, legacy_display_label, notes)
select
  seed.source_value,
  seed.normalized_source_value,
  s.id,
  d.id,
  v.id,
  seed.legacy_label,
  seed.notes
from mapping_seed seed
join public.sports s on s.code = seed.sport_code
left join public.sport_disciplines d on d.sport_id = s.id and d.code = seed.discipline_code
left join public.sport_variants v on v.discipline_id = d.id and v.code = seed.variant_code
on conflict (normalized_source_value) do update set
  source_value = excluded.source_value,
  sport_id = excluded.sport_id,
  discipline_id = excluded.discipline_id,
  variant_id = excluded.variant_id,
  legacy_display_label = excluded.legacy_display_label,
  is_active = true,
  notes = excluded.notes;

commit;
