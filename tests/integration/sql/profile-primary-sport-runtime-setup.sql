\set ON_ERROR_STOP on

-- The Profile table and its dependencies come from the existing residence
-- runtime fixture. This file adds only the Phase 1/5C sports candidate keys.
create table public.sports (
  id uuid primary key,
  code text not null unique
);
create table public.sport_disciplines (
  id uuid primary key,
  sport_id uuid not null references public.sports(id) on delete restrict,
  code text not null,
  unique (id, sport_id),
  unique (sport_id, code)
);
create table public.sport_variants (
  id uuid primary key,
  discipline_id uuid not null references public.sport_disciplines(id) on delete restrict,
  code text not null,
  unique (id, discipline_id),
  unique (discipline_id, code)
);

insert into public.sports(id, code) values
  ('60000000-0000-4000-8000-000000000001', 'football'),
  ('60000000-0000-4000-8000-000000000002', 'volleyball');
insert into public.sport_disciplines(id, sport_id, code) values
  ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'association_football'),
  ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'indoor_volleyball');
insert into public.sport_variants(id, discipline_id, code) values
  ('80000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'eleven_a_side'),
  ('80000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', 'six_a_side');
