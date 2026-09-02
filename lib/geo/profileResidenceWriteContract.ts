import { UUID_PATTERN } from './areas';
import type { ProfileGeoArea } from './profileGeography';

export type ResidencePatch =
  | { kind: 'absent' }
  | { kind: 'reset'; residenceCountryId: null; residenceGeoAreaId: null }
  | { kind: 'country_only'; residenceCountryId: string; residenceGeoAreaId: null }
  | { kind: 'full'; residenceCountryId: string; residenceGeoAreaId: string };

export type ResidenceCountry = {
  id: string;
  iso2: string;
  isSupported: boolean;
  isActive: boolean;
};

export type CanonicalToItalyLegacyMapping = {
  geoAreaId: string;
  entityType: 'region' | 'province' | 'municipality';
  legacyId: string | number;
};

export type ResidenceWriteContext = {
  country: ResidenceCountry | null;
  area: ProfileGeoArea | null;
  ancestors: ProfileGeoArea[];
  italyMappings?: CanonicalToItalyLegacyMapping[];
};

export type ResidenceLegacyWrite = {
  region: string | null;
  province: string | null;
  city: string | null;
  residence_region_id: number | null;
  residence_province_id: number | null;
  residence_municipality_id: number | null;
};

export type ResidenceDualWritePlan = {
  kind: Exclude<ResidencePatch['kind'], 'absent'>;
  preferences: {
    residence_country_id: string | null;
    residence_geo_area_id: string | null;
  };
  legacyProfile: ResidenceLegacyWrite;
};

export type ResidenceContractErrorCode =
  | 'INVALID_GEOGRAPHY'
  | 'INVALID_UUID'
  | 'COUNTRY_NOT_AVAILABLE'
  | 'AREA_NOT_FOUND'
  | 'COUNTRY_AREA_MISMATCH'
  | 'INVALID_HIERARCHY'
  | 'ITALY_MAPPING_MISSING'
  | 'ITALY_MAPPING_AMBIGUOUS';

export class ResidenceContractError extends Error {
  constructor(public readonly code: ResidenceContractErrorCode, message: string) {
    super(message);
    this.name = 'ResidenceContractError';
  }
}

const emptyLegacy = (): ResidenceLegacyWrite => ({
  region: null,
  province: null,
  city: null,
  residence_region_id: null,
  residence_province_id: null,
  residence_municipality_id: null,
});

function uuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw new ResidenceContractError('INVALID_UUID', `${field} must be a UUID`);
  }
  return value.trim();
}

/** An absent geography property is the only representation of “do not modify residence”. */
export function parseResidencePatch(body: Record<string, unknown>): ResidencePatch {
  if (!Object.prototype.hasOwnProperty.call(body, 'geography')) return { kind: 'absent' };
  const geography = body.geography;
  if (!geography || typeof geography !== 'object' || Array.isArray(geography)) {
    throw new ResidenceContractError('INVALID_GEOGRAPHY', 'geography must be an object');
  }
  const record = geography as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, 'residenceCountryId') ||
      !Object.prototype.hasOwnProperty.call(record, 'residenceGeoAreaId')) {
    throw new ResidenceContractError('INVALID_GEOGRAPHY', 'geography requires explicit country and geo-area values');
  }
  const country = record.residenceCountryId;
  const area = record.residenceGeoAreaId;
  if (country === null && area === null) return { kind: 'reset', residenceCountryId: null, residenceGeoAreaId: null };
  if (country === null) throw new ResidenceContractError('INVALID_GEOGRAPHY', 'a geo-area requires a country');
  const residenceCountryId = uuid(country, 'residenceCountryId');
  if (area === null) return { kind: 'country_only', residenceCountryId, residenceGeoAreaId: null };
  return { kind: 'full', residenceCountryId, residenceGeoAreaId: uuid(area, 'residenceGeoAreaId') };
}

function validateContext(patch: Exclude<ResidencePatch, { kind: 'absent' | 'reset' }>, context: ResidenceWriteContext) {
  const { country } = context;
  if (!country || country.id !== patch.residenceCountryId || !country.isSupported || !country.isActive) {
    throw new ResidenceContractError('COUNTRY_NOT_AVAILABLE', 'residence country is not supported and active');
  }
  if (patch.kind === 'country_only') {
    if (context.area || context.ancestors.length) throw new ResidenceContractError('INVALID_HIERARCHY', 'country-only residence cannot include an area chain');
    return [];
  }
  if (!context.area || context.area.id !== patch.residenceGeoAreaId) {
    throw new ResidenceContractError('AREA_NOT_FOUND', 'residence geo-area was not found');
  }
  const path = [...context.ancestors, context.area];
  if (path.some((item) => item.countryId !== country.id || item.countryIso2 !== country.iso2)) {
    throw new ResidenceContractError('COUNTRY_AREA_MISMATCH', 'residence geo-area does not belong to residence country');
  }
  for (let index = 1; index < path.length; index += 1) {
    if (path[index].parentId !== path[index - 1].id) {
      throw new ResidenceContractError('INVALID_HIERARCHY', 'residence area hierarchy is incoherent');
    }
  }
  return path;
}

const foreignLegacyProjection = (path: ProfileGeoArea[]): ResidenceLegacyWrite => {
  const result = emptyLegacy();
  for (const item of path) {
    if (['REGION', 'AUTONOMOUS_COMMUNITY', 'CANTON', 'STATISTICAL_REGION', 'VOIVODESHIP'].includes(item.areaType)) result.region = item.officialName;
    else if (['DEPARTMENT', 'PROVINCE', 'DISTRICT', 'POWIAT'].includes(item.areaType)) result.province = item.officialName;
    else if (['COMMUNE', 'MUNICIPALITY', 'GMINA'].includes(item.areaType)) result.city = item.officialName;
  }
  return result;
};

function legacyNumericId(mapping: CanonicalToItalyLegacyMapping): number {
  const numeric = typeof mapping.legacyId === 'number' ? mapping.legacyId : Number(mapping.legacyId);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) {
    throw new ResidenceContractError('ITALY_MAPPING_MISSING', 'Italy legacy mapping has an invalid legacy ID');
  }
  return numeric;
}

function italyLegacyProjection(path: ProfileGeoArea[], mappings: CanonicalToItalyLegacyMapping[]): ResidenceLegacyWrite {
  const result = emptyLegacy();
  const expected = new Map<string, CanonicalToItalyLegacyMapping['entityType']>([
    ['REGION', 'region'], ['PROVINCE', 'province'], ['MUNICIPALITY', 'municipality'],
  ]);
  for (const item of path) {
    const entityType = expected.get(item.areaType);
    if (!entityType) throw new ResidenceContractError('INVALID_HIERARCHY', `unsupported Italy area type ${item.areaType}`);
    const matches = mappings.filter((mapping) => mapping.geoAreaId === item.id && mapping.entityType === entityType);
    if (matches.length === 0) throw new ResidenceContractError('ITALY_MAPPING_MISSING', `missing Italy legacy mapping for ${item.id}`);
    if (matches.length > 1) throw new ResidenceContractError('ITALY_MAPPING_AMBIGUOUS', `ambiguous Italy legacy mapping for ${item.id}`);
    const legacyId = legacyNumericId(matches[0]);
    if (entityType === 'region') { result.region = item.officialName; result.residence_region_id = legacyId; }
    if (entityType === 'province') { result.province = item.officialName; result.residence_province_id = legacyId; }
    if (entityType === 'municipality') { result.city = item.officialName; result.residence_municipality_id = legacyId; }
  }
  return result;
}

/** Produces deterministic Player/Staff persistence values; it never reads or emits interest fields. */
export function buildResidenceDualWritePlan(patch: ResidencePatch, context: ResidenceWriteContext): ResidenceDualWritePlan | null {
  if (patch.kind === 'absent') return null;
  if (patch.kind === 'reset') {
    return { kind: 'reset', preferences: { residence_country_id: null, residence_geo_area_id: null }, legacyProfile: emptyLegacy() };
  }
  const path = validateContext(patch, context);
  const legacyProfile = patch.kind === 'country_only'
    ? emptyLegacy()
    : context.country?.iso2 === 'IT'
      ? italyLegacyProjection(path, context.italyMappings ?? [])
      : foreignLegacyProjection(path);
  return {
    kind: patch.kind,
    preferences: { residence_country_id: patch.residenceCountryId, residence_geo_area_id: patch.residenceGeoAreaId },
    legacyProfile,
  };
}
