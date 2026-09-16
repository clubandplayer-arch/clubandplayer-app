begin;

-- Remove individual sports accidentally exposed by an earlier catalogue revision.
-- Records are retired, never deleted, so historical UUID references remain valid.
update public.legacy_sport_mappings set is_active=false
where normalized_source_value in ('sci','biathlon');

update public.sports_organization_categories c set is_active=false,updated_at=now()
from public.sports s where c.sport_id=s.id and s.code in ('skiing','biathlon');

update public.sports set is_active=false,updated_at=now()
where code in ('skiing','biathlon');

alter table public.athlete_experiences add column if not exists country_id uuid;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.athlete_experiences'::regclass and conname='athlete_experiences_country_fk') then
    alter table public.athlete_experiences add constraint athlete_experiences_country_fk
      foreign key(country_id) references public.countries(id) on delete restrict;
  end if;
end $$;

-- Recover the country for historical experiences already linked to a category.
update public.athlete_experiences e set country_id=c.country_id
from public.sports_organization_categories c
where e.country_id is null and e.sports_organization_category_id=c.id;

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

  if exists (
    select 1
    from jsonb_to_recordset(p_experiences) as x(
      sport_id uuid, sport_discipline_id uuid, sport_variant_id uuid,
      country_id uuid, sports_organization_id uuid, sports_organization_category_id uuid
    )
    left join public.countries country on country.id=x.country_id and country.is_active and country.is_supported
    left join public.sports_organization_categories c
      on c.id = x.sports_organization_category_id
      and c.organization_id = x.sports_organization_id
      and c.country_id = x.country_id
      and c.sport_id = x.sport_id
      and c.discipline_id is not distinct from x.sport_discipline_id
      and c.variant_id is not distinct from x.sport_variant_id
    where country.id is null
      or (x.sports_organization_id is null) <> (x.sports_organization_category_id is null)
      or (x.sports_organization_id is not null and c.id is null)
  ) then
    raise exception using errcode='23514', message='invalid experience organization membership';
  end if;

  delete from public.athlete_experiences e where e.profile_id = v_profile_id;
  insert into public.athlete_experiences (
    profile_id, club_name, sport, role, category, start_year, end_year, is_current,
    sport_id, sport_discipline_id, sport_variant_id, country_id,
    sports_organization_id, sports_organization_category_id
  )
  select v_profile_id, x.club_name, x.sport, x.role, x.category, x.start_year, x.end_year,
    false, x.sport_id, x.sport_discipline_id, x.sport_variant_id, x.country_id,
    x.sports_organization_id, x.sports_organization_category_id
  from jsonb_to_recordset(p_experiences) as x(
    club_name text, sport text, role text, category text, start_year smallint, end_year smallint,
    sport_id uuid, sport_discipline_id uuid, sport_variant_id uuid, country_id uuid,
    sports_organization_id uuid, sports_organization_category_id uuid
  );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.replace_my_athlete_experiences(jsonb) from public;
grant execute on function public.replace_my_athlete_experiences(jsonb) to authenticated;

commit;
