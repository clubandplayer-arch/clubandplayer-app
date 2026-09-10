\set ON_ERROR_STOP on

do $$
begin
  if (select count(*) from public.gender_categories) <> 3 then raise exception 'expected 3 gender categories'; end if;
  if (select count(*) from public.competition_formats) <> 4 then raise exception 'expected 4 competition formats'; end if;
  if (select count(*) from public.territorial_scopes) <> 6 then raise exception 'expected 6 territorial scopes'; end if;
  if (select count(*) from public.player_positions) <> 97 then raise exception 'expected 97 player positions'; end if;
  if (select count(*) from public.staff_roles) <> 26 then raise exception 'expected 26 staff roles'; end if;
  if (select count(*) from public.player_position_applicability) <> 97 then raise exception 'expected 97 applicability rows'; end if;
  if (select count(*) from public.staff_role_applicability) <> 0 then raise exception 'staff roles must remain transversal'; end if;
  if (select count(*) from public.legacy_player_position_mappings) <> 97 then raise exception 'expected 97 player mappings'; end if;
  if (select count(*) from public.legacy_staff_role_mappings) <> 26 then raise exception 'expected 26 staff mappings'; end if;
  if (select count(*) from public.sports_organizations) <> 0 or (select count(*) from public.competitions) <> 0 then
    raise exception '5D-C must not claim organizations or competitions';
  end if;
  if to_regclass('public.opportunities') is not null or to_regclass('public.applications') is not null
     or to_regclass('public.athlete_experiences') is not null then
    raise exception 'protected runtime domain unexpectedly created';
  end if;
end $$;

select 'PHASE_5D_C_CONTROLLED_SPORTS_VOCABULARY_PASS' as result;
