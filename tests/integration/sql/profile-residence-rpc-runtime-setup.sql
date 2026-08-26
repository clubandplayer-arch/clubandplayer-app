\set ON_ERROR_STOP on
create extension if not exists pgcrypto;
do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;
create schema auth;
create schema test;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant execute on function auth.jwt() to anon, authenticated;

create table public.profiles (
 id uuid primary key,
 user_id uuid not null unique,
 account_type text,
 type text, role text, full_name text, display_name text,
 status text not null default 'active', birth_year integer, country text, sport text,
 profile_visibility_status text not null default 'published', registry_master_id uuid,
 club_name_review_status text not null default 'not_required', club_name_review_reason text,
 club_name_reviewed_at timestamptz, club_name_reviewed_by uuid,
 is_admin boolean not null default false,
 region text, province text, city text, region_id integer, province_id integer, municipality_id integer,
 residence_region_id integer, residence_province_id integer, residence_municipality_id integer,
 birth_country text, nationality text, interest_country text, interest_region text,
 interest_region_id integer, interest_province_id integer, interest_municipality_id integer,
 updated_at timestamptz not null default now()
);
create table public.provinces(id integer primary key, region_id integer);
create table public.municipalities(id integer primary key, province_id integer, region_id integer);
create table public.notifications(id bigserial primary key, user_id uuid, kind text, payload jsonb);
create function public.normalize_person_name(value text) returns text language sql immutable strict as $$ select initcap(lower(regexp_replace(btrim(value), '\s+', ' ', 'g'))) $$;

create table public.countries (
 id uuid primary key, iso2 text not null unique, official_name text not null,
 is_supported boolean not null, is_active boolean not null
);
create table public.geo_areas (
 id uuid primary key, country_id uuid not null references public.countries(id), parent_id uuid,
 official_name text not null, area_type text not null, is_active boolean not null default true,
 unique(id,country_id), foreign key(parent_id,country_id) references public.geo_areas(id,country_id)
);
create table public.legacy_geo_area_mappings (
 id uuid primary key default gen_random_uuid(), source_system text not null,
 source_entity_type text not null, legacy_id text not null, geo_area_id uuid not null references public.geo_areas(id),
 unique(source_system,source_entity_type,legacy_id)
);
create table public.profile_preferences (
 profile_id uuid primary key references public.profiles(id),
 residence_country_id uuid references public.countries(id),
 residence_geo_area_id uuid,
 open_to_relocation boolean not null default false,
 foreign key(residence_geo_area_id,residence_country_id) references public.geo_areas(id,country_id)
);
create table public.profile_country_interests(profile_id uuid, country_id uuid, primary key(profile_id,country_id));
create table public.profile_geo_area_interests(profile_id uuid, geo_area_id uuid, primary key(profile_id,geo_area_id));

alter table public.profiles enable row level security;
alter table public.countries enable row level security;
alter table public.geo_areas enable row level security;
alter table public.legacy_geo_area_mappings enable row level security;
alter table public.profile_preferences enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(true);
create policy profiles_update_self on public.profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy countries_read on public.countries for select to anon,authenticated using(true);
create policy geo_read on public.geo_areas for select to anon,authenticated using(true);
create policy mapping_read on public.legacy_geo_area_mappings for select to anon,authenticated using(true);
create policy pref_read on public.profile_preferences for select to authenticated using(exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy pref_insert on public.profile_preferences for insert to authenticated with check(exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy pref_update on public.profile_preferences for update to authenticated using(exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid())) with check(exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));
grant usage on schema public to anon,authenticated;
grant select on public.countries,public.geo_areas,public.legacy_geo_area_mappings,public.provinces,public.municipalities to anon,authenticated;
grant select,update on public.profiles to authenticated;
grant select on auth.users to authenticated;
grant select on public.notifications to authenticated;
grant select,insert,update on public.profile_preferences to authenticated;
grant select on public.profile_country_interests,public.profile_geo_area_interests to authenticated;

create function test.assert(ok boolean, message text) returns void language plpgsql security definer set search_path='' as $$
begin if coalesce(ok,false) is not true then raise exception 'ASSERTION FAILED: %',message; end if; end $$;
grant usage on schema test to authenticated;
grant execute on function test.assert(boolean,text) to authenticated;

insert into public.countries values
 ('10000000-0000-0000-0000-000000000001','IT','Italy',true,true),
 ('10000000-0000-0000-0000-000000000002','FR','France',true,true),
 ('10000000-0000-0000-0000-000000000003','ES','Spain',true,true),
 ('10000000-0000-0000-0000-000000000004','CH','Switzerland',true,true),
 ('10000000-0000-0000-0000-000000000005','SI','Slovenia',true,true),
 ('10000000-0000-0000-0000-000000000006','PL','Poland',true,true),
 ('10000000-0000-0000-0000-000000000007','PT','Portugal',false,false);
insert into public.geo_areas(id,country_id,parent_id,official_name,area_type,is_active) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',null,'Sicilia','REGION',true),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Catania','PROVINCE',true),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','Catania','MUNICIPALITY',true),
 ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001',null,'Mapping missing','REGION',true),
 ('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001',null,'Mapping ambiguous','REGION',true),
 ('20000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000002',null,'Île-de-France','REGION',true),
 ('20000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000011','Paris','DEPARTMENT',true),
 ('20000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000012','Paris','COMMUNE',true),
 ('20000000-0000-0000-0000-000000000021','10000000-0000-0000-0000-000000000003',null,'Madrid, Comunidad de','AUTONOMOUS_COMMUNITY',true),
 ('20000000-0000-0000-0000-000000000022','10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000021','Madrid','PROVINCE',true),
 ('20000000-0000-0000-0000-000000000023','10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000022','Alcalá de Henares','MUNICIPALITY',true),
 ('20000000-0000-0000-0000-000000000031','10000000-0000-0000-0000-000000000004',null,'Ticino','CANTON',true),
 ('20000000-0000-0000-0000-000000000032','10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000031','Lugano','DISTRICT',true),
 ('20000000-0000-0000-0000-000000000033','10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000032','Lugano','MUNICIPALITY',true),
 ('20000000-0000-0000-0000-000000000034','10000000-0000-0000-0000-000000000004',null,'Genève','CANTON',true),
 ('20000000-0000-0000-0000-000000000035','10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000034','Genève','MUNICIPALITY',true),
 ('20000000-0000-0000-0000-000000000041','10000000-0000-0000-0000-000000000005',null,'Osrednjeslovenska','STATISTICAL_REGION',true),
 ('20000000-0000-0000-0000-000000000042','10000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000041','Ljubljana','MUNICIPALITY',true),
 ('20000000-0000-0000-0000-000000000051','10000000-0000-0000-0000-000000000006',null,'Mazowieckie','VOIVODESHIP',true),
 ('20000000-0000-0000-0000-000000000052','10000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000051','Warszawa','POWIAT',true),
 ('20000000-0000-0000-0000-000000000053','10000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000052','Warszawa','GMINA',true);
insert into public.legacy_geo_area_mappings(source_system,source_entity_type,legacy_id,geo_area_id) values
 ('italy_legacy','region','1','20000000-0000-0000-0000-000000000001'),
 ('italy_legacy','province','2','20000000-0000-0000-0000-000000000002'),
 ('italy_legacy','municipality','3','20000000-0000-0000-0000-000000000003'),
 ('italy_legacy','region','51','20000000-0000-0000-0000-000000000005'),
 ('italy_legacy','region','52','20000000-0000-0000-0000-000000000005');

insert into auth.users(id,raw_user_meta_data,updated_at) values
 ('40000000-0000-0000-0000-000000000001','{"full_name":"Mario Rossi"}','2026-01-01'),
 ('40000000-0000-0000-0000-000000000002','{"full_name":"Anna Verdi"}','2026-01-01');
insert into public.provinces values (10,1);
insert into public.municipalities values (100,10,1);

insert into public.profiles(id,user_id,account_type,role,full_name,display_name,birth_year,country,sport,region_id,province_id,municipality_id,birth_country,nationality,interest_country,interest_region) values
 ('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','athlete','Player','Mario Rossi','Mario Rossi',1995,'IT','Calcio',1,10,100,'IT','Italian','FR','Île-de-France'),
 ('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','staff','Coach','Anna Verdi','Anna Verdi',1985,'IT','Calcio',1,10,100,'IT','Italian','ES','Madrid'),
 ('30000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000003','club','Club','Test Club','Test Club',null,'IT','Calcio',null,null,null,'IT','Italian','IT','Lazio'),
 ('30000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000004','fan','Fan','Test Fan','Test Fan',null,'IT',null,null,null,null,'IT','Italian','IT','Lazio'),
 ('30000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000005','institution','Institution','Test Institution','Test Institution',null,'IT',null,null,null,null,'IT','Italian','IT','Lazio');
insert into public.profile_country_interests values ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002');
insert into public.profile_geo_area_interests values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000011');
