export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
  crossesAntimeridian: boolean;
};

export type MapAccountType = 'club' | 'institution' | 'athlete' | 'player' | 'staff' | 'fan' | string;

export type PublicMapPoint = MapCoordinate & {
  source: 'organization_venue' | 'legacy_profile';
};

export type CanonicalMapViewport = {
  source: 'canonical_country' | 'canonical_area';
  countryId: string;
  geoAreaId: string | null;
  bounds: MapBounds;
};

export type ParsedMapViewport =
  | { mode: 'none' }
  | { mode: 'bounds'; bounds: MapBounds }
  | { mode: 'canonical_unvalidated'; countryId: string; geoAreaId: string | null };

export type MapViewportCatalogCountry = {
  id: string;
  isActive: boolean;
  isSupported: boolean;
  bounds: CoordinateBoundsInput | null;
};

export type MapViewportCatalogArea = {
  id: string;
  countryId: string;
  isActive: boolean;
  bounds: CoordinateBoundsInput | null;
};

export type MapViewportCatalog = {
  getCountry(countryId: string): Promise<MapViewportCatalogCountry | null>;
  getArea(geoAreaId: string): Promise<MapViewportCatalogArea | null>;
};

export type CoordinatePairInput = {
  latitude?: unknown;
  longitude?: unknown;
};

export type CoordinateBoundsInput = {
  north?: unknown;
  south?: unknown;
  east?: unknown;
  west?: unknown;
};

export class MapGeographyContractError extends Error {
  constructor(
    public readonly code:
      | 'COORDINATE_PAIR_INCOMPLETE'
      | 'COORDINATE_OUT_OF_RANGE'
      | 'BOUNDS_INCOMPLETE'
      | 'BOUNDS_INVALID'
      | 'CONFLICTING_VIEWPORT'
      | 'CONFLICTING_ALIAS'
      | 'INVALID_COUNTRY_ID'
      | 'INVALID_GEO_AREA_ID'
      | 'COUNTRY_REQUIRED'
      | 'COUNTRY_UNAVAILABLE'
      | 'GEO_AREA_UNAVAILABLE'
      | 'COUNTRY_AREA_MISMATCH'
      | 'VIEWPORT_BOUNDS_UNAVAILABLE',
    message: string,
  ) {
    super(message);
    this.name = 'MapGeographyContractError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && !(typeof value === 'string' && !value.trim());
}

function clean(value: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

function readAlias(params: URLSearchParams, camel: string, snake: string) {
  const camelValue = clean(params.get(camel));
  const snakeValue = clean(params.get(snake));
  if (camelValue && snakeValue && camelValue !== snakeValue) {
    throw new MapGeographyContractError('CONFLICTING_ALIAS', `${camel} and ${snake} must match`);
  }
  return camelValue ?? snakeValue;
}

/** Validates one atomic point. Missing pairs remain eligible for fallback. */
export function normalizeCoordinatePair(input: CoordinatePairInput): MapCoordinate | null {
  const hasLatitude = hasValue(input.latitude);
  const hasLongitude = hasValue(input.longitude);
  if (!hasLatitude && !hasLongitude) return null;
  if (hasLatitude !== hasLongitude) {
    throw new MapGeographyContractError('COORDINATE_PAIR_INCOMPLETE', 'latitude and longitude are required together');
  }

  const latitude = finiteNumber(input.latitude);
  const longitude = finiteNumber(input.longitude);
  if (latitude == null || longitude == null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new MapGeographyContractError('COORDINATE_OUT_OF_RANGE', 'coordinate pair is not finite and in range');
  }
  return { latitude, longitude };
}

/**
 * Public precise pins are organization-only in E2. Personal account residence,
 * canonical centroids and incomplete pairs are never silently published.
 */
export function resolvePublicMapPoint(input: {
  accountType: MapAccountType | null | undefined;
  venue: CoordinatePairInput;
  legacyProfile: CoordinatePairInput;
}): PublicMapPoint | null {
  const accountType = input.accountType?.trim().toLowerCase();
  if (accountType !== 'club' && accountType !== 'institution') return null;

  const venue = normalizeCoordinatePair(input.venue);
  if (venue) return { ...venue, source: 'organization_venue' };
  const legacy = normalizeCoordinatePair(input.legacyProfile);
  return legacy ? { ...legacy, source: 'legacy_profile' } : null;
}

/** Full bounds are required. east < west explicitly represents antimeridian crossing. */
export function normalizeMapBounds(input: CoordinateBoundsInput): MapBounds {
  const values = [input.north, input.south, input.east, input.west];
  if (!values.every(hasValue)) {
    throw new MapGeographyContractError('BOUNDS_INCOMPLETE', 'north, south, east and west are required together');
  }
  const north = finiteNumber(input.north);
  const south = finiteNumber(input.south);
  const east = finiteNumber(input.east);
  const west = finiteNumber(input.west);
  if (
    north == null || south == null || east == null || west == null ||
    north < -90 || north > 90 || south < -90 || south > 90 ||
    east < -180 || east > 180 || west < -180 || west > 180 ||
    north <= south || east === west
  ) {
    throw new MapGeographyContractError('BOUNDS_INVALID', 'map bounds are invalid');
  }
  return { north, south, east, west, crossesAntimeridian: east < west };
}

/** Parses either strict explicit bounds or canonical IDs, never both. */
export function parseMapViewport(params: URLSearchParams): ParsedMapViewport {
  const countryId = readAlias(params, 'countryId', 'country_id');
  const geoAreaId = readAlias(params, 'geoAreaId', 'geo_area_id');
  const boundKeys = ['north', 'south', 'east', 'west'] as const;
  const hasAnyBounds = boundKeys.some((key) => clean(params.get(key)) !== null);

  if (hasAnyBounds && (countryId || geoAreaId)) {
    throw new MapGeographyContractError('CONFLICTING_VIEWPORT', 'explicit bounds cannot be combined with canonical viewport IDs');
  }
  if (hasAnyBounds) {
    return {
      mode: 'bounds',
      bounds: normalizeMapBounds(Object.fromEntries(boundKeys.map((key) => [key, params.get(key)]))),
    };
  }
  if (geoAreaId && !countryId) {
    throw new MapGeographyContractError('COUNTRY_REQUIRED', 'geoAreaId requires countryId');
  }
  if (countryId && !UUID.test(countryId)) {
    throw new MapGeographyContractError('INVALID_COUNTRY_ID', 'countryId must be a UUID');
  }
  if (geoAreaId && !UUID.test(geoAreaId)) {
    throw new MapGeographyContractError('INVALID_GEO_AREA_ID', 'geoAreaId must be a UUID');
  }
  return countryId ? { mode: 'canonical_unvalidated', countryId, geoAreaId } : { mode: 'none' };
}

/** Resolves catalogue bounds only; centroids are deliberately not accepted as pin or viewport substitutes. */
export async function resolveCanonicalMapViewport(
  parsed: Extract<ParsedMapViewport, { mode: 'canonical_unvalidated' }>,
  catalog: MapViewportCatalog,
): Promise<CanonicalMapViewport> {
  const country = await catalog.getCountry(parsed.countryId);
  if (!country?.isActive || !country.isSupported) {
    throw new MapGeographyContractError('COUNTRY_UNAVAILABLE', 'countryId is not active and supported');
  }

  if (!parsed.geoAreaId) {
    if (!country.bounds) throw new MapGeographyContractError('VIEWPORT_BOUNDS_UNAVAILABLE', 'country bounds are unavailable');
    return {
      source: 'canonical_country',
      countryId: country.id,
      geoAreaId: null,
      bounds: normalizeMapBounds(country.bounds),
    };
  }

  const area = await catalog.getArea(parsed.geoAreaId);
  if (!area?.isActive) throw new MapGeographyContractError('GEO_AREA_UNAVAILABLE', 'geoAreaId is not active');
  if (area.countryId !== country.id) {
    throw new MapGeographyContractError('COUNTRY_AREA_MISMATCH', 'geoAreaId does not belong to countryId');
  }
  if (!area.bounds) throw new MapGeographyContractError('VIEWPORT_BOUNDS_UNAVAILABLE', 'geo area bounds are unavailable');
  return {
    source: 'canonical_area',
    countryId: country.id,
    geoAreaId: area.id,
    bounds: normalizeMapBounds(area.bounds),
  };
}

export type OpportunityMapPlacement = MapCoordinate & {
  source: 'opportunity_venue' | 'organization_venue';
};

/** Canonical opportunity geography can select a viewport, but never fabricates a point. */
export function resolveOpportunityMapPlacement(input: {
  explicitVenue: CoordinatePairInput;
  organizationPoint: MapCoordinate | null;
  canonicalGeoAreaId?: string | null;
}): OpportunityMapPlacement | null {
  const explicitVenue = normalizeCoordinatePair(input.explicitVenue);
  if (explicitVenue) return { ...explicitVenue, source: 'opportunity_venue' };
  if (input.organizationPoint) {
    const organizationPoint = normalizeCoordinatePair(input.organizationPoint);
    return organizationPoint ? { ...organizationPoint, source: 'organization_venue' } : null;
  }
  return null;
}
