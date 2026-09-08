\set ON_ERROR_STOP on

insert into public.countries(id, iso2) values
 ('00000000-0000-0000-0000-000000000001','IT'),
 ('00000000-0000-0000-0000-000000000002','FR');
insert into public.geo_areas(id,country_id) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');
insert into public.sports(id,code) values
 ('20000000-0000-0000-0000-000000000001','football'),
 ('20000000-0000-0000-0000-000000000002','volleyball');
insert into public.sport_disciplines(id,sport_id,code) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','association_football'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','indoor_volleyball');
insert into public.sport_variants(id,discipline_id,code) values
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','eleven_a_side');

insert into public.gender_categories(code,canonical_name) values ('male','Male');
insert into public.competition_formats(code,canonical_name) values ('league','League');
insert into public.territorial_scopes(code,canonical_name,requires_country) values ('national','National',true);
insert into public.player_positions(id,code,canonical_name) values
 ('50000000-0000-0000-0000-000000000001','goalkeeper','Goalkeeper');
insert into public.staff_roles(id,code,canonical_name) values
 ('51000000-0000-0000-0000-000000000001','coach','Coach');
insert into public.player_position_applicability(position_id,sport_id) values
 ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
insert into public.staff_role_applicability(staff_role_id,sport_id) values
 ('51000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');

insert into public.sports_organizations(id,code,canonical_name,organization_type,primary_country_id,provider,source_record_id)
values ('60000000-0000-0000-0000-000000000001','figc','FIGC','federation','00000000-0000-0000-0000-000000000001','fixture','figc');
insert into public.competition_levels(id,organization_id,sport_id,code,canonical_name,country_id,level_rank)
values ('61000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','level_1','Level 1','00000000-0000-0000-0000-000000000001',1);
insert into public.age_classes(id,organization_id,sport_id,code,canonical_name,min_age,max_age)
values ('62000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','senior','Senior',18,99);
insert into public.seasons(id,organization_id,code,display_label,season_type,start_date,end_date)
values ('63000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','2026_27','2026/27','cross_year','2026-07-01','2027-06-30');
insert into public.competitions(id,organization_id,sport_id,discipline_id,variant_id,code,canonical_name,primary_country_id,territorial_scope_code,default_level_id,default_age_class_id,gender_code,format_code,provider,source_record_id)
values ('64000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','serie_a','Serie A','00000000-0000-0000-0000-000000000001','national','61000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','male','league','fixture','serie-a');
insert into public.competition_editions(id,competition_id,organization_id,sport_id,season_id,level_id,age_class_id,code,display_label)
values ('65000000-0000-0000-0000-000000000001','64000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','63000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','2026_27','Serie A 2026/27');
insert into public.competition_groups(id,edition_id,code,canonical_name)
values ('66000000-0000-0000-0000-000000000001','65000000-0000-0000-0000-000000000001','group_a','Group A');

-- Mismatched sport/discipline and variant chains must fail.
do $$ begin
  begin
    insert into public.player_position_applicability(position_id,sport_id,discipline_id)
    values ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002');
    raise exception 'expected mismatched discipline failure';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.competitions(organization_id,sport_id,discipline_id,variant_id,code,canonical_name,territorial_scope_code,provider,source_record_id)
    values ('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','bad','Bad','national','fixture','bad');
    raise exception 'expected mismatched variant failure';
  exception when foreign_key_violation then null; end;
end $$;

-- Hierarchy cycles fail closed.
insert into public.sports_organizations(id,code,canonical_name,organization_type,parent_id,provider,source_record_id)
values ('60000000-0000-0000-0000-000000000002','child','Child','league','60000000-0000-0000-0000-000000000001','fixture','child');
do $$ begin
  begin
    update public.sports_organizations set parent_id='60000000-0000-0000-0000-000000000002'
    where id='60000000-0000-0000-0000-000000000001';
    raise exception 'expected organization cycle failure';
  exception when raise_exception then
    if sqlerrm = 'expected organization cycle failure' then raise; end if;
  end;
end $$;

-- Existing protected domains were never required or modified by this harness.
do $$ begin
  if to_regclass('public.opportunities') is not null or to_regclass('public.applications') is not null
     or to_regclass('public.athlete_experiences') is not null then
    raise exception 'protected runtime domain unexpectedly created';
  end if;
end $$;

-- ACL + RLS: anonymous/authenticated read, non-admin writes denied, admin writes allowed.
set role anon;
select count(*) from public.competitions;
reset role;
insert into public.profiles(id,user_id,is_admin) values
 ('70000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001',false),
 ('70000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000002',true);
grant select on public.profiles to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',false);
do $$ begin
  begin
    insert into public.staff_roles(code,canonical_name) values ('forbidden','Forbidden');
    raise exception 'expected non-admin RLS failure';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000002',false);
insert into public.staff_roles(code,canonical_name) values ('analyst','Analyst');
reset role;

select 'PHASE_5C_CANONICAL_SPORTS_COMPETITION_SCHEMA_PASS' as result;
