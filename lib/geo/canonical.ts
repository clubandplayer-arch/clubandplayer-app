export type GeoAreaType = string;

export type GeoCoordinates = {
  lat: number;
  lng: number;
};

export type GeoBounds = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

export type CanonicalGeoAreaImportRecord = {
  provider: string;
  externalId: string;
  countryIso2: string;
  parentExternalId: string | null;
  code: string | null;
  codeAuthority: string | null;
  officialName: string;
  shortName: string | null;
  areaType: GeoAreaType;
  level: number;
  coordinates: GeoCoordinates | null;
  bounds: GeoBounds | null;
  metadata: Record<string, unknown>;
  sourceUpdatedAt: string | null;
  sourceLicense: string | null;
};

export type GeoAreaImportInput = {
  provider?: unknown;
  externalId?: unknown;
  countryIso2?: unknown;
  parentExternalId?: unknown;
  code?: unknown;
  codeAuthority?: unknown;
  officialName?: unknown;
  shortName?: unknown;
  areaType?: unknown;
  level?: unknown;
  coordinates?: { lat?: unknown; lng?: unknown } | null;
  bounds?: { minLat?: unknown; minLng?: unknown; maxLat?: unknown; maxLng?: unknown } | null;
  metadata?: unknown;
  sourceUpdatedAt?: unknown;
  sourceLicense?: unknown;
};

export type GeoHierarchyValidation = { valid: boolean; errors: string[] };

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
};

const number = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeAreaType = (value: unknown): string =>
  (text(value) ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

export function normalizeGeoImportRecord(input: GeoAreaImportInput): CanonicalGeoAreaImportRecord {
  const coordinates = input.coordinates
    ? { lat: number(input.coordinates.lat) as number, lng: number(input.coordinates.lng) as number }
    : null;
  const bounds = input.bounds
    ? {
        minLat: number(input.bounds.minLat) as number,
        minLng: number(input.bounds.minLng) as number,
        maxLat: number(input.bounds.maxLat) as number,
        maxLng: number(input.bounds.maxLng) as number,
      }
    : null;

  const rawMetadata = input.metadata;
  const metadata = rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)
    ? { ...(rawMetadata as Record<string, unknown>) }
    : {};

  return {
    provider: text(input.provider) ?? '',
    externalId: text(input.externalId) ?? '',
    countryIso2: (text(input.countryIso2) ?? '').toUpperCase(),
    parentExternalId: text(input.parentExternalId),
    code: text(input.code),
    codeAuthority: text(input.codeAuthority),
    officialName: text(input.officialName) ?? '',
    shortName: text(input.shortName),
    areaType: normalizeAreaType(input.areaType),
    level: number(input.level) ?? Number.NaN,
    coordinates,
    bounds,
    metadata,
    sourceUpdatedAt: text(input.sourceUpdatedAt),
    sourceLicense: text(input.sourceLicense),
  };
}

export function validateGeoHierarchyRecord(record: CanonicalGeoAreaImportRecord): GeoHierarchyValidation {
  const errors: string[] = [];
  if (!record.provider) errors.push('provider_required');
  if (!record.externalId) errors.push('external_id_required');
  if (!/^[A-Z]{2}$/.test(record.countryIso2)) errors.push('country_iso2_invalid');
  if (!record.officialName) errors.push('official_name_required');
  if (!/^[A-Z][A-Z0-9_]*$/.test(record.areaType)) errors.push('area_type_invalid');
  if (!Number.isInteger(record.level) || record.level < 1) errors.push('level_invalid');
  if (record.parentExternalId === record.externalId) errors.push('self_parent');
  if ((record.code == null) !== (record.codeAuthority == null)) errors.push('code_authority_pair_invalid');

  if (record.coordinates) {
    if (!Number.isFinite(record.coordinates.lat) || record.coordinates.lat < -90 || record.coordinates.lat > 90) errors.push('centroid_lat_invalid');
    if (!Number.isFinite(record.coordinates.lng) || record.coordinates.lng < -180 || record.coordinates.lng > 180) errors.push('centroid_lng_invalid');
  }
  if (record.bounds) {
    const { minLat, minLng, maxLat, maxLng } = record.bounds;
    if (![minLat, minLng, maxLat, maxLng].every(Number.isFinite)) errors.push('bounds_incomplete');
    if (minLat < -90 || maxLat > 90 || minLat > maxLat) errors.push('bounds_lat_invalid');
    if (minLng < -180 || maxLng > 180 || minLng > maxLng) errors.push('bounds_lng_invalid');
  }
  if (record.sourceUpdatedAt && Number.isNaN(Date.parse(record.sourceUpdatedAt))) errors.push('source_updated_at_invalid');
  return { valid: errors.length === 0, errors };
}

/**
 * Import-time validation only. Database constraints enforce self-parent and
 * same-country parentage; this batch check additionally rejects missing
 * parents and cycles before any future importer performs an upsert.
 */
export function validateGeoImportBatch(records: readonly CanonicalGeoAreaImportRecord[]): GeoHierarchyValidation {
  const errors = records.flatMap((record) => validateGeoHierarchyRecord(record).errors.map((error) => `${record.externalId}:${error}`));
  const byKey = new Map<string, CanonicalGeoAreaImportRecord>();

  for (const record of records) {
    const key = `${record.provider}:${record.externalId}`;
    if (byKey.has(key)) errors.push(`${record.externalId}:duplicate_provider_record`);
    byKey.set(key, record);
  }

  for (const record of records) {
    if (!record.parentExternalId) continue;
    const parent = byKey.get(`${record.provider}:${record.parentExternalId}`);
    if (!parent) {
      errors.push(`${record.externalId}:parent_missing`);
      continue;
    }
    if (parent.countryIso2 !== record.countryIso2) errors.push(`${record.externalId}:parent_country_mismatch`);

    const visited = new Set<string>([record.externalId]);
    let cursor: CanonicalGeoAreaImportRecord | undefined = parent;
    while (cursor) {
      if (visited.has(cursor.externalId)) {
        errors.push(`${record.externalId}:cycle_detected`);
        break;
      }
      visited.add(cursor.externalId);
      cursor = cursor.parentExternalId
        ? byKey.get(`${cursor.provider}:${cursor.parentExternalId}`)
        : undefined;
    }
  }

  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}
