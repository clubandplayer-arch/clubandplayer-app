do $$
begin
  if (select count(*) from public.gender_classes) <> 3 then raise exception 'unexpected gender class count'; end if;
  if (select count(*) from public.competition_formats) <> 5 then raise exception 'unexpected format count'; end if;
  if (select count(*) from public.staff_roles) <> 26 then raise exception 'unexpected staff role count'; end if;
  if (select count(*) from public.legacy_staff_role_mappings) <> 26 then raise exception 'unexpected staff mapping count'; end if;
  if (select count(*) from public.player_roles) <> 95 then raise exception 'unexpected player role count: %', (select count(*) from public.player_roles); end if;
  if (select count(*) from public.legacy_player_role_mappings) <> 95 then raise exception 'unexpected player mapping count'; end if;
  if (select count(*) from public.sports_organizations) <> 0 then raise exception 'organizations seeded without provenance'; end if;
  if (select count(*) from public.competitions) <> 0 then raise exception 'competitions seeded without provenance'; end if;
  if (select count(*) from public.competition_seasons) <> 0 then raise exception 'seasons seeded without provenance'; end if;
  if (select count(*) from public.opportunities where sport='Calcio' and sport_id is null) <> 1 then raise exception 'Opportunity changed/backfilled'; end if;
  if (select count(*) from public.athlete_experiences where sport='Calcio' and sport_id is null) <> 1 then raise exception 'experience changed/backfilled'; end if;
end
$$;

set role anon;
select count(*) from public.gender_classes;
do $$ begin
  begin perform count(*) from public.legacy_staff_role_mappings; raise exception 'anon mapping read accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000001', false);
select count(*) from public.legacy_staff_role_mappings;
reset role;

do $$
begin
  if has_table_privilege('anon','public.legacy_staff_role_mappings','SELECT') then raise exception 'anon mapping grant present'; end if;
  if not has_table_privilege('authenticated','public.legacy_staff_role_mappings','SELECT') then raise exception 'authenticated mapping grant missing'; end if;
end
$$;
