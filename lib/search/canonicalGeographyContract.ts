export const SEARCH_GEOGRAPHY_REASON_WEIGHTS = {
  canonical_area: 600,
  canonical_country: 400,
  legacy_area: 200,
  legacy_country: 100,
  sport: 40,
  relocation_compatible: 20,
} as const;

export type SearchGeographyReason = keyof typeof SEARCH_GEOGRAPHY_REASON_WEIGHTS;

export type LegacySearchGeography = {
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
};

export type ParsedSearchGeography =
  | { mode: 'none'; legacy: LegacySearchGeography }
  | { mode: 'legacy'; legacy: LegacySearchGeography }
  | {
      mode: 'canonical_unvalidated';
      countryId: string;
      geoAreaId: string | null;
      legacy: LegacySearchGeography;
    };

export type CanonicalSearchGeographyScope = {
  mode: 'canonical';
  countryId: string;
  countryIso2: string;
  countryName: string;
  geoAreaId: string | null;
  geoAreaName: string | null;
  geoAreaType: string | null;
  areaIds: string[];
};

export type CanonicalSearchCountry = {
  id: string;
  iso2: string;
  officialName: string;
  isActive: boolean;
  isSupported: boolean;
};

export type CanonicalSearchArea = {
  id: string;
  countryId: string;
  officialName: string;
  areaType: string;
  isActive: boolean;
};

export type SearchGeographyCatalog = {
  getCountry(countryId: string): Promise<CanonicalSearchCountry | null>;
  getArea(geoAreaId: string): Promise<CanonicalSearchArea | null>;
  getActiveDescendantIds(geoAreaId: string, countryId: string): Promise<string[]>;
};

export class SearchGeographyContractError extends Error {
  constructor(
    public readonly code:
      | 'CONFLICTING_ALIAS'
      | 'INVALID_COUNTRY_ID'
      | 'INVALID_GEO_AREA_ID'
      | 'COUNTRY_REQUIRED'
      | 'COUNTRY_UNAVAILABLE'
      | 'GEO_AREA_UNAVAILABLE'
      | 'COUNTRY_AREA_MISMATCH'
      | 'UNSUPPORTED_AREA_TYPE',
    message: string,
  ) {
    super(message);
    this.name = 'SearchGeographyContractError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function readAlias(params: URLSearchParams, camel: string, snake: string) {
  const camelValue = clean(params.get(camel));
  const snakeValue = clean(params.get(snake));
  if (camelValue && snakeValue && camelValue !== snakeValue) {
    throw new SearchGeographyContractError('CONFLICTING_ALIAS', `${camel} and ${snake} must match`);
  }
  return camelValue ?? snakeValue;
}

/**
 * Parses only the additive Search geography contract. Catalogue validation is
 * deliberately separate so this function remains reusable by API adapters.
 */
export function parseSearchGeography(params: URLSearchParams): ParsedSearchGeography {
  const legacy: LegacySearchGeography = {
    country: clean(params.get('country')),
    region: clean(params.get('region')),
    province: clean(params.get('province')),
    city: clean(params.get('city')),
  };
  const countryId = readAlias(params, 'countryId', 'country_id');
  const geoAreaId = readAlias(params, 'geoAreaId', 'geo_area_id');

  if (geoAreaId && !countryId) {
    throw new SearchGeographyContractError('COUNTRY_REQUIRED', 'geoAreaId requires countryId');
  }
  if (countryId && !UUID.test(countryId)) {
    throw new SearchGeographyContractError('INVALID_COUNTRY_ID', 'countryId must be a UUID');
  }
  if (geoAreaId && !UUID.test(geoAreaId)) {
    throw new SearchGeographyContractError('INVALID_GEO_AREA_ID', 'geoAreaId must be a UUID');
  }
  if (countryId) {
    return { mode: 'canonical_unvalidated', countryId, geoAreaId, legacy };
  }
  return Object.values(legacy).some(Boolean) ? { mode: 'legacy', legacy } : { mode: 'none', legacy };
}

/** Validates active/supported catalogue rows and expands one area to descendants. */
export async function resolveCanonicalSearchGeography(
  parsed: Extract<ParsedSearchGeography, { mode: 'canonical_unvalidated' }>,
  catalog: SearchGeographyCatalog,
  options: { expandDescendants?: boolean } = {},
): Promise<CanonicalSearchGeographyScope> {
  const country = await catalog.getCountry(parsed.countryId);
  if (!country?.isActive || !country.isSupported) {
    throw new SearchGeographyContractError('COUNTRY_UNAVAILABLE', 'countryId is not active and supported');
  }
  if (!parsed.geoAreaId) {
    return {
      mode: 'canonical',
      countryId: country.id,
      countryIso2: country.iso2,
      countryName: country.officialName,
      geoAreaId: null,
      geoAreaName: null,
      geoAreaType: null,
      areaIds: [],
    };
  }

  const area = await catalog.getArea(parsed.geoAreaId);
  if (!area?.isActive) {
    throw new SearchGeographyContractError('GEO_AREA_UNAVAILABLE', 'geoAreaId is not active');
  }
  if (area.countryId !== country.id) {
    throw new SearchGeographyContractError('COUNTRY_AREA_MISMATCH', 'geoAreaId does not belong to countryId');
  }
  const descendants = options.expandDescendants === false
    ? []
    : await catalog.getActiveDescendantIds(area.id, country.id);
  return {
    mode: 'canonical',
    countryId: country.id,
    countryIso2: country.iso2,
    countryName: country.officialName,
    geoAreaId: area.id,
    geoAreaName: area.officialName,
    geoAreaType: area.areaType,
    areaIds: Array.from(new Set([area.id, ...descendants])),
  };
}

const REGION_AREA_TYPES = new Set(['REGION', 'AUTONOMOUS_COMMUNITY', 'CANTON', 'STATISTICAL_REGION', 'VOIVODESHIP']);
const PROVINCE_AREA_TYPES = new Set(['DEPARTMENT', 'PROVINCE', 'DISTRICT', 'POWIAT']);
const CITY_AREA_TYPES = new Set(['COMMUNE', 'MUNICIPALITY', 'GMINA']);

/** Maps heterogeneous canonical levels to the existing public legacy projection. */
export function canonicalAreaLegacyField(areaType: string): 'region' | 'province' | 'city' {
  const normalized = areaType.trim().toUpperCase();
  if (REGION_AREA_TYPES.has(normalized)) return 'region';
  if (PROVINCE_AREA_TYPES.has(normalized)) return 'province';
  if (CITY_AREA_TYPES.has(normalized)) return 'city';
  throw new SearchGeographyContractError('UNSUPPORTED_AREA_TYPE', `unsupported canonical area type: ${areaType}`);
}

export type SearchGeographyRankingSignals = {
  canonicalAreaMatch?: boolean;
  canonicalCountryMatch?: boolean;
  legacyAreaMatch?: boolean;
  legacyCountryMatch?: boolean;
  sportMatch?: boolean;
  /** Must be supplied only by a reviewed server boundary; never inferred. */
  relocationCompatible?: boolean;
};

export type SearchGeographyRank = {
  score: number;
  reasons: SearchGeographyReason[];
};

/**
 * Produces an explainable score. Geography reasons are mutually exclusive so
 * one match cannot be counted once per ancestor. Missing canonical data has no
 * penalty and can still receive a legacy compatibility reason.
 */
export function rankSearchGeography(signals: SearchGeographyRankingSignals): SearchGeographyRank {
  const reasons: SearchGeographyReason[] = [];
  if (signals.canonicalAreaMatch) reasons.push('canonical_area');
  else if (signals.canonicalCountryMatch) reasons.push('canonical_country');
  else if (signals.legacyAreaMatch) reasons.push('legacy_area');
  else if (signals.legacyCountryMatch) reasons.push('legacy_country');
  if (signals.sportMatch) reasons.push('sport');
  if (signals.relocationCompatible) reasons.push('relocation_compatible');
  return {
    reasons,
    score: reasons.reduce((total, reason) => total + SEARCH_GEOGRAPHY_REASON_WEIGHTS[reason], 0),
  };
}

export type SearchGeographyRankedCandidate = SearchGeographyRank & {
  id: string;
  interestPriority: number | null;
  updatedAt: string | null;
};

/** Stable tie-break contract: score, explicit interest priority, recency, ID. */
export function compareSearchGeographyRank(a: SearchGeographyRankedCandidate, b: SearchGeographyRankedCandidate) {
  if (a.score !== b.score) return b.score - a.score;
  const aPriority = a.interestPriority ?? Number.MAX_SAFE_INTEGER;
  const bPriority = b.interestPriority ?? Number.MAX_SAFE_INTEGER;
  if (aPriority !== bPriority) return aPriority - bPriority;
  const recency = (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
  return recency || a.id.localeCompare(b.id);
}
