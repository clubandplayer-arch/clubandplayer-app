\set ON_ERROR_STOP on

select test.assert(
  (select sport = 'Calcio' and sport_id is null and sport_discipline_id is null and sport_variant_id is null
   from public.profiles where id = '30000000-0000-0000-0000-000000000001'),
  'legacy profile must survive with nullable canonical columns'
);

select test.assert(
  (select count(*) = 4 from pg_constraint
   where conrelid = 'public.profiles'::regclass and conname like 'profiles_primary_sport%'),
  'all four primary sport constraints must exist exactly once'
);
select test.assert(
  (select count(*) = 9 and bool_and(tgenabled = 'O') from pg_trigger
   where tgrelid = 'public.profiles'::regclass and not tgisinternal),
  'the nine-trigger Production compatibility fixture must remain installed and enabled'
);

-- Valid sport-only, discipline and full-variant chains.
update public.profiles set
  sport = 'Calcio', sport_id = '60000000-0000-4000-8000-000000000001'
where id = '30000000-0000-0000-0000-000000000001';
update public.profiles set
  sport_discipline_id = '70000000-0000-4000-8000-000000000001'
where id = '30000000-0000-0000-0000-000000000001';
update public.profiles set
  sport_variant_id = '80000000-0000-4000-8000-000000000001'
where id = '30000000-0000-0000-0000-000000000001';
select test.assert(
  (select profile_visibility_status = 'published' from public.profiles
   where id = '30000000-0000-0000-0000-000000000001'),
  'canonical-only updates must remain compatible with the existing visibility trigger'
);

-- The authenticated caller can update only the Profile selected by auth.uid().
set role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', false);
update public.profiles set
  sport = 'Calcio',
  sport_id = '60000000-0000-4000-8000-000000000001',
  sport_discipline_id = '70000000-0000-4000-8000-000000000001',
  sport_variant_id = '80000000-0000-4000-8000-000000000001'
where user_id = auth.uid();
select test.assert((select sport_id = '60000000-0000-4000-8000-000000000001'
  and sport_discipline_id = '70000000-0000-4000-8000-000000000001'
  and sport_variant_id = '80000000-0000-4000-8000-000000000001'
  from public.profiles where user_id = auth.uid()),
  'authenticated owner must update its complete primary-sport group');
select test.assert((select count(*) = 0 from public.profiles
  where user_id = '40000000-0000-0000-0000-000000000002' and sport_id is not null),
  'owner-scoped update must not affect another Profile');
do $$
declare affected integer;
begin
  update public.profiles set sport = 'Unauthorized'
  where user_id = '40000000-0000-0000-0000-000000000002';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'RLS must hide another user Profile from UPDATE');
end
$$;
reset role;

-- Missing references, invalid shape, cross-sport and cross-discipline chains fail.
do $$
declare
  failed boolean;
begin
  failed := false;
  begin
    update public.profiles set sport_id = '60000000-0000-4000-8000-000000000099'
    where id = '30000000-0000-0000-0000-000000000001';
  exception when foreign_key_violation then failed := true; end;
  perform test.assert(failed, 'missing sport reference must fail');

  failed := false;
  begin
    update public.profiles set sport_id = null
    where id = '30000000-0000-0000-0000-000000000001';
  exception when check_violation then failed := true; end;
  perform test.assert(failed, 'discipline without sport must fail');

  failed := false;
  begin
    update public.profiles set
      sport_id = '60000000-0000-4000-8000-000000000001',
      sport_discipline_id = '70000000-0000-4000-8000-000000000002',
      sport_variant_id = null
    where id = '30000000-0000-0000-0000-000000000001';
  exception when foreign_key_violation then failed := true; end;
  perform test.assert(failed, 'cross-sport discipline must fail');

  failed := false;
  begin
    update public.profiles set
      sport_id = '60000000-0000-4000-8000-000000000001',
      sport_discipline_id = '70000000-0000-4000-8000-000000000001',
      sport_variant_id = '80000000-0000-4000-8000-000000000002'
    where id = '30000000-0000-0000-0000-000000000001';
  exception when foreign_key_violation then failed := true; end;
  perform test.assert(failed, 'cross-discipline variant must fail');
end
$$;

-- A failed UPDATE cannot leave either the legacy value or one canonical ID changed.
do $$
begin
  begin
    update public.profiles set
      sport = 'Volley',
      sport_id = '60000000-0000-4000-8000-000000000002',
      sport_discipline_id = '70000000-0000-4000-8000-000000000002',
      sport_variant_id = '80000000-0000-4000-8000-000000000001'
    where id = '30000000-0000-0000-0000-000000000001';
  exception when foreign_key_violation then null; end;
  perform test.assert(
    (select sport = 'Calcio'
      and sport_id = '60000000-0000-4000-8000-000000000001'
      and sport_discipline_id = '70000000-0000-4000-8000-000000000001'
      and sport_variant_id = '80000000-0000-4000-8000-000000000001'
     from public.profiles where id = '30000000-0000-0000-0000-000000000001'),
    'failed UPDATE must not partially modify the four-column group'
  );
end
$$;

-- UPSERT uses the same atomic constraint boundary.
insert into public.profiles(
  id, user_id, account_type, sport, sport_id, sport_discipline_id, sport_variant_id
) values (
  '90000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000012', 'club',
  'Volley', '60000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000002'
) on conflict (user_id) do update set
  sport = excluded.sport,
  sport_id = excluded.sport_id,
  sport_discipline_id = excluded.sport_discipline_id,
  sport_variant_id = excluded.sport_variant_id;

do $$
begin
  begin
    insert into public.profiles(
      id, user_id, account_type, sport, sport_id, sport_discipline_id, sport_variant_id
    ) values (
      '90000000-0000-4000-8000-000000000099', '90000000-0000-4000-8000-000000000012', 'club',
      'Broken', '60000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002'
    ) on conflict (user_id) do update set
      sport = excluded.sport,
      sport_id = excluded.sport_id,
      sport_discipline_id = excluded.sport_discipline_id,
      sport_variant_id = excluded.sport_variant_id;
  exception when foreign_key_violation then null; end;
  perform test.assert(
    (select sport = 'Volley'
      and sport_id = '60000000-0000-4000-8000-000000000002'
      and sport_variant_id = '80000000-0000-4000-8000-000000000002'
     from public.profiles where user_id = '90000000-0000-4000-8000-000000000012'),
    'failed UPSERT must preserve the complete previous group'
  );
end
$$;

-- Explicit transaction rollback leaves no valid intermediate mutation behind.
begin;
update public.profiles set
  sport = 'Volley',
  sport_id = '60000000-0000-4000-8000-000000000002',
  sport_discipline_id = '70000000-0000-4000-8000-000000000002',
  sport_variant_id = '80000000-0000-4000-8000-000000000002'
where id = '30000000-0000-0000-0000-000000000001';
rollback;
select test.assert(
  (select sport = 'Calcio' and sport_id = '60000000-0000-4000-8000-000000000001'
   from public.profiles where id = '30000000-0000-0000-0000-000000000001'),
  'rollback must restore the complete previous group'
);

select 'PHASE_5F_A_PROFILE_PRIMARY_SPORT_PASS' as result;
