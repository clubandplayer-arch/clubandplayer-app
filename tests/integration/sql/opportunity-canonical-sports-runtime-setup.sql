\set ON_ERROR_STOP on

create table public.opportunities (
  id uuid primary key,
  title text not null,
  sport text,
  role text,
  role_group text,
  gender text,
  owner_id uuid,
  created_by uuid
);
create table public.applications (
  id uuid primary key,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  athlete_id uuid not null,
  status text not null
);

insert into public.opportunities(id,title,sport,role,role_group,gender,owner_id,created_by)
values (
  '90000000-0000-4000-8000-000000000001', 'Legacy opportunity', 'Calcio',
  'Portiere', 'player', 'male', '90000000-0000-4000-8000-000000000010',
  '90000000-0000-4000-8000-000000000010'
);
insert into public.applications(id,opportunity_id,athlete_id,status)
values (
  '90000000-0000-4000-8000-000000000002',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000020', 'submitted'
);

insert into public.sports(id,code) values
  ('91000000-0000-4000-8000-000000000001','football'),
  ('91000000-0000-4000-8000-000000000002','volleyball');
insert into public.sport_disciplines(id,sport_id,code) values
  ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','association_football'),
  ('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000002','indoor_volleyball');
insert into public.sport_variants(id,discipline_id,code) values
  ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','eleven_a_side'),
  ('93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','six_a_side');
insert into public.gender_categories(code,canonical_name) values ('male','Male'),('mixed','Mixed');
insert into public.player_positions(id,code,canonical_name) values
  ('94000000-0000-4000-8000-000000000001','association_football_goalkeeper','Goalkeeper');
insert into public.staff_roles(id,code,canonical_name) values
  ('95000000-0000-4000-8000-000000000001','photographer','Photographer');
insert into public.player_position_applicability(position_id,sport_id,discipline_id,variant_id)
values (
  '94000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001'
);

