\set ON_ERROR_STOP on

do $$
declare
  v_nullable boolean;
  v_default text;
begin
  select is_nullable = 'YES', column_default
    into v_nullable, v_default
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'opportunities'
     and column_name = 'country_id';
  if v_nullable is distinct from true or v_default is not null then
    raise exception 'country_id must be nullable without a default';
  end if;

  select is_nullable = 'YES', column_default
    into v_nullable, v_default
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'opportunities'
     and column_name = 'geo_area_id';
  if v_nullable is distinct from true or v_default is not null then
    raise exception 'geo_area_id must be nullable without a default';
  end if;
end
$$;

do $$
begin
  if (select count(*) from public.opportunities) <> 1
     or (select count(*) from public.applications) <> 1 then
    raise exception 'C3 changed fixture cardinality';
  end if;

  if not exists (
    select 1 from public.opportunities
     where id = '30000000-0000-0000-0000-000000000001'
       and title = 'Legacy Opportunity'
       and country = 'Italia'
       and region = 'Lazio'
       and province = 'Roma'
       and city = 'Roma'
       and owner_id = '40000000-0000-0000-0000-000000000001'
       and created_by = '40000000-0000-0000-0000-000000000001'
       and club_id = '50000000-0000-0000-0000-000000000001'
       and country_id is null
       and geo_area_id is null
  ) then
    raise exception 'C3 did not preserve the legacy Opportunity';
  end if;

  if not exists (
    select 1 from public.applications
     where id = '60000000-0000-0000-0000-000000000001'
       and opportunity_id = '30000000-0000-0000-0000-000000000001'
       and athlete_id = '70000000-0000-0000-0000-000000000001'
       and club_id = '40000000-0000-0000-0000-000000000001'
       and status = 'submitted'
  ) then
    raise exception 'C3 changed the Application fixture';
  end if;
end
$$;

-- Valid states: country-only and a same-country canonical area.
update public.opportunities
   set country_id = '10000000-0000-0000-0000-000000000001'
 where id = '30000000-0000-0000-0000-000000000001';

update public.opportunities
   set geo_area_id = '20000000-0000-0000-0000-000000000001'
 where id = '30000000-0000-0000-0000-000000000001';

do $$
begin
  begin
    update public.opportunities
       set country_id = null
     where id = '30000000-0000-0000-0000-000000000001';
    raise exception 'area without country was accepted';
  exception when check_violation then
    null;
  end;

  begin
    update public.opportunities
       set country_id = '10000000-0000-0000-0000-000000000002'
     where id = '30000000-0000-0000-0000-000000000001';
    raise exception 'country/area mismatch was accepted';
  exception when foreign_key_violation then
    null;
  end;

  begin
    update public.opportunities
       set geo_area_id = '20000000-0000-0000-0000-000000000099'
     where id = '30000000-0000-0000-0000-000000000001';
    raise exception 'unknown area was accepted';
  exception when foreign_key_violation then
    null;
  end;

  begin
    update public.opportunities
       set country_id = '10000000-0000-0000-0000-000000000099',
           geo_area_id = null
     where id = '30000000-0000-0000-0000-000000000001';
    raise exception 'unknown country was accepted';
  exception when foreign_key_violation then
    null;
  end;
end
$$;

-- Transaction rollback preserves the previously committed valid state.
begin;
update public.opportunities
   set country_id = '10000000-0000-0000-0000-000000000002',
       geo_area_id = '20000000-0000-0000-0000-000000000002'
 where id = '30000000-0000-0000-0000-000000000001';
rollback;

do $$
begin
  if not exists (
    select 1 from public.opportunities
     where id = '30000000-0000-0000-0000-000000000001'
       and country_id = '10000000-0000-0000-0000-000000000001'
       and geo_area_id = '20000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'transaction rollback did not restore canonical geography';
  end if;

  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'opportunities_country_id_idx')
     or not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'opportunities_geo_area_id_idx') then
    raise exception 'canonical Opportunity indexes missing';
  end if;
end
$$;

select 'C3_OPPORTUNITY_GEOGRAPHY_RUNTIME_PASS' as result;
