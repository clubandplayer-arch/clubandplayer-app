\set ON_ERROR_STOP on

set role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', false);

select public.replace_my_athlete_experiences('[{"club_name":"Club A","sport":"Calcio","role":"Portiere","category":"Prima","start_year":2024,"end_year":2025,"sport_id":"60000000-0000-4000-8000-000000000001","sport_discipline_id":"70000000-0000-4000-8000-000000000001","sport_variant_id":"80000000-0000-4000-8000-000000000001"}]');
select test.assert((select count(*)=1 from public.athlete_experiences where sport='Calcio' and sport_variant_id='80000000-0000-4000-8000-000000000001'),'valid canonical experience inserted');

do $$ begin
  begin
    perform public.replace_my_athlete_experiences('[{"club_name":"Broken","sport":"Volley","role":"X","category":"X","start_year":2023,"end_year":2024,"sport_id":"60000000-0000-4000-8000-000000000002","sport_discipline_id":"70000000-0000-4000-8000-000000000002","sport_variant_id":"80000000-0000-4000-8000-000000000001"}]');
  exception when foreign_key_violation then null; end;
  perform test.assert((select count(*)=1 and min(club_name)='Club A' from public.athlete_experiences),'failed replacement rolls delete back atomically');
end $$;

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', false);
select public.replace_my_athlete_experiences('[{"club_name":"Club B","sport":"legacy unknown","role":"Coach","category":"Senior","start_year":2022,"end_year":2023}]');
select test.assert((select count(*)=1 from public.athlete_experiences e join public.profiles p on p.id=e.profile_id where p.user_id=auth.uid() and e.sport_id is null),'unknown legacy remains owner-scoped with null canonical IDs');

-- RLS must prevent a caller from mutating another owner's row. Do not use a
-- SELECT visibility assertion here: Production also has a public-read policy
-- for experiences attached to active profiles.
do $$ declare affected integer; begin
  delete from public.athlete_experiences e
  where e.profile_id=(select p.id from public.profiles p where p.user_id='40000000-0000-0000-0000-000000000001');
  get diagnostics affected = row_count;
  perform test.assert(affected=0,'RLS must prevent deletion of another owner experience');
end $$;

-- Privileged inspection is test-only and proves the row physically survived;
-- it does not weaken or bypass the policy used by the RPC caller above.
reset role;
select test.assert((select count(*)=1 from public.athlete_experiences e join public.profiles p on p.id=e.profile_id where p.user_id='40000000-0000-0000-0000-000000000001'),'other owner experience physically preserved');
set role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', false);

select public.replace_my_athlete_experiences('[]');
select test.assert((select count(*)=0 from public.athlete_experiences e join public.profiles p on p.id=e.profile_id where p.user_id=auth.uid()),'empty list atomically resets only own experiences');
reset role;

select test.assert((select count(*)=1 from public.athlete_experiences e join public.profiles p on p.id=e.profile_id where p.user_id='40000000-0000-0000-0000-000000000001'),'owner-two reset preserves owner-one row');

select 'PHASE_5F_EXPERIENCE_SPORT_PASS' result;
