create extension if not exists pgcrypto;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create table public.countries (id uuid primary key default gen_random_uuid(), iso2 text unique not null);
create table public.sports (id uuid primary key default gen_random_uuid(), code text unique not null);
create table public.sport_disciplines (
  id uuid primary key default gen_random_uuid(), sport_id uuid not null references public.sports(id), code text not null
);
create table public.sport_variants (
  id uuid primary key default gen_random_uuid(), discipline_id uuid not null references public.sport_disciplines(id), code text not null
);
create table public.geo_areas (id uuid primary key default gen_random_uuid());
create table public.profiles (
  id uuid primary key default gen_random_uuid(), user_id uuid, is_admin boolean not null default false,
  sport text, role text, gender text, club_league_category text
);
create table public.athlete_experiences (
  id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id),
  club_name text, sport text, role text, category text, start_year integer, end_year integer, is_current boolean
);
create table public.opportunities (
  id uuid primary key default gen_random_uuid(), sport text, role text, role_group text, category text,
  required_category text, gender text, age_min integer, age_max integer,
  club_id uuid, owner_id uuid, created_by uuid, status text
);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select on all tables in schema public to anon;

insert into public.countries(id, iso2) values ('10000000-0000-0000-0000-000000000001', 'IT');
insert into public.sports(id, code) values ('20000000-0000-0000-0000-000000000001', 'football');
insert into public.sport_disciplines(id, sport_id, code) values (
  '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'association_football'
);
insert into public.sport_variants(id, discipline_id, code) values (
  '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'eleven_a_side'
);
insert into public.profiles(id, user_id, sport, role) values (
  '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Calcio', 'Portiere'
);
insert into public.athlete_experiences(id, profile_id, club_name, sport, role, category, start_year) values (
  '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Legacy Club', 'Calcio', 'Portiere', 'Serie D', 2025
);
insert into public.opportunities(id, sport, role, category, owner_id, created_by, status) values (
  '80000000-0000-0000-0000-000000000001', 'Calcio', 'Portiere', 'Serie D',
  '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'open'
);
