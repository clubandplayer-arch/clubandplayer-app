drop index if exists public.geo_areas_country_authority_code_key;

create index if not exists geo_areas_country_authority_code_idx
  on public.geo_areas (country_id, code_authority, code)
  where code_authority is not null and code is not null;
