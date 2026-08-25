import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ItalyLegacyMapping,
  LegacyProfileGeography,
  ProfileGeoArea,
  ProfileGeographyRepository,
  ProfileGeographySnapshot,
} from './profileGeography';

type AreaRow = { id: string; country_id: string; parent_id: string | null; official_name: string; area_type: string; level: number; country?: { iso2?: string } | Array<{ iso2?: string }> | null };
const countryIso2 = (row: AreaRow) => {
  const country = Array.isArray(row.country) ? row.country[0] : row.country;
  return country?.iso2 ?? '';
};
const toArea = (row: AreaRow): ProfileGeoArea => ({ id: row.id, countryId: row.country_id, countryIso2: countryIso2(row), parentId: row.parent_id, officialName: row.official_name, areaType: row.area_type, level: row.level });
const textId = (value: unknown) => value == null ? null : String(value);

/** Read-only server repository for the 3C-A profile-geography foundation. */
export class SupabaseProfileGeographyRepository implements ProfileGeographyRepository {
  constructor(private readonly client: SupabaseClient) {}

  async load(profileId: string): Promise<ProfileGeographySnapshot> {
    const [preferencesResult, profileResult, countriesResult, geoInterestsResult] = await Promise.all([
      this.client.from('profile_preferences').select('residence_country_id,residence_geo_area_id,open_to_relocation').eq('profile_id', profileId).maybeSingle(),
      this.client.from('profiles').select('country,region,province,city,interest_country,interest_region,interest_province,interest_city,interest_region_id,interest_province_id,interest_municipality_id').eq('id', profileId).single(),
      this.client.from('profile_country_interests').select('country_id,priority,country:countries(iso2)').eq('profile_id', profileId).order('priority'),
      this.client.from('profile_geo_area_interests').select('geo_area_id,priority').eq('profile_id', profileId).order('priority'),
    ]);
    for (const result of [preferencesResult, profileResult, countriesResult, geoInterestsResult]) if (result.error) throw result.error;

    const preferences = preferencesResult.data as { residence_country_id?: string | null; residence_geo_area_id?: string | null; open_to_relocation?: boolean | null } | null;
    const profile = profileResult.data as Record<string, unknown>;
    const legacy: LegacyProfileGeography = {
      country: profile.country as string | null, region: profile.region as string | null, province: profile.province as string | null, city: profile.city as string | null,
      interestCountry: profile.interest_country as string | null, interestRegion: profile.interest_region as string | null, interestProvince: profile.interest_province as string | null, interestCity: profile.interest_city as string | null,
      interestRegionId: textId(profile.interest_region_id), interestProvinceId: textId(profile.interest_province_id), interestMunicipalityId: textId(profile.interest_municipality_id),
    };
    const residenceChain = preferences?.residence_geo_area_id ? await this.loadAreaChain(preferences.residence_geo_area_id) : [];
    const mappingIds = [legacy.interestRegionId, legacy.interestProvinceId, legacy.interestMunicipalityId].filter((value): value is string | number => value != null).map(String);
    const mappings = mappingIds.length ? await this.loadItalyMappings(mappingIds) : [];
    const interestRows = geoInterestsResult.data as Array<{ geo_area_id: string; priority: number | null }>;
    const interestAreas = await this.loadAreas(interestRows.map((row) => row.geo_area_id));
    const areasById = new Map(interestAreas.map((area) => [area.id, area]));
    const residenceCountryId = preferences?.residence_country_id ?? residenceChain[0]?.countryId ?? null;
    let residenceCountryIso2: string | null = residenceChain[0]?.countryIso2 || null;
    if (!residenceCountryIso2 && residenceCountryId) {
      const result = await this.client.from('countries').select('iso2').eq('id', residenceCountryId).maybeSingle();
      if (result.error) throw result.error;
      residenceCountryIso2 = (result.data as { iso2?: string } | null)?.iso2 ?? null;
    }

    return {
      residenceCountryId,
      residenceCountryIso2,
      residenceGeoAreaId: preferences?.residence_geo_area_id ?? null,
      residenceArea: residenceChain[0] ?? null,
      residenceAncestors: residenceChain.slice(1),
      openToRelocation: preferences?.open_to_relocation === true,
      countryInterests: (countriesResult.data as Array<{ country_id: string; priority: number | null; country?: { iso2?: string } | Array<{ iso2?: string }> }>).map((row) => ({ countryId: row.country_id, iso2: (Array.isArray(row.country) ? row.country[0]?.iso2 : row.country?.iso2) ?? '', priority: row.priority })),
      geoAreaInterests: interestRows.flatMap((row) => { const area = areasById.get(row.geo_area_id); return area ? [{ area, priority: row.priority }] : []; }),
      legacy,
      italyLegacyMappings: mappings,
    };
  }

  private async loadAreaChain(areaId: string): Promise<ProfileGeoArea[]> {
    const chain: ProfileGeoArea[] = []; let cursor: string | null = areaId;
    while (cursor && chain.length < 8) {
      const result = await this.client.from('geo_areas').select('id,country_id,parent_id,official_name,area_type,level,country:countries!inner(iso2)').eq('id', cursor).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) break;
      const area = toArea(result.data as AreaRow); chain.push(area); cursor = area.parentId;
    }
    return chain;
  }

  private async loadAreas(ids: string[]): Promise<ProfileGeoArea[]> {
    if (!ids.length) return [];
    const result = await this.client.from('geo_areas').select('id,country_id,parent_id,official_name,area_type,level,country:countries!inner(iso2)').in('id', ids);
    if (result.error) throw result.error;
    return (result.data as AreaRow[]).map(toArea);
  }

  private async loadItalyMappings(ids: string[]): Promise<ItalyLegacyMapping[]> {
    const result = await this.client.from('legacy_geo_area_mappings').select('source_entity_type,legacy_id,area:geo_areas!inner(id,country_id,parent_id,official_name,area_type,level,country:countries!inner(iso2))').eq('source_system', 'italy_legacy').in('legacy_id', ids);
    if (result.error) throw result.error;
    return Promise.all((result.data as Array<{ source_entity_type: ItalyLegacyMapping['entityType']; legacy_id: string; area: AreaRow | AreaRow[] }>).map(async (row) => {
      const mappedArea = toArea(Array.isArray(row.area) ? row.area[0] : row.area);
      const chain = await this.loadAreaChain(mappedArea.id);
      return { entityType: row.source_entity_type, legacyId: row.legacy_id, area: mappedArea, ancestors: chain.slice(1) };
    }));
  }
}
