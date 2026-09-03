do $$
declare
  organization_id uuid;
  competition_id uuid;
  season_id uuid;
begin
  if (select count(*) from public.opportunities where sport = 'Calcio' and role = 'Portiere' and category = 'Serie D') <> 1 then
    raise exception 'legacy Opportunity mutated';
  end if;
  if (select count(*) from public.athlete_experiences where sport = 'Calcio' and club_name = 'Legacy Club') <> 1 then
    raise exception 'legacy experience mutated';
  end if;
  if exists (select 1 from public.opportunities o where o.sport_id is not null or o.competition_id is not null) then
    raise exception 'canonical Opportunity columns were backfilled';
  end if;

  insert into public.sports_organizations(code, canonical_name, country_id, organization_type, territorial_scope)
  values ('figc_test', 'FIGC Test', '10000000-0000-0000-0000-000000000001', 'federation', 'NATIONAL') returning id into organization_id;
  insert into public.sports_organization_sports(organization_id, sport_id)
  values (organization_id, '20000000-0000-0000-0000-000000000001');
  insert into public.competitions(organization_id, sport_id, discipline_id, variant_id, country_id, code, canonical_name, territorial_scope)
  values (organization_id, '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'campionato_test', 'Campionato Test', 'NATIONAL')
  returning id into competition_id;
  insert into public.competition_seasons(competition_id, code, display_label, starts_on, ends_on)
  values (competition_id, '2026_27', '2026/27', date '2026-07-01', date '2027-06-30') returning id into season_id;
  insert into public.competition_groups(competition_id, season_id, code, canonical_name)
  values (competition_id, season_id, 'girone_a', 'Girone A');

  insert into public.sports(id, code) values ('20000000-0000-0000-0000-000000000002', 'basketball');
  insert into public.sport_disciplines(id, sport_id, code) values (
    '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'basketball_test'
  );
  begin
    insert into public.competitions(organization_id, sport_id, discipline_id, code, canonical_name, territorial_scope)
    values (organization_id, '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'bad_tuple', 'Bad', 'NATIONAL');
    raise exception 'cross-sport discipline accepted';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into public.competition_seasons(competition_id, code, display_label, starts_on, ends_on)
    values (competition_id, 'bad_dates', 'Bad dates', date '2027-01-01', date '2026-01-01');
    raise exception 'invalid season dates accepted';
  exception when check_violation then null;
  end;

  insert into public.profile_sports(profile_id, sport_id, is_primary)
  values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', true);
  begin
    insert into public.profile_sports(profile_id, sport_id, is_primary)
    values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', true);
    raise exception 'multiple primary sports accepted';
  exception when unique_violation then null;
  end;
end
$$;

-- Catalogues are readable but not writable by anon.
set role anon;
select count(*) from public.competitions;
do $$ begin
  begin
    insert into public.gender_classes(code, canonical_name) values ('anon_write', 'Anon write');
    raise exception 'anon catalogue write accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Owner can manage profile_sports; a different authenticated user cannot.
set role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000001', false);
select count(*) from public.profile_sports;
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000002', false);
do $$
begin
  if (select count(*) from public.profile_sports) <> 0 then
    raise exception 'non-owner can read profile sports';
  end if;
end
$$;
reset role;

do $$
begin
  if has_table_privilege('anon', 'public.gender_classes', 'INSERT') then raise exception 'anon insert grant present'; end if;
  if not has_table_privilege('authenticated', 'public.gender_classes', 'INSERT') then raise exception 'authenticated admin path lacks grant'; end if;
  if has_table_privilege('anon', 'public.profile_sports', 'SELECT') then raise exception 'anon profile sports grant present'; end if;
  if to_regclass('public.applications') is not null then raise exception 'migration created or touched applications'; end if;
end
$$;
