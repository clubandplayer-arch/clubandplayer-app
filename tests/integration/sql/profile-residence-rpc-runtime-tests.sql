\set ON_ERROR_STOP on
-- Privilege metadata and signature
select test.assert(p.prosecdef = false, 'function must be SECURITY INVOKER')
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='update_my_profile_residence';
select test.assert(has_function_privilege('authenticated','public.update_my_profile_residence(uuid,uuid)','EXECUTE'),'authenticated execute grant');
select test.assert(not has_function_privilege('anon','public.update_my_profile_residence(uuid,uuid)','EXECUTE'),'anon execute revoked');
select test.assert(not has_function_privilege('public','public.update_my_profile_residence(uuid,uuid)','EXECUTE'),'PUBLIC execute revoked');

-- Anonymous denied.
set role anon;
do $$ begin
 perform public.update_my_profile_residence(null,null);
 raise exception 'expected anon denial';
exception when insufficient_privilege then null; end $$;
reset role;

-- Player full Italy, initial preferences absent, canonical-first result and unrelated fields preserved.
set role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',false);
select test.assert((public.update_my_profile_residence('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003')->>'source')='canonical','IT source');
select test.assert((select residence_region_id=1 and residence_province_id=2 and residence_municipality_id=3 and region='Sicilia' and province='Catania' and city='Catania' from public.profiles where user_id=auth.uid()),'IT legacy projection');
select test.assert((select residence_country_id='10000000-0000-0000-0000-000000000001' and residence_geo_area_id='20000000-0000-0000-0000-000000000003' from public.profile_preferences where profile_id='30000000-0000-0000-0000-000000000001'),'IT canonical preferences');
select test.assert((select birth_country='IT' and nationality='Italian' and interest_country='FR' and interest_region='Île-de-France' from public.profiles where user_id=auth.uid()),'unrelated profile fields unchanged');
select test.assert((select count(*)=1 from public.profile_country_interests where profile_id='30000000-0000-0000-0000-000000000001'),'country interests unchanged');
select test.assert((select count(*)=1 from public.profile_geo_area_interests where profile_id='30000000-0000-0000-0000-000000000001'),'geo interests unchanged');
select test.assert((select full_name='Mario Rossi' and display_name='Mario Rossi' and profile_visibility_status='published' and club_name_review_status='not_required' and region_id=1 and province_id=10 and municipality_id=100 from public.profiles where user_id=auth.uid()),'residence-only keeps names visibility moderation and legacy location IDs');
select test.assert((select raw_user_meta_data='{"full_name":"Mario Rossi"}'::jsonb and updated_at='2026-01-01'::timestamptz from auth.users where id=auth.uid()),'residence-only does not touch auth users');
select test.assert((select count(*)=0 from public.notifications where user_id=auth.uid()),'residence-only creates no visibility notification');

-- Reset.
select public.update_my_profile_residence(null,null);
select test.assert((select residence_country_id is null and residence_geo_area_id is null and open_to_relocation=false from public.profile_preferences where profile_id='30000000-0000-0000-0000-000000000001'),'reset canonical and relocation unchanged');
select test.assert((select region is null and province is null and city is null and residence_region_id is null and residence_province_id is null and residence_municipality_id is null from public.profiles where user_id=auth.uid()),'reset legacy');

-- Country-only.
select public.update_my_profile_residence('10000000-0000-0000-0000-000000000002',null);
select test.assert((select residence_country_id='10000000-0000-0000-0000-000000000002' and residence_geo_area_id is null from public.profile_preferences where profile_id='30000000-0000-0000-0000-000000000001'),'country only');

-- Foreign projections: FR, ES, CH with/without district, SI, PL.
select public.update_my_profile_residence('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000013');
select test.assert((select region='Île-de-France' and province='Paris' and city='Paris' and residence_region_id is null from public.profiles where user_id=auth.uid()),'FR projection');
select public.update_my_profile_residence('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000023');
select test.assert((select region='Madrid, Comunidad de' and province='Madrid' and city='Alcalá de Henares' from public.profiles where user_id=auth.uid()),'ES projection');
select public.update_my_profile_residence('10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000033');
select test.assert((select region='Ticino' and province='Lugano' and city='Lugano' from public.profiles where user_id=auth.uid()),'CH district projection');
select public.update_my_profile_residence('10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000035');
select test.assert((select region='Genève' and province is null and city='Genève' from public.profiles where user_id=auth.uid()),'CH no district projection');
select public.update_my_profile_residence('10000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000042');
select test.assert((select region='Osrednjeslovenska' and province is null and city='Ljubljana' from public.profiles where user_id=auth.uid()),'SI projection');
select public.update_my_profile_residence('10000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000053');
select test.assert((select region='Mazowieckie' and province='Warszawa' and city='Warszawa' and residence_region_id is null and residence_province_id is null and residence_municipality_id is null from public.profiles where user_id=auth.uid()),'PL projection and legacy IDs clear');

-- Invalid combinations and mapping errors.
do $$ begin perform public.update_my_profile_residence(null,'20000000-0000-0000-0000-000000000013'); raise exception 'expected area without country failure'; exception when sqlstate '22023' then null; end $$;
do $$ begin perform public.update_my_profile_residence('10000000-0000-0000-0000-000000000007',null); raise exception 'expected unsupported country failure'; exception when sqlstate '22023' then null; end $$;
do $$ begin perform public.update_my_profile_residence('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003'); raise exception 'expected mismatch failure'; exception when sqlstate '22023' then null; end $$;
do $$ begin perform public.update_my_profile_residence('10000000-0000-0000-0000-000000000002','29999999-0000-0000-0000-000000000099'); raise exception 'expected missing area failure'; exception when sqlstate '22023' then null; end $$;
do $$ begin perform public.update_my_profile_residence('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004'); raise exception 'expected missing mapping failure'; exception when sqlstate '22023' then null; end $$;
do $$ begin perform public.update_my_profile_residence('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000005'); raise exception 'expected ambiguous mapping failure'; exception when sqlstate '22023' then null; end $$;
reset role;

-- Staff allowed with initially absent preferences.
set role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000002',false);
select public.update_my_profile_residence('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000013');
select test.assert((select count(*)=1 from public.profile_preferences where profile_id='30000000-0000-0000-0000-000000000002'),'staff preference inserted');
reset role;

-- Ineligible roles denied.
set role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000003',false);
do $$ begin perform public.update_my_profile_residence(null,null); raise exception 'expected club denial'; exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000004',false);
do $$ begin perform public.update_my_profile_residence(null,null); raise exception 'expected fan denial'; exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000005',false);
do $$ begin perform public.update_my_profile_residence(null,null); raise exception 'expected institution denial'; exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub','49999999-0000-0000-0000-000000000099',false);
do $$ begin perform public.update_my_profile_residence(null,null); raise exception 'expected non-owner/no-profile denial'; exception when no_data_found then null; end $$;
reset role;

-- Inactive ancestor rejected.
update public.geo_areas set is_active=false where id='20000000-0000-0000-0000-000000000011';
set role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',false);
do $$ begin perform public.update_my_profile_residence('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000013'); raise exception 'expected inactive ancestor failure'; exception when sqlstate '22023' then null; end $$;
reset role;
update public.geo_areas set is_active=true where id='20000000-0000-0000-0000-000000000011';

-- Rollback when profiles write fails.
create function test.fail_profiles() returns trigger language plpgsql as $$ begin raise exception 'forced profiles failure'; end $$;
create trigger fail_profiles before update on public.profiles for each row execute function test.fail_profiles();
set role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',false);
do $$ begin perform public.update_my_profile_residence(null,null); raise exception 'expected profiles failure'; exception when others then if sqlerrm not like '%forced profiles failure%' then raise; end if; end $$;
reset role;
drop trigger fail_profiles on public.profiles;
select test.assert((select residence_country_id='10000000-0000-0000-0000-000000000006' from public.profile_preferences where profile_id='30000000-0000-0000-0000-000000000001'),'preferences unchanged after profiles failure');

-- Rollback profiles when preferences write fails.
create function test.fail_preferences() returns trigger language plpgsql as $$ begin raise exception 'forced preferences failure'; end $$;
create trigger fail_preferences before update or insert on public.profile_preferences for each row execute function test.fail_preferences();
set role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',false);
do $$ begin perform public.update_my_profile_residence(null,null); raise exception 'expected preferences failure'; exception when others then if sqlerrm not like '%forced preferences failure%' then raise; end if; end $$;
reset role;
drop trigger fail_preferences on public.profile_preferences;
select test.assert((select region='Mazowieckie' and province='Warszawa' and city='Warszawa' from public.profiles where id='30000000-0000-0000-0000-000000000001'),'profiles rollback after preferences failure');

-- Invalid UUID is rejected by PostgreSQL before function execution.
do $$ begin perform public.update_my_profile_residence('not-a-uuid'::uuid,null); raise exception 'expected UUID failure'; exception when invalid_text_representation then null; end $$;

-- Normal profile changes still execute the trigger behaviors.
set role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',false);
update public.profiles set full_name='mARIO rOSSI' where user_id=auth.uid();
select test.assert((select full_name='Mario Rossi' and display_name='Mario Rossi' from public.profiles where user_id=auth.uid()),'name change remains normalized');
select test.assert((select updated_at > '2026-01-01'::timestamptz and raw_user_meta_data->>'full_name'='Mario Rossi' from auth.users where id=auth.uid()),'name change still syncs auth metadata');
update public.profiles set role=null where user_id=auth.uid();
select test.assert((select profile_visibility_status='draft' from public.profiles where user_id=auth.uid()),'relevant completeness change recalculates visibility');
select test.assert((select count(*)=1 from public.notifications where user_id=auth.uid() and kind='profile_returned_to_draft'),'real published-to-draft transition notifies');
update public.profiles set municipality_id=null, province_id=10, region_id=null where user_id=auth.uid();
select test.assert((select municipality_id is null and province_id=10 and region_id=1 from public.profiles where user_id=auth.uid()),'location input change still coerces region');
reset role;

select 'B4_RPC_RUNTIME_PASS' as result;
