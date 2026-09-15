begin;

create or replace function public.validate_club_honor() returns trigger
language plpgsql set search_path = public as $$
declare
  season_start integer;
  season_end integer;
  latest_start integer;
begin
  season_start := split_part(new.season, '/', 1)::integer;
  season_end := split_part(new.season, '/', 2)::integer;
  latest_start := extract(year from current_date)::integer
    - case when extract(month from current_date) >= 7 then 1 else 2 end;
  if season_end <> season_start + 1 or season_start < 1900 or season_start > latest_start then
    raise exception 'invalid_club_honor_season';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = new.club_profile_id and p.account_type = 'club'
  ) then raise exception 'honor_requires_club_profile'; end if;
  if not exists (
    select 1
    from public.sports_organization_categories c
    join public.sports_organizations o on o.id = c.organization_id
    join public.profiles p on p.id = new.club_profile_id
    left join public.profile_preferences pp on pp.profile_id = p.id
    left join public.legacy_country_mappings lcm
      on lcm.normalized_source_value = lower(trim(p.country)) and lcm.is_active
    where c.id = new.sports_organization_category_id
      and c.organization_id = new.sports_organization_id
      and c.sport_id = new.sport_id
      and c.discipline_id is not distinct from new.sport_discipline_id
      and c.variant_id is not distinct from new.sport_variant_id
      and c.is_active and o.is_active
      and c.country_id = coalesce(pp.residence_country_id, lcm.country_id)
  ) then raise exception 'incompatible_club_honor_country'; end if;
  new.updated_at = now();
  return new;
end $$;

commit;
