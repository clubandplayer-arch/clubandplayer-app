import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProfileGeoArea } from './profileGeography';
import {
  buildResidenceDualWritePlan,
  type CanonicalToItalyLegacyMapping,
  type ResidencePatch,
  ResidenceContractError,
} from './profileResidenceWriteContract';

type AreaRow = {
  id: string; country_id: string; parent_id: string | null; official_name: string; area_type: string; level: number;
};

const toArea = (row: AreaRow, iso2: string): ProfileGeoArea => ({
  id: row.id, countryId: row.country_id, countryIso2: iso2, parentId: row.parent_id,
  officialName: row.official_name, areaType: row.area_type, level: row.level,
});

/** Owner-scoped fallback that uses existing tables/RLS and needs no newly deployed RPC. */
export async function writeMyClubGeography(
  client: SupabaseClient,
  profileId: string,
  patch: Exclude<ResidencePatch, { kind: 'absent' }>,
) {
  const { data: rpcData, error: rpcError } = await client.rpc('update_my_club_geography', {
    p_residence_country_id: patch.residenceCountryId,
    p_residence_geo_area_id: patch.residenceGeoAreaId,
  });
  if (!rpcError) return { status: 'written' as const, data: rpcData };
  // Preview environments can run application code before the additive RPC migration.
  // Fall back only when PostgREST/Postgres reports that the function is absent.
  if (rpcError.code !== 'PGRST202' && rpcError.code !== '42883') throw rpcError;

  const countryId = patch.residenceCountryId;
  const { data: country, error: countryError } = countryId
    ? await client.from('countries').select('id,iso2,is_supported,is_active').eq('id', countryId).maybeSingle()
    : { data: null, error: null };
  if (countryError) throw countryError;

  const chain: ProfileGeoArea[] = [];
  if (patch.residenceGeoAreaId && country) {
    let cursor: string | null = patch.residenceGeoAreaId;
    while (cursor && chain.length < 16) {
      const { data, error } = await client.from('geo_areas')
        .select('id,country_id,parent_id,official_name,area_type,level').eq('id', cursor).eq('is_active', true).maybeSingle();
      if (error) throw error;
      if (!data) throw new ResidenceContractError('AREA_NOT_FOUND', 'residence geo-area was not found');
      const area = toArea(data as AreaRow, country.iso2);
      chain.unshift(area);
      cursor = area.parentId;
    }
    if (cursor) throw new ResidenceContractError('INVALID_HIERARCHY', 'residence hierarchy exceeds maximum depth');
  }

  let italyMappings: CanonicalToItalyLegacyMapping[] = [];
  if (country?.iso2 === 'IT' && chain.length) {
    const { data, error } = await client.from('legacy_geo_area_mappings')
      .select('geo_area_id,source_entity_type,legacy_id')
      .eq('source_system', 'italy_legacy').in('geo_area_id', chain.map((area) => area.id));
    if (error) throw error;
    italyMappings = (data ?? []).map((row) => ({
      geoAreaId: row.geo_area_id,
      entityType: row.source_entity_type as CanonicalToItalyLegacyMapping['entityType'],
      legacyId: row.legacy_id,
    }));
  }

  const plan = buildResidenceDualWritePlan(patch, {
    country: country ? { id: country.id, iso2: country.iso2, isSupported: country.is_supported, isActive: country.is_active } : null,
    area: chain.at(-1) ?? null,
    ancestors: chain.slice(0, -1),
    italyMappings,
  });
  if (!plan) throw new ResidenceContractError('INVALID_GEOGRAPHY', 'geography is required');

  // Keep the no-RPC preview fallback coherent with the transactional RPC: a
  // Club move archives country-bound sporting data instead of blocking the
  // profile save or deleting its history.
  const [{ data: registrations, error: registrationsError }, { data: honors, error: honorsError }] = await Promise.all([
    client.from('club_sport_registrations')
      .select('id,category:sports_organization_category_id(country_id)')
      .eq('club_profile_id', profileId).eq('is_active', true),
    client.from('club_honors')
      .select('id,category:sports_organization_category_id(country_id)')
      .eq('club_profile_id', profileId).eq('is_active', true),
  ]);
  if (registrationsError) throw registrationsError;
  if (honorsError) throw honorsError;
  const categoryCountryId = (row: any) => {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    return category?.country_id ?? null;
  };
  const registrationIds = (registrations ?? []).filter((row) => categoryCountryId(row) !== countryId).map((row) => row.id);
  const honorIds = (honors ?? []).filter((row) => categoryCountryId(row) !== countryId).map((row) => row.id);
  if (registrationIds.length) {
    const { error } = await client.from('club_sport_registrations')
      .update({ is_active: false, is_primary: false }).in('id', registrationIds);
    if (error) throw error;
  }
  if (honorIds.length) {
    const { error } = await client.from('club_honors').update({ is_active: false }).in('id', honorIds);
    if (error) throw error;
  }

  const { error: profileError } = await client.from('profiles').update({
    country: country?.iso2 ?? null,
    ...plan.legacyProfile,
  }).eq('id', profileId);
  if (profileError) throw profileError;
  const { error: preferencesError } = await client.from('profile_preferences').upsert({
    profile_id: profileId,
    ...plan.preferences,
  }, { onConflict: 'profile_id' });
  if (preferencesError) throw preferencesError;

  return {
    status: 'written' as const,
    data: {
      profileId,
      source: countryId ? 'canonical' as const : 'none' as const,
      residenceCountryId: plan.preferences.residence_country_id,
      residenceGeoAreaId: plan.preferences.residence_geo_area_id,
      legacyResidence: plan.legacyProfile,
    },
  };
}
