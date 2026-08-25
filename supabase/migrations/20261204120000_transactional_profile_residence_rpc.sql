begin;

-- B4.3: narrow, geography-only dual-write. This migration is additive and is
-- intentionally not applied by the repository task that creates it.
create or replace function public.update_my_profile_residence(
  p_residence_country_id uuid,
  p_residence_geo_area_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile_id uuid;
  v_account_type text;
  v_country public.countries%rowtype;
  v_current public.geo_areas%rowtype;
  v_seen uuid[] := array[]::uuid[];
  v_depth integer := 0;
  v_mapping_count integer;
  v_legacy_id bigint;
  v_region text := null;
  v_province text := null;
  v_city text := null;
  v_region_id bigint := null;
  v_province_id bigint := null;
  v_municipality_id bigint := null;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  -- No profile ID is accepted from the caller: ownership comes only from auth.uid().
  select p.id, lower(coalesce(p.account_type, p.type, ''))
    into v_profile_id, v_account_type
  from public.profiles p
  where p.user_id = v_uid
  limit 1;

  if v_profile_id is null then
    raise exception using errcode = 'P0002', message = 'profile not found';
  end if;
  if v_account_type not in ('athlete', 'staff') then
    raise exception using errcode = '42501', message = 'profile role is not eligible for residence dual-write';
  end if;

  if p_residence_country_id is null and p_residence_geo_area_id is not null then
    raise exception using errcode = '22023', message = 'a residence geo-area requires a residence country';
  end if;

  if p_residence_country_id is not null then
    select c.* into v_country
    from public.countries c
    where c.id = p_residence_country_id
      and c.is_supported = true
      and c.is_active = true;
    if not found then
      raise exception using errcode = '22023', message = 'residence country is not supported and active';
    end if;
  end if;

  if p_residence_geo_area_id is not null then
    select ga.* into v_current
    from public.geo_areas ga
    where ga.id = p_residence_geo_area_id
      and ga.is_active = true;
    if not found then
      raise exception using errcode = '22023', message = 'residence geo-area was not found';
    end if;

    loop
      v_depth := v_depth + 1;
      if v_depth > 16 then
        raise exception using errcode = '22023', message = 'residence hierarchy exceeds maximum depth';
      end if;
      if v_current.id = any(v_seen) then
        raise exception using errcode = '22023', message = 'residence hierarchy contains a cycle';
      end if;
      v_seen := array_append(v_seen, v_current.id);

      if v_current.country_id <> p_residence_country_id then
        raise exception using errcode = '22023', message = 'residence geo-area does not belong to residence country';
      end if;

      if v_country.iso2 = 'IT' then
        if v_current.area_type = 'REGION' then
          select count(*), min(m.legacy_id::bigint)
            into v_mapping_count, v_legacy_id
          from public.legacy_geo_area_mappings m
          where m.source_system = 'italy_legacy'
            and m.source_entity_type = 'region'
            and m.geo_area_id = v_current.id
            and m.legacy_id ~ '^[1-9][0-9]*$';
          if v_mapping_count = 0 then raise exception using errcode = '22023', message = 'Italy region mapping is missing'; end if;
          if v_mapping_count > 1 then raise exception using errcode = '22023', message = 'Italy region mapping is ambiguous'; end if;
          v_region := v_current.official_name; v_region_id := v_legacy_id;
        elsif v_current.area_type = 'PROVINCE' then
          select count(*), min(m.legacy_id::bigint)
            into v_mapping_count, v_legacy_id
          from public.legacy_geo_area_mappings m
          where m.source_system = 'italy_legacy'
            and m.source_entity_type = 'province'
            and m.geo_area_id = v_current.id
            and m.legacy_id ~ '^[1-9][0-9]*$';
          if v_mapping_count = 0 then raise exception using errcode = '22023', message = 'Italy province mapping is missing'; end if;
          if v_mapping_count > 1 then raise exception using errcode = '22023', message = 'Italy province mapping is ambiguous'; end if;
          v_province := v_current.official_name; v_province_id := v_legacy_id;
        elsif v_current.area_type = 'MUNICIPALITY' then
          select count(*), min(m.legacy_id::bigint)
            into v_mapping_count, v_legacy_id
          from public.legacy_geo_area_mappings m
          where m.source_system = 'italy_legacy'
            and m.source_entity_type = 'municipality'
            and m.geo_area_id = v_current.id
            and m.legacy_id ~ '^[1-9][0-9]*$';
          if v_mapping_count = 0 then raise exception using errcode = '22023', message = 'Italy municipality mapping is missing'; end if;
          if v_mapping_count > 1 then raise exception using errcode = '22023', message = 'Italy municipality mapping is ambiguous'; end if;
          v_city := v_current.official_name; v_municipality_id := v_legacy_id;
        else
          raise exception using errcode = '22023', message = 'unsupported Italy residence hierarchy';
        end if;
      else
        if v_current.area_type in ('REGION', 'AUTONOMOUS_COMMUNITY', 'CANTON', 'STATISTICAL_REGION', 'VOIVODESHIP') then
          v_region := v_current.official_name;
        elsif v_current.area_type in ('DEPARTMENT', 'PROVINCE', 'DISTRICT', 'POWIAT') then
          v_province := v_current.official_name;
        elsif v_current.area_type in ('COMMUNE', 'MUNICIPALITY', 'GMINA') then
          v_city := v_current.official_name;
        else
          raise exception using errcode = '22023', message = 'unsupported foreign residence hierarchy';
        end if;
      end if;

      exit when v_current.parent_id is null;
      select ga.* into v_current
      from public.geo_areas ga
      where ga.id = v_current.parent_id
        and ga.is_active = true;
      if not found then
        raise exception using errcode = '22023', message = 'residence ancestor was not found';
      end if;
    end loop;
  end if;

  -- These are the only legacy profile columns in the RPC allowlist.
  update public.profiles p
  set region = v_region,
      province = v_province,
      city = v_city,
      residence_region_id = v_region_id,
      residence_province_id = v_province_id,
      residence_municipality_id = v_municipality_id,
      updated_at = now()
  where p.id = v_profile_id
    and p.user_id = v_uid;
  if not found then
    raise exception using errcode = '42501', message = 'profile update was not authorized';
  end if;

  insert into public.profile_preferences as pp (
    profile_id, residence_country_id, residence_geo_area_id
  ) values (
    v_profile_id, p_residence_country_id, p_residence_geo_area_id
  )
  on conflict (profile_id) do update
  set residence_country_id = excluded.residence_country_id,
      residence_geo_area_id = excluded.residence_geo_area_id;

  return jsonb_build_object(
    'profileId', v_profile_id,
    'source', case when p_residence_country_id is null then 'none' else 'canonical' end,
    'residenceCountryId', p_residence_country_id,
    'residenceGeoAreaId', p_residence_geo_area_id,
    'legacyResidence', jsonb_build_object(
      'region', v_region,
      'province', v_province,
      'city', v_city,
      'regionId', v_region_id,
      'provinceId', v_province_id,
      'municipalityId', v_municipality_id
    )
  );
end;
$$;

comment on function public.update_my_profile_residence(uuid, uuid) is
  'Owner-only atomic canonical and legacy residence dual-write for athlete/staff profiles.';

revoke all on function public.update_my_profile_residence(uuid, uuid) from public;
revoke all on function public.update_my_profile_residence(uuid, uuid) from anon;
grant execute on function public.update_my_profile_residence(uuid, uuid) to authenticated;

commit;
