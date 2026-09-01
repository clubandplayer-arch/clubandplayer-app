import type { SupabaseClient } from '@supabase/supabase-js';

import {
  type CanonicalMapViewport,
  type MapBounds,
  type MapViewportCatalog,
  type MapViewportCatalogArea,
  type MapViewportCatalogCountry,
  parseMapViewport,
  resolveCanonicalMapViewport,
} from './geographyContract';

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
