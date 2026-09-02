create schema if not exists public;

create table public.countries (
  id uuid primary key,
  iso2 text not null unique
);

create table public.geo_areas (
  id uuid primary key,
  country_id uuid not null references public.countries(id) on delete restrict,
  official_name text not null,
  constraint geo_areas_id_country_key unique (id, country_id)
);

create table public.opportunities (
  id uuid primary key,
  title text not null,
  country text,
  region text,
  province text,
  city text,
  owner_id uuid,
  created_by uuid,
  club_id uuid
);

create table public.applications (
  id uuid primary key,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  athlete_id uuid,
  club_id uuid,
  status text
);

insert into public.countries (id, iso2)
values
  ('10000000-0000-0000-0000-000000000001', 'IT'),
  ('10000000-0000-0000-0000-000000000002', 'FR');

insert into public.geo_areas (id, country_id, official_name)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Lazio'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Île-de-France');

insert into public.opportunities (
  id, title, country, region, province, city, owner_id, created_by, club_id
)
values (
  '30000000-0000-0000-0000-000000000001',
  'Legacy Opportunity',
  'Italia',
  'Lazio',
  'Roma',
  'Roma',
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001'
);

insert into public.applications (
  id, opportunity_id, athlete_id, club_id, status
)
values (
  '60000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'submitted'
);
