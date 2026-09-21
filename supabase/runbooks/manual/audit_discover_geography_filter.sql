-- Read-only production audit for the explicit geography filter used by /discover.
-- Run the whole script in Supabase SQL Editor. It creates only session-local
-- temporary views and never changes application data.

drop view if exists pg_temp.discover_geography_match_audit;

create temporary view discover_geography_match_audit as
with canonical_residence as (
  select
    preferences.profile_id,
    preferences.residence_country_id as matched_country_id,
    'canonical_residence'::text as match_source
  from public.profile_preferences preferences
  where preferences.residence_country_id is not null
),
canonical_country_interest as (
  select
    interest.profile_id,
    interest.country_id as matched_country_id,
    'canonical_country_interest'::text as match_source
  from public.profile_country_interests interest
),
canonical_area_interest as (
  select
    interest.profile_id,
    area.country_id as matched_country_id,
    'canonical_area_interest'::text as match_source
  from public.profile_geo_area_interests interest
  join public.geo_areas area on area.id = interest.geo_area_id
),
legacy_residence as (
  select profile.id as profile_id, country.id as matched_country_id,
    'legacy_residence'::text as match_source
  from public.profiles profile
  join public.countries country on country.is_active
    and lower(trim(profile.country)) in (
      lower(country.iso2), lower(country.official_name),
      case country.iso2
        when 'IT' then 'italia' when 'FR' then 'francia'
        when 'ES' then 'spagna' when 'CH' then 'svizzera'
        when 'SI' then 'slovenia' when 'PL' then 'polonia'
      end
    )
  where profile.country is not null
),
legacy_interest as (
  select profile.id as profile_id, country.id as matched_country_id,
    'legacy_interest'::text as match_source
  from public.profiles profile
  join public.countries country on country.is_active
    and lower(trim(profile.interest_country)) in (
      lower(country.iso2), lower(country.official_name),
      case country.iso2
        when 'IT' then 'italia' when 'FR' then 'francia'
        when 'ES' then 'spagna' when 'CH' then 'svizzera'
        when 'SI' then 'slovenia' when 'PL' then 'polonia'
      end
    )
  where profile.interest_country is not null
),
matches as (
  select * from canonical_residence
  union all select * from canonical_country_interest
  union all select * from canonical_area_interest
  union all select * from legacy_residence
  union all select * from legacy_interest
)
select
  matches.profile_id,
  coalesce(profile.account_type, profile.type) as account_type,
  coalesce(profile.full_name, profile.display_name) as profile_name,
  matches.match_source,
  matched_country.iso2 as matched_country,
  residence_country.iso2 as canonical_residence_country,
  profile.country as legacy_residence_country,
  profile.interest_country as legacy_interest_country,
  profile.sport,
  profile.status,
  profile.club_stadium_lat,
  profile.club_stadium_lng,
  profile.latitude,
  profile.longitude
from matches
join public.profiles profile on profile.id = matches.profile_id
join public.countries matched_country on matched_country.id = matches.matched_country_id
left join public.profile_preferences preferences on preferences.profile_id = profile.id
left join public.countries residence_country on residence_country.id = preferences.residence_country_id;

-- A. Cross-country candidates: these explain profiles shown for a country other
-- than their canonical residence. In particular, inspect IT and ES Club rows.
select *
from discover_geography_match_audit
where match_source in ('canonical_country_interest', 'canonical_area_interest', 'legacy_interest')
  and canonical_residence_country is distinct from matched_country
order by matched_country, account_type, profile_name, match_source;

-- B. Candidate-source counts for the launch countries and every account type.
select matched_country, account_type, match_source, count(distinct profile_id) as profiles
from discover_geography_match_audit
group by matched_country, account_type, match_source
order by matched_country, account_type, match_source;

-- C. French Club map candidates. Compare sport with the viewer's sport because
-- Discover defaults to sportScope=mine; coordinates alone only qualify the row
-- for the map, not for Discover.
select distinct
  profile_id, profile_name, sport, status, canonical_residence_country,
  legacy_residence_country, club_stadium_lat, club_stadium_lng, latitude, longitude,
  (coalesce(club_stadium_lat, latitude) is not null
    and coalesce(club_stadium_lng, longitude) is not null) as has_map_coordinates
from discover_geography_match_audit
where account_type = 'club'
  and canonical_residence_country = 'FR'
order by profile_name;

-- D. Conflicting sources only. Do not list the thousands of harmless Player rows
-- where legacy_interest and legacy_residence contain the same historical value:
-- Player/Staff are intentionally indexed by interest and nationality is display-only.
select matched_country, profile_id, account_type, profile_name,
  array_agg(distinct match_source order by match_source) as match_sources
from discover_geography_match_audit
group by matched_country, profile_id, account_type, profile_name
having count(distinct match_source) > 1
  and (
    account_type in ('club', 'institution')
    or count(distinct match_source) filter (
      where match_source in ('canonical_country_interest', 'canonical_area_interest', 'legacy_interest')
    ) > 1
  )
order by matched_country, account_type, profile_name;
