create extension if not exists pgcrypto;
do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin bypassrls;
exception when duplicate_object then null; end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create table public.profiles (
  id uuid primary key,
  user_id uuid unique,
  is_admin boolean not null default false
);
create table public.countries (id uuid primary key, iso2 text unique not null);
create table public.geo_areas (id uuid primary key, country_id uuid not null references public.countries(id));
create table public.sports (id uuid primary key, code text unique not null);
create table public.sport_disciplines (
  id uuid primary key,
  sport_id uuid not null references public.sports(id),
  code text not null,
  unique(sport_id, code)
);
create table public.sport_variants (
  id uuid primary key,
  discipline_id uuid not null references public.sport_disciplines(id),
  code text not null,
  unique(discipline_id, code)
);
