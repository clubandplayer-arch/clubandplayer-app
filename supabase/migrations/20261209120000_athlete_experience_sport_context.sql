begin;

-- Additive only: existing legacy experiences remain untouched with null IDs.

alter table public.athlete_experiences
  add column if not exists sport_id uuid,
  add column if not exists sport_discipline_id uuid,
  add column if not exists sport_variant_id uuid;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.athlete_experiences'::regclass and conname='athlete_experiences_sport_fk') then
    alter table public.athlete_experiences add constraint athlete_experiences_sport_fk
      foreign key (sport_id) references public.sports(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.athlete_experiences'::regclass and conname='athlete_experiences_sport_discipline_fk') then
    alter table public.athlete_experiences add constraint athlete_experiences_sport_discipline_fk
      foreign key (sport_discipline_id, sport_id) references public.sport_disciplines(id, sport_id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.athlete_experiences'::regclass and conname='athlete_experiences_sport_variant_fk') then
    alter table public.athlete_experiences add constraint athlete_experiences_sport_variant_fk
      foreign key (sport_variant_id, sport_discipline_id) references public.sport_variants(id, discipline_id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.athlete_experiences'::regclass and conname='athlete_experiences_sport_shape_check') then
    alter table public.athlete_experiences add constraint athlete_experiences_sport_shape_check check (
      (sport_discipline_id is null or sport_id is not null)
      and (sport_variant_id is null or sport_discipline_id is not null)
    );
  end if;
end $$;

create or replace function public.replace_my_athlete_experiences(p_experiences jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile_id uuid;
  v_profile_count integer;
  v_count integer;
begin
  if v_uid is null then raise exception using errcode='42501', message='authentication required'; end if;
  if p_experiences is null or jsonb_typeof(p_experiences) <> 'array' then
    raise exception using errcode='22023', message='experiences must be an array';
  end if;
  if jsonb_array_length(p_experiences) > 50 then
    raise exception using errcode='22023', message='too many experiences';
  end if;

  select count(*) into v_profile_count from public.profiles p where p.user_id = v_uid;
  if v_profile_count = 0 then raise exception using errcode='P0002', message='profile not found'; end if;
  if v_profile_count > 1 then raise exception using errcode='21000', message='multiple profiles found'; end if;
  select p.id into v_profile_id from public.profiles p where p.user_id = v_uid;

  delete from public.athlete_experiences e where e.profile_id = v_profile_id;
  insert into public.athlete_experiences (
    profile_id, club_name, sport, role, category, start_year, end_year, is_current,
    sport_id, sport_discipline_id, sport_variant_id
  )
  select v_profile_id, x.club_name, x.sport, x.role, x.category, x.start_year, x.end_year,
    false, x.sport_id, x.sport_discipline_id, x.sport_variant_id
  from jsonb_to_recordset(p_experiences) as x(
    club_name text, sport text, role text, category text, start_year smallint, end_year smallint,
    sport_id uuid, sport_discipline_id uuid, sport_variant_id uuid
  );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.replace_my_athlete_experiences(jsonb) from public;
grant execute on function public.replace_my_athlete_experiences(jsonb) to authenticated;

commit;
