-- Repair club profile geo fields from opportunities (safe/idempotent)
-- and normalize club display_name when it is an email.
--
-- Goals:
-- 1) backfill profiles.country/region/province/city for club profiles ONLY when target is null/empty
--    and opportunities for that club provide a UNIQUE non-empty value per field.
-- 2) normalize profiles.display_name for club profiles when it is an email and full_name is valid.
--
-- Safety:
-- - never invents geo values
-- - never overwrites non-empty profile geo fields
-- - never uses conflicting opportunity values (requires distinct_count = 1)

begin;

with club_profiles as (
  select p.id
  from public.profiles p
  where coalesce(lower(p.account_type), lower(p.type), '') = 'club'
),
opp_geo_raw as (
  select
    cp.id as profile_id,
    nullif(trim(o.country), '') as country,
    nullif(trim(o.region), '') as region,
    nullif(trim(o.province), '') as province,
    nullif(trim(o.city), '') as city
  from public.opportunities o
  join club_profiles cp
    on cp.id::text = coalesce(
      nullif(o.club_id::text, ''),
      nullif(o.owner_id::text, ''),
      nullif(o.created_by::text, '')
    )
),
opp_geo_agg as (
  select
    profile_id,
    case when count(distinct lower(country)) filter (where country is not null) = 1
      then min(country) filter (where country is not null)
      else null
    end as country_fill,
    case when count(distinct lower(region)) filter (where region is not null) = 1
      then min(region) filter (where region is not null)
      else null
    end as region_fill,
    case when count(distinct lower(province)) filter (where province is not null) = 1
      then min(province) filter (where province is not null)
      else null
    end as province_fill,
    case when count(distinct lower(city)) filter (where city is not null) = 1
      then min(city) filter (where city is not null)
      else null
    end as city_fill
  from opp_geo_raw
  group by profile_id
)
update public.profiles p
set
  country = case
    when nullif(trim(p.country), '') is null then a.country_fill
    else p.country
  end,
  region = case
    when nullif(trim(p.region), '') is null then a.region_fill
    else p.region
  end,
  province = case
    when nullif(trim(p.province), '') is null then a.province_fill
    else p.province
  end,
  city = case
    when nullif(trim(p.city), '') is null then a.city_fill
    else p.city
  end,
  updated_at = now()
from opp_geo_agg a
where p.id = a.profile_id
  and (
    (nullif(trim(p.country), '') is null and a.country_fill is not null) or
    (nullif(trim(p.region), '') is null and a.region_fill is not null) or
    (nullif(trim(p.province), '') is null and a.province_fill is not null) or
    (nullif(trim(p.city), '') is null and a.city_fill is not null)
  );

update public.profiles p
set
  display_name = nullif(trim(p.full_name), ''),
  updated_at = now()
where coalesce(lower(p.account_type), lower(p.type), '') = 'club'
  and nullif(trim(p.full_name), '') is not null
  and position('@' in coalesce(p.display_name, '')) > 0;

commit;
