-- GEO SEARCH DATA AUDIT
-- Purpose: validate geo consistency used by web search geo-first.
-- Safe: read-only diagnostics.

-- 1) Club profiles geo completeness
select
  count(*) as clubs_total,
  count(*) filter (where nullif(trim(country), '') is null) as clubs_country_missing,
  count(*) filter (where nullif(trim(region), '') is null) as clubs_region_missing,
  count(*) filter (where nullif(trim(province), '') is null) as clubs_province_missing,
  count(*) filter (where nullif(trim(city), '') is null) as clubs_city_missing,
  count(*) filter (
    where nullif(trim(country), '') is null
       or nullif(trim(region), '') is null
       or nullif(trim(province), '') is null
       or nullif(trim(city), '') is null
  ) as clubs_geo_incomplete
from public.profiles
where coalesce(lower(account_type), lower(type), '') = 'club';

-- 2) Opportunities geo completeness
select
  count(*) as opp_total,
  count(*) filter (where nullif(trim(country), '') is null) as opp_country_missing,
  count(*) filter (where nullif(trim(region), '') is null) as opp_region_missing,
  count(*) filter (where nullif(trim(province), '') is null) as opp_province_missing,
  count(*) filter (where nullif(trim(city), '') is null) as opp_city_missing,
  count(*) filter (
    where nullif(trim(country), '') is null
       or nullif(trim(region), '') is null
       or nullif(trim(province), '') is null
       or nullif(trim(city), '') is null
  ) as opp_geo_incomplete
from public.opportunities;

-- 3) Club profile vs opportunities mismatch on geo
with club_profiles as (
  select id, display_name, full_name, country, region, province, city
  from public.profiles
  where coalesce(lower(account_type), lower(type), '') = 'club'
),
opp_geo as (
  select
    coalesce(nullif(o.club_id::text, ''), nullif(o.owner_id::text, ''), nullif(o.created_by::text, '')) as profile_id,
    nullif(trim(o.country), '') as country,
    nullif(trim(o.region), '') as region,
    nullif(trim(o.province), '') as province,
    nullif(trim(o.city), '') as city
  from public.opportunities o
),
opp_geo_agg as (
  select
    profile_id,
    min(country) filter (where country is not null) as opp_country_any,
    min(region) filter (where region is not null) as opp_region_any,
    min(province) filter (where province is not null) as opp_province_any,
    min(city) filter (where city is not null) as opp_city_any,
    count(distinct lower(country)) filter (where country is not null) as opp_country_distinct,
    count(distinct lower(region)) filter (where region is not null) as opp_region_distinct,
    count(distinct lower(province)) filter (where province is not null) as opp_province_distinct,
    count(distinct lower(city)) filter (where city is not null) as opp_city_distinct
  from opp_geo
  where profile_id is not null
  group by profile_id
)
select
  cp.id,
  cp.display_name,
  cp.full_name,
  cp.country as profile_country,
  oga.opp_country_any,
  oga.opp_country_distinct,
  cp.region as profile_region,
  oga.opp_region_any,
  oga.opp_region_distinct,
  cp.province as profile_province,
  oga.opp_province_any,
  oga.opp_province_distinct,
  cp.city as profile_city,
  oga.opp_city_any,
  oga.opp_city_distinct
from club_profiles cp
join opp_geo_agg oga on oga.profile_id = cp.id::text
where
  (nullif(trim(cp.country), '') is distinct from oga.opp_country_any and oga.opp_country_distinct = 1)
  or (nullif(trim(cp.region), '') is distinct from oga.opp_region_any and oga.opp_region_distinct = 1)
  or (nullif(trim(cp.province), '') is distinct from oga.opp_province_any and oga.opp_province_distinct = 1)
  or (nullif(trim(cp.city), '') is distinct from oga.opp_city_any and oga.opp_city_distinct = 1)
order by cp.display_name nulls last;

-- 4) Club names that look like email
select
  id,
  display_name,
  full_name,
  account_type,
  type
from public.profiles
where coalesce(lower(account_type), lower(type), '') = 'club'
  and position('@' in coalesce(display_name, '')) > 0
order by display_name;

-- 5) Focus clubs mentioned in bug report
select
  id,
  display_name,
  full_name,
  country,
  region,
  province,
  city,
  account_type,
  type
from public.profiles
where coalesce(lower(account_type), lower(type), '') = 'club'
  and (
    coalesce(display_name, '') ilike '%ASD Club Atlético Carlentini%'
    or coalesce(full_name, '') ilike '%ASD Club Atlético Carlentini%'
    or coalesce(display_name, '') ilike '%ASD Volley Carlentini%'
    or coalesce(full_name, '') ilike '%ASD Volley Carlentini%'
    or coalesce(display_name, '') ilike '%Club And Player%'
    or coalesce(full_name, '') ilike '%Club And Player%'
  );

-- 6) Opportunities in Sicilia / Siracusa / Carlentini
select
  id,
  title,
  club_id,
  owner_id,
  created_by,
  club_name,
  country,
  region,
  province,
  city,
  sport,
  role,
  category,
  required_category,
  status,
  created_at
from public.opportunities
where coalesce(country, '') ilike 'Italia'
  and coalesce(region, '') ilike 'Sicilia'
  and (
    coalesce(province, '') ilike 'Siracusa'
    or coalesce(city, '') ilike 'Carlentini'
  )
order by created_at desc;

-- 7) Player geo completeness audit
select
  count(*) as players_total,
  count(*) filter (where nullif(trim(country), '') is null) as players_country_missing,
  count(*) filter (where nullif(trim(region), '') is null) as players_region_missing,
  count(*) filter (where nullif(trim(province), '') is null) as players_province_missing,
  count(*) filter (where nullif(trim(city), '') is null) as players_city_missing,
  count(*) filter (
    where nullif(trim(country), '') is null
       or nullif(trim(region), '') is null
       or nullif(trim(province), '') is null
       or nullif(trim(city), '') is null
  ) as players_geo_incomplete
from public.profiles
where coalesce(lower(account_type), lower(type), '') = 'athlete';

-- 8) Player rows with geo missing (sample)
select
  id,
  display_name,
  full_name,
  country,
  region,
  province,
  city,
  interest_country,
  interest_region,
  interest_province,
  interest_city,
  sport,
  role
from public.profiles
where coalesce(lower(account_type), lower(type), '') = 'athlete'
  and (
    nullif(trim(country), '') is null
    or nullif(trim(region), '') is null
    or nullif(trim(province), '') is null
    or nullif(trim(city), '') is null
  )
order by updated_at desc nulls last
limit 200;
