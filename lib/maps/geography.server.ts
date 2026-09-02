import type { SupabaseClient } from '@supabase/supabase-js';

import {
  MapGeographyContractError,
  type CanonicalMapViewport,
  type MapBounds,
  type MapViewportCatalog,
  type MapViewportCatalogArea,
  type MapViewportCatalogCountry,
  parseMapViewport,
  resolveCanonicalMapViewport,
} from './geographyContract';

export type CanonicalMapLocationScope = {
  source: 'canonical_text_filter';
  countryId: string;
  geoAreaId: string | null;
  countryIso2: string;
  countryAliases: string[];
  region: string | null;
  province: string | null;
  city: string | null;
};

type BoundsRow = {
  min_lat: number | string | null;
  min_lng: number | string | null;
  max_lat: number | string | null;
  max_lng: number | string | null;
};

function number(value: number | string | null) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function aggregateBounds(rows: BoundsRow[]) {
  const complete = rows.flatMap((row) => {
    const south = number(row.min_lat);
    const west = number(row.min_lng);
    const north = number(row.max_lat);
    const east = number(row.max_lng);
    return south == null || west == null || north == null || east == null
      ? []
      : [{ north, south, east, west }];
  });
  if (!complete.length) return null;
  return {
    north: Math.max(...complete.map((row) => row.north)),
    south: Math.min(...complete.map((row) => row.south)),
    east: Math.max(...complete.map((row) => row.east)),
    west: Math.min(...complete.map((row) => row.west)),
  };
}

/** Read-only adapter. Country bounds are derived from bounded root areas, never centroids. */
export class SupabaseMapViewportCatalog implements MapViewportCatalog {
  constructor(private readonly client: SupabaseClient) {}

  async getCountry(countryId: string): Promise<MapViewportCatalogCountry | null> {
    const [{ data: countryData, error: countryError }, { data: rootsData, error: rootsError }] = await Promise.all([
      this.client
        .from('countries')
        .select('id,is_active,is_supported')
        .eq('id', countryId)
        .maybeSingle(),
      this.client
        .from('geo_areas')
        .select('min_lat,min_lng,max_lat,max_lng')
        .eq('country_id', countryId)
        .eq('is_active', true)
        .is('parent_id', null)
        .not('min_lat', 'is', null)
        .limit(256),
    ]);
    if (countryError) throw countryError;
    if (rootsError) throw rootsError;
    if (!countryData) return null;
    return {
      id: String(countryData.id),
      isActive: countryData.is_active === true,
      isSupported: countryData.is_supported === true,
      bounds: aggregateBounds((rootsData ?? []) as BoundsRow[]),
    };
  }

  async getArea(geoAreaId: string): Promise<MapViewportCatalogArea | null> {
    const { data, error } = await this.client
      .from('geo_areas')
      .select('id,country_id,is_active,min_lat,min_lng,max_lat,max_lng')
      .eq('id', geoAreaId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: String(data.id),
      countryId: String(data.country_id),
      isActive: data.is_active === true,
      bounds: aggregateBounds([data as BoundsRow]),
    };
  }
}

export type ResolvedMapViewport =
  | { source: 'explicit_bounds'; countryId: null; geoAreaId: null; bounds: MapBounds }
  | CanonicalMapViewport;

export async function resolveMapViewportFromParams(
  params: URLSearchParams,
  catalog: MapViewportCatalog,
): Promise<ResolvedMapViewport | null> {
  const parsed = parseMapViewport(params);
  if (parsed.mode === 'none') return null;
  if (parsed.mode === 'bounds') {
    return { source: 'explicit_bounds', countryId: null, geoAreaId: null, bounds: parsed.bounds };
  }
  return resolveCanonicalMapViewport(parsed, catalog);
}

/**
 * Spatial bounds are not present on every imported European hierarchy. In that
 * case, validate the same canonical IDs and translate their ancestry to the
 * existing public Club location columns instead of widening to every Club.
 */
export async function resolveCanonicalMapLocationScope(
  params: URLSearchParams,
  client: SupabaseClient,
): Promise<CanonicalMapLocationScope> {
  const parsed = parseMapViewport(params);
  if (parsed.mode !== 'canonical_unvalidated') {
    throw new MapGeographyContractError('CANONICAL_VIEWPORT_REQUIRED', 'canonical map geography is required');
  }
  const { data: country, error: countryError } = await client
    .from('countries')
    .select('id,iso2,is_active,is_supported')
    .eq('id', parsed.countryId)
    .maybeSingle();
  if (countryError) throw countryError;
  if (!country?.is_active || !country.is_supported) {
    throw new MapGeographyContractError('COUNTRY_UNAVAILABLE', 'countryId is not active and supported');
  }

  const { data: legacyCountryMappings, error: legacyCountryMappingsError } = await client
    .from('legacy_country_mappings')
    .select('source_value')
    .eq('country_id', country.id)
    .eq('is_active', true);
  if (legacyCountryMappingsError) throw legacyCountryMappingsError;
  const countryIso2 = String(country.iso2).toUpperCase();
  const countryAliases = Array.from(new Set([
    countryIso2,
    ...(legacyCountryMappings ?? []).map((mapping) => String(mapping.source_value).trim()).filter(Boolean),
  ]));

  const scope: CanonicalMapLocationScope = {
    source: 'canonical_text_filter',
    countryId: String(country.id),
    geoAreaId: parsed.geoAreaId,
    countryIso2,
    countryAliases,
    region: null,
    province: null,
    city: null,
  };
  if (!parsed.geoAreaId) return scope;

  let cursor: string | null = parsed.geoAreaId;
  let depth = 0;
  let recognized = false;
  while (cursor && depth < 16) {
    const { data: area, error }: { data: {
      id: string;
      country_id: string;
      parent_id: string | null;
      official_name: string;
      area_type: string;
      is_active: boolean;
    } | null; error: unknown } = await client
      .from('geo_areas')
      .select('id,country_id,parent_id,official_name,area_type,is_active')
      .eq('id', cursor)
      .maybeSingle();
    if (error) throw error;
    if (!area?.is_active) throw new MapGeographyContractError('GEO_AREA_UNAVAILABLE', 'geoAreaId is not active');
    if (String(area.country_id) !== scope.countryId) {
      throw new MapGeographyContractError('COUNTRY_AREA_MISMATCH', 'geoAreaId does not belong to countryId');
    }
    const name = String(area.official_name);
    const areaType = String(area.area_type).trim().toUpperCase();
    if (['REGION', 'AUTONOMOUS_COMMUNITY', 'CANTON', 'STATISTICAL_REGION', 'VOIVODESHIP'].includes(areaType)) {
      scope.region = name;
      recognized = true;
    } else if (scope.countryIso2 === 'IT' && areaType === 'PROVINCE') {
      scope.province = name;
      recognized = true;
    } else if (['PROVINCE', 'DEPARTMENT', 'DISTRICT', 'POWIAT'].includes(areaType)) {
      // The active Club profile writer persists no province-like field outside
      // Italy. Recognize these hierarchy nodes without adding an unsatisfiable
      // predicate; persisted region/city ancestors still narrow the result.
      recognized = true;
    } else if (['MUNICIPALITY', 'COMMUNE', 'GMINA'].includes(areaType)) {
      scope.city = name;
      recognized = true;
    }
    cursor = area.parent_id ? String(area.parent_id) : null;
    depth += 1;
  }
  if (cursor || !recognized) {
    throw new MapGeographyContractError('GEO_AREA_FILTER_UNAVAILABLE', 'geo area cannot be mapped to public Club location fields');
  }
  return scope;
}

export function applyOrganizationMapLocationScope<T>(query: T, scope: CanonicalMapLocationScope): T {
  const exactIlike = (value: string) => value.replace(/[%_]/g, (match) => `\\${match}`);
  let filtered = (query as any).or(
    scope.countryAliases.map((alias) => `country.ilike.${exactIlike(alias)}`).join(','),
  );
  if (scope.region) filtered = filtered.ilike('region', scope.region);
  if (scope.province) filtered = filtered.ilike('province', scope.province);
  if (scope.city) filtered = filtered.ilike('city', scope.city);
  return filtered as T;
}

function longitudeRanges(bounds: MapBounds) {
  return bounds.crossesAntimeridian
    ? [{ min: bounds.west, max: 180 }, { min: -180, max: bounds.east }]
    : [{ min: bounds.west, max: bounds.east }];
}

/**
 * Applies organization-venue-first bounds at database level. Legacy coordinates
 * are eligible only when the venue pair is entirely absent.
 */
export function applyOrganizationMapBounds<T>(query: T, bounds: MapBounds): T {
  const branches = longitudeRanges(bounds).flatMap(({ min, max }) => [
    `and(club_stadium_lat.gte.${bounds.south},club_stadium_lat.lte.${bounds.north},club_stadium_lng.gte.${min},club_stadium_lng.lte.${max})`,
    `and(club_stadium_lat.is.null,club_stadium_lng.is.null,latitude.gte.${bounds.south},latitude.lte.${bounds.north},longitude.gte.${min},longitude.lte.${max})`,
  ]);
  return (query as any).or(branches.join(',')) as T;
}
