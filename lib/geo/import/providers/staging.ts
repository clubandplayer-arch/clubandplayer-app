import { normalizeGeoImportRecord, type CanonicalGeoAreaImportRecord } from '../../canonical';

export type OfficialGeoStagingRecord = {
  countryIso2: string;
  areaType: string;
  officialCode: string;
  officialName: string;
  parentOfficialCode?: string | null;
  parentAreaType?: string | null;
  coordinates?: { lat: number; lng: number } | null;
  bounds?: { minLat: number; minLng: number; maxLat: number; maxLng: number } | null;
  sourceUpdatedAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type OfficialDatasetContext = {
  sourceLicense: string;
  datasetVersion: string;
  datasetPublishedAt?: string | null;
  sourceUrlIdentifier?: string | null;
};

export type OfficialProviderDefinition = {
  provider: string;
  countryIso2: string;
  codeAuthority: string;
  namespaces: Readonly<Record<string, string>>;
  levels: Readonly<Record<string, number>>;
  allowedParents: Readonly<Record<string, readonly string[]>>;
  resolveLevel?: (record: OfficialGeoStagingRecord) => number;
};

const required = (value: string, field: string) => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
};

export function adaptOfficialStagingRecords(
  rows: readonly OfficialGeoStagingRecord[],
  context: OfficialDatasetContext,
  definition: OfficialProviderDefinition,
): CanonicalGeoAreaImportRecord[] {
  const sourceLicense = required(context.sourceLicense, 'source_license');
  const datasetVersion = required(context.datasetVersion, 'dataset_version');

  return rows.map((row) => {
    const countryIso2 = required(row.countryIso2, 'country_iso2').toUpperCase();
    const areaType = required(row.areaType, 'area_type').toUpperCase();
    const officialCode = required(row.officialCode, 'official_code');
    const officialName = required(row.officialName, 'official_name');
    const namespace = definition.namespaces[areaType];
    if (!namespace) throw new Error(`${definition.provider}: unsupported area type ${areaType}`);
    if (countryIso2 !== definition.countryIso2) throw new Error(`${definition.provider}: expected country ${definition.countryIso2}`);

    const allowedParents = definition.allowedParents[areaType] ?? [];
    const parentAreaType = row.parentAreaType?.trim().toUpperCase() || null;
    const parentOfficialCode = row.parentOfficialCode?.trim() || null;
    if ((parentAreaType === null) !== (parentOfficialCode === null)) throw new Error(`${definition.provider}: parent type and code must be provided together`);
    if (parentAreaType && !allowedParents.includes(parentAreaType)) throw new Error(`${definition.provider}: invalid parent ${parentAreaType} for ${areaType}`);
    if (!parentAreaType && allowedParents.length) throw new Error(`${definition.provider}: parent required for ${areaType}`);

    return normalizeGeoImportRecord({
      provider: definition.provider,
      externalId: `${namespace}:${officialCode}`,
      countryIso2,
      parentExternalId: parentAreaType && parentOfficialCode
        ? `${definition.namespaces[parentAreaType]}:${parentOfficialCode}`
        : null,
      code: officialCode,
      codeAuthority: definition.codeAuthority,
      officialName,
      areaType,
      level: definition.resolveLevel?.(row) ?? definition.levels[areaType],
      coordinates: row.coordinates,
      bounds: row.bounds,
      sourceUpdatedAt: row.sourceUpdatedAt,
      sourceLicense,
      metadata: {
        ...row.metadata,
        datasetVersion,
        datasetPublishedAt: context.datasetPublishedAt ?? null,
        originalCode: officialCode,
        originalParentCode: parentOfficialCode,
        sourceUrlIdentifier: context.sourceUrlIdentifier ?? null,
      },
    });
  });
}
