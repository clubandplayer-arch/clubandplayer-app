-- PREVIEW-ONLY recovery runbook for fase6-github (jbovlevodfouwuvtdlja).
-- Run this whole file once in that project's SQL Editor. Never run on Production.
-- It applies exactly 20261211130000_complete_profile_edit_schema and records the
-- version only after all expected effects have been verified in the same transaction.

begin;
set local lock_timeout = '5s';

do $preflight$
begin
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20261211120000' and name = 'add_seven_a_side_football_variant'
  ) then
    raise exception 'PREVIEW GUARD: verified Phase 6 head 20261211120000 is absent';
  end if;

  if exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20261211130000'
  ) then
    raise exception 'PREVIEW GUARD: migration 20261211130000 is already recorded';
  end if;

  if to_regclass('public.profiles') is null
     or to_regclass('public.regions') is null
     or to_regclass('public.provinces') is null
     or to_regclass('public.municipalities') is null then
    raise exception 'PREVIEW GUARD: required profile/geography schema is incomplete';
  end if;
end
$preflight$;

alter table public.profiles
  add column if not exists birth_place text,
  add column if not exists birth_country text,
  add column if not exists birth_region_id bigint references public.regions(id) on delete set null,
  add column if not exists birth_province_id bigint references public.provinces(id) on delete set null,
  add column if not exists birth_municipality_id bigint references public.municipalities(id) on delete set null,
  add column if not exists residence_region_id bigint references public.regions(id) on delete set null,
  add column if not exists residence_province_id bigint references public.provinces(id) on delete set null,
  add column if not exists residence_municipality_id bigint references public.municipalities(id) on delete set null,
  add column if not exists foot text,
  add column if not exists visibility text,
  add column if not exists notify_email_new_message boolean not null default true,
  add column if not exists club_foundation_year integer,
  add column if not exists club_stadium text,
  add column if not exists club_stadium_address text,
  add column if not exists club_stadium_lat double precision,
  add column if not exists club_stadium_lng double precision,
  add column if not exists club_league_category text,
  add column if not exists club_motto text;

comment on column public.profiles.birth_country is
  'Legacy ISO2 birth country used by the current Profile Edit compatibility contract.';
comment on column public.profiles.notify_email_new_message is
  'Current Profile Edit notification preference; defaults on for existing client compatibility.';

do $verify$
declare
  missing_columns text[];
begin
  select array_agg(expected.name order by expected.name)
  into missing_columns
  from unnest(array[
    'birth_place', 'birth_country', 'birth_region_id', 'birth_province_id',
    'birth_municipality_id', 'residence_region_id', 'residence_province_id',
    'residence_municipality_id', 'foot', 'visibility',
    'notify_email_new_message', 'club_foundation_year', 'club_stadium',
    'club_stadium_address', 'club_stadium_lat', 'club_stadium_lng',
    'club_league_category', 'club_motto'
  ]) as expected(name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'profiles'
      and c.column_name = expected.name
  );

  if missing_columns is not null then
    raise exception 'EFFECT CHECK FAILED: missing profiles columns %', missing_columns;
  end if;
end
$verify$;

insert into supabase_migrations.schema_migrations(version, name, statements)
values (
  '20261211130000',
  'complete_profile_edit_schema',
  array['Manual Preview recovery: effects verified atomically; canonical SQL remains in supabase/migrations/20261211130000_complete_profile_edit_schema.sql']
);

notify pgrst, 'reload schema';
commit;

select json_build_object(
  'projectRefExpected', 'jbovlevodfouwuvtdlja',
  'version', version,
  'name', name,
  'status', 'applied_and_effects_verified'
) as phase_6_preview_profile_schema_result
from supabase_migrations.schema_migrations
where version = '20261211130000';
