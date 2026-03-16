set search_path = public, pg_temp;

-- GEO FOUNDATION 1
-- Completa la base canonica ID-based aggiungendo Campania (regione, province, comuni)
-- sorgente primaria: public.it_locations_stage (regione/provincia/comune)

do $$
declare
  has_regions boolean;
  has_provinces boolean;
  has_municipalities boolean;
  has_stage boolean;
  has_municipality_region_id boolean;
  campania_region_id bigint;
  source_rows integer;
  inserted_provinces integer := 0;
  inserted_municipalities integer := 0;
  campania_municipalities_count integer := 0;
  campania_provinces_count integer := 0;
  missing_expected_provinces integer := 0;
begin
  -- 1) Guardrail schema reale minimo richiesto dal codice applicativo
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'regions'
  ) into has_regions;

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'provinces'
  ) into has_provinces;

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'municipalities'
  ) into has_municipalities;

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'it_locations_stage'
  ) into has_stage;

  if not has_regions or not has_provinces or not has_municipalities then
    raise exception 'Missing canonical geo tables. regions=% provinces=% municipalities=%', has_regions, has_provinces, has_municipalities;
  end if;

  if not has_stage then
    raise exception 'Missing source table public.it_locations_stage';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='regions' and column_name='id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='regions' and column_name='name'
  ) then
    raise exception 'regions must expose columns (id, name)';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='provinces' and column_name='id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='provinces' and column_name='name'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='provinces' and column_name='region_id'
  ) then
    raise exception 'provinces must expose columns (id, name, region_id)';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='municipalities' and column_name='id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='municipalities' and column_name='name'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='municipalities' and column_name='province_id'
  ) then
    raise exception 'municipalities must expose columns (id, name, province_id)';
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='municipalities' and column_name='region_id'
  ) into has_municipality_region_id;

  -- 2) Sorgente Campania validata
  create temp table tmp_campania_source on commit drop as
  select distinct
    btrim(regione) as regione,
    btrim(provincia) as provincia,
    btrim(comune) as comune
  from public.it_locations_stage
  where btrim(regione) = 'Campania'
    and coalesce(btrim(provincia), '') <> ''
    and coalesce(btrim(comune), '') <> '';

  select count(*) into source_rows from tmp_campania_source;
  if source_rows = 0 then
    raise exception 'No Campania rows found in public.it_locations_stage';
  end if;

  -- 3) Regione Campania (idempotente)
  if not exists (select 1 from public.regions r where lower(btrim(r.name)) = 'campania') then
    insert into public.regions (name)
    values ('Campania');
  end if;

  select r.id
  into campania_region_id
  from public.regions r
  where lower(btrim(r.name)) = 'campania'
  order by r.id
  limit 1;

  if campania_region_id is null then
    raise exception 'Unable to resolve Campania region id after insert';
  end if;

  -- 4) Province campane attese (idempotente)
  create temp table tmp_expected_provinces (
    name text
  ) on commit drop;

  insert into tmp_expected_provinces (name)
  values
    ('Avellino'),
    ('Benevento'),
    ('Caserta'),
    ('Napoli'),
    ('Salerno');

  insert into public.provinces (name, region_id)
  select p.name, campania_region_id
  from tmp_expected_provinces p
  where not exists (
    select 1
    from public.provinces pr
    where pr.region_id = campania_region_id
      and lower(btrim(pr.name)) = lower(btrim(p.name))
  );

  get diagnostics inserted_provinces = row_count;

  -- 5) Municipi campani dalla sorgente validata (idempotente)
  if has_municipality_region_id then
    insert into public.municipalities (name, province_id, region_id)
    select s.comune, p.id, campania_region_id
    from tmp_campania_source s
    join public.provinces p
      on p.region_id = campania_region_id
     and lower(btrim(p.name)) = lower(btrim(s.provincia))
    where not exists (
      select 1
      from public.municipalities m
      where m.province_id = p.id
        and lower(btrim(m.name)) = lower(btrim(s.comune))
    );
  else
    insert into public.municipalities (name, province_id)
    select s.comune, p.id
    from tmp_campania_source s
    join public.provinces p
      on p.region_id = campania_region_id
     and lower(btrim(p.name)) = lower(btrim(s.provincia))
    where not exists (
      select 1
      from public.municipalities m
      where m.province_id = p.id
        and lower(btrim(m.name)) = lower(btrim(s.comune))
    );
  end if;

  get diagnostics inserted_municipalities = row_count;

  -- 6) Verifiche relazionali minime (NOTICE, non distruttive)
  select count(*)
  into campania_municipalities_count
  from public.municipalities m
  join public.provinces p on p.id = m.province_id
  where p.region_id = campania_region_id;

  select count(*)
  into campania_provinces_count
  from public.provinces p
  where p.region_id = campania_region_id;

  select count(*)
  into missing_expected_provinces
  from tmp_expected_provinces ep
  where not exists (
    select 1
    from public.provinces p
    where p.region_id = campania_region_id
      and lower(btrim(p.name)) = lower(btrim(ep.name))
  );

  raise notice 'Campania source rows=%', source_rows;
  raise notice 'Inserted provinces=%', inserted_provinces;
  raise notice 'Inserted municipalities=%', inserted_municipalities;
  raise notice 'Campania provinces total now=%', campania_provinces_count;
  raise notice 'Campania municipalities total now=%', campania_municipalities_count;
  raise notice 'Campania missing expected provinces=%', missing_expected_provinces;
end
$$;
