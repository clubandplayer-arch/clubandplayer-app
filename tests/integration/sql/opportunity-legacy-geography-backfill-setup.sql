create schema if not exists public;
create table public.countries (id uuid primary key, iso2 text unique not null, official_name text not null, is_supported boolean not null, is_active boolean not null);
create table public.geo_areas (id uuid primary key, country_id uuid not null references public.countries(id), parent_id uuid, official_name text not null, area_type text not null, level int not null, is_active boolean not null, unique(id,country_id));
create table public.regions (id int primary key, name text not null);
create table public.provinces (id int primary key, region_id int not null references public.regions(id), name text not null, sigla text);
create table public.municipalities (id int primary key, province_id int not null references public.provinces(id), region_id int not null references public.regions(id), name text not null);
create table public.legacy_geo_area_mappings (source_system text not null, source_entity_type text not null, legacy_id text not null, geo_area_id uuid not null references public.geo_areas(id));
create table public.opportunities (id uuid primary key, title text not null, country text, region text, province text, city text, owner_id uuid, created_by uuid, club_id uuid);
create table public.applications (id uuid primary key, opportunity_id uuid references public.opportunities(id), athlete_id uuid, club_id uuid, status text);

insert into public.countries values
('10000000-0000-0000-0000-000000000001','IT','Italy',true,true),
('10000000-0000-0000-0000-000000000002','FR','France',true,true);
insert into public.regions values (1,'Lazio'),(2,'Piemonte');
insert into public.provinces values (10,1,'Roma','RM'),(20,2,'Torino','TO');
insert into public.municipalities values (100,10,1,'Subiaco'),(101,10,1,'Comune Doppio'),(201,20,2,'Comune Doppio');
insert into public.geo_areas values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',null,'Lazio','REGION',1,true),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Roma','PROVINCE',2,true),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','Subiaco','MUNICIPALITY',3,true),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','Comune Doppio','MUNICIPALITY',3,true),
('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001',null,'Piemonte','REGION',1,true),
('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000005','Torino','PROVINCE',2,true),
('20000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000006','Comune Doppio','MUNICIPALITY',3,true);
insert into public.legacy_geo_area_mappings values
('italy_legacy','region','1','20000000-0000-0000-0000-000000000001'),
('italy_legacy','province','10','20000000-0000-0000-0000-000000000002'),
('italy_legacy','municipality','100','20000000-0000-0000-0000-000000000003'),
('italy_legacy','municipality','101','20000000-0000-0000-0000-000000000004'),
('italy_legacy','region','2','20000000-0000-0000-0000-000000000005'),
('italy_legacy','province','20','20000000-0000-0000-0000-000000000006'),
('italy_legacy','municipality','201','20000000-0000-0000-0000-000000000007');
insert into public.opportunities values
('30000000-0000-0000-0000-000000000001','Exact Subiaco','IT','Lazio','RM','Subiaco','40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000002','Ambiguous','Italia',null,null,'Comune Doppio','40000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002'),
('30000000-0000-0000-0000-000000000003','Unresolved','Italy',null,null,'Missing','40000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000003'),
('30000000-0000-0000-0000-000000000004','Foreign','France',null,null,'Paris','40000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000004');
insert into public.applications values ('50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','submitted');
