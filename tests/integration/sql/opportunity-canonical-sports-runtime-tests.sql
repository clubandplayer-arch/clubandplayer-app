\set ON_ERROR_STOP on

do $$
declare c text;
begin
  foreach c in array array['sport_id','sport_discipline_id','sport_variant_id','player_position_id','staff_role_id','gender_code'] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='opportunities' and column_name=c
        and is_nullable='YES' and column_default is null
    ) then raise exception '% must be nullable without a default', c; end if;
  end loop;
  if not exists (
    select 1 from public.opportunities where id='90000000-0000-4000-8000-000000000001'
      and sport='Calcio' and role='Portiere' and gender='male'
      and sport_id is null and sport_discipline_id is null and sport_variant_id is null
      and player_position_id is null and staff_role_id is null and gender_code is null
  ) then raise exception 'legacy row was not preserved'; end if;
  if (select count(*) from public.applications) <> 1 then
    raise exception 'Applications changed during the migration';
  end if;
end $$;

-- One valid canonical Player write.
update public.opportunities set
  sport_id='91000000-0000-4000-8000-000000000001',
  sport_discipline_id='92000000-0000-4000-8000-000000000001',
  sport_variant_id='93000000-0000-4000-8000-000000000001',
  player_position_id='94000000-0000-4000-8000-000000000001',
  gender_code='male'
where id='90000000-0000-4000-8000-000000000001';

do $$ begin
  -- Cross-sport discipline and variant chains fail.
  begin
    update public.opportunities set sport_discipline_id='92000000-0000-4000-8000-000000000002';
    raise exception 'cross-sport discipline accepted';
  exception when foreign_key_violation then null; end;
  begin
    update public.opportunities set sport_variant_id='93000000-0000-4000-8000-000000000002';
    raise exception 'cross-discipline variant accepted';
  exception when foreign_key_violation then null; end;

  -- Unknown role IDs, dual references and references for the wrong role_group fail.
  begin
    update public.opportunities set player_position_id='94000000-0000-4000-8000-000000000099';
    raise exception 'unknown player position accepted';
  exception when foreign_key_violation then null; end;
  begin
    update public.opportunities set staff_role_id='95000000-0000-4000-8000-000000000001';
    raise exception 'player/staff references accepted together';
  exception when check_violation then null; end;
  begin
    update public.opportunities set role_group='staff';
    raise exception 'role_group changed with residual player reference';
  exception when check_violation then null; end;
end $$;

-- A partial legacy update preserves canonical context.
update public.opportunities set title='Updated title'
where id='90000000-0000-4000-8000-000000000001';
do $$ begin
  if not exists (select 1 from public.opportunities
    where title='Updated title' and player_position_id='94000000-0000-4000-8000-000000000001') then
    raise exception 'partial update cleared canonical context';
  end if;
end $$;

-- Role-group transition clears the incompatible reference in the same statement.
update public.opportunities set
  role_group='staff', player_position_id=null,
  staff_role_id='95000000-0000-4000-8000-000000000001', role='Fotografo'
where id='90000000-0000-4000-8000-000000000001';

-- A failed multi-column write is atomic and preserves the committed Staff state.
do $$ begin
  begin
    update public.opportunities set
      title='Must roll back', sport_id='91000000-0000-4000-8000-000000000002',
      sport_discipline_id='92000000-0000-4000-8000-000000000001';
    raise exception 'invalid atomic update accepted';
  exception when foreign_key_violation then null; end;
  if not exists (select 1 from public.opportunities
    where title='Updated title' and role_group='staff'
      and player_position_id is null
      and staff_role_id='95000000-0000-4000-8000-000000000001') then
    raise exception 'failed write left partial state';
  end if;
end $$;

-- Explicit reset clears only canonical context and preserves legacy/Application data.
update public.opportunities set
  sport_id=null, sport_discipline_id=null, sport_variant_id=null,
  player_position_id=null, staff_role_id=null, gender_code=null
where id='90000000-0000-4000-8000-000000000001';
do $$ begin
  if not exists (select 1 from public.opportunities
    where sport='Calcio' and role='Fotografo' and role_group='staff'
      and sport_id is null and player_position_id is null and staff_role_id is null)
    or (select count(*) from public.applications where status='submitted') <> 1 then
    raise exception 'reset changed legacy or Application state';
  end if;
end $$;

select 'PHASE_5G_OPPORTUNITY_CANONICAL_SPORTS_RUNTIME_PASS' as result;

