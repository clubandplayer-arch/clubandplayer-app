import {
  normalizeGeoImportRecord,
  validateGeoHierarchyRecord,
  type CanonicalGeoAreaImportRecord,
  type GeoAreaImportInput,
} from '../canonical';

export const INITIAL_EU_IMPORT_COUNTRIES = ['FR', 'ES', 'CH', 'SI', 'PL'] as const;

const SUPPORTED_AREA_TYPES = new Set([
  'REGION', 'PROVINCE', 'METROPOLITAN_CITY', 'MUNICIPALITY', 'DEPARTMENT', 'COMMUNE',
  'AUTONOMOUS_COMMUNITY', 'CANTON', 'DISTRICT', 'STATISTICAL_REGION', 'VOIVODESHIP',
  'POWIAT', 'GMINA', 'STATE', 'GOVERNMENT_REGION', 'FREGUESIA',
]);

export type ExistingGeoImportRecord = {
  provider: string;
  externalId: string;
  officialCode?: string | null;
};

export type GeoImportDryRun = {
  country: string;
  totalInputRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateProviderIds: string[];
  missingParents: string[];
  cycleErrors: string[];
  unsupportedAreaTypes: string[];
  recordsToInsert: number;
  recordsToUpdate: number;
  totalRecords: number;
  duplicateExternalIds: string[];
  cycles: string[];
  wouldInsert: number;
  wouldUpdate: number;
  errors: string[];
  records: CanonicalGeoAreaImportRecord[];
  provider: string;
  datasetVersion: string | null;
  countByAreaType: Record<string, number>;
  duplicateOfficialCodes: string[];
  crossCountryParents: string[];
  invalidCoordinates: string[];
  invalidBounds: string[];
  potentiallyObsolete: string[];
};

export type GeoCountExpectation = { min?: number; max?: number };
export type GeoDryRunOptions = { datasetVersion?: string; expected?: Record<string, GeoCountExpectation> };

const identity = (record: Pick<CanonicalGeoAreaImportRecord, 'provider' | 'externalId'>) =>
  `${record.provider}:${record.externalId}`;

export function createGeoImportDryRun(
  input: readonly GeoAreaImportInput[],
  countryIso2: string,
  existing: readonly ExistingGeoImportRecord[] = [],
  options: GeoDryRunOptions = {},
): GeoImportDryRun {
  const country = countryIso2.trim().toUpperCase();
  const records = input.map(normalizeGeoImportRecord);
  const counts = new Map<string, number>();
  for (const record of records) counts.set(identity(record), (counts.get(identity(record)) ?? 0) + 1);
  const duplicateProviderIds = [...counts].filter(([, count]) => count > 1).map(([key]) => key);
  const errors: string[] = [];
  const invalidIdentities = new Set<string>();
  const addRecordError = (record: CanonicalGeoAreaImportRecord, error: string) => {
    invalidIdentities.add(identity(record));
    errors.push(`${identity(record)}:${error}`);
  };
  for (const record of records) {
    for (const error of validateGeoHierarchyRecord(record).errors) addRecordError(record, error);
    if (!record.sourceLicense?.trim()) addRecordError(record, 'source_license_required');
    if (record.countryIso2 !== country) addRecordError(record, 'country_mismatch');
    if (!SUPPORTED_AREA_TYPES.has(record.areaType)) addRecordError(record, 'unsupported_area_type');
    if ((counts.get(identity(record)) ?? 0) > 1) addRecordError(record, 'duplicate_provider_record');
  }
  const byIdentity = new Map(records.map((record) => [identity(record), record]));
  for (const record of records) {
    if (!record.parentExternalId) continue;
    const parent = byIdentity.get(`${record.provider}:${record.parentExternalId}`);
    if (!parent) {
      addRecordError(record, 'parent_missing');
      continue;
    }
    if (parent.countryIso2 !== record.countryIso2) addRecordError(record, 'parent_country_mismatch');
    const visited = new Set([identity(record)]);
    let cursor: CanonicalGeoAreaImportRecord | undefined = parent;
    while (cursor) {
      if (visited.has(identity(cursor))) {
        addRecordError(record, 'cycle_detected');
        break;
      }
      visited.add(identity(cursor));
      cursor = cursor.parentExternalId ? byIdentity.get(`${cursor.provider}:${cursor.parentExternalId}`) : undefined;
    }
  }
  const uniqueErrors = [...new Set(errors)];
  const existingIdentities = new Set(existing.map(identity));
  const valid = records.filter((record) => !invalidIdentities.has(identity(record)));
  const countByAreaType = records.reduce<Record<string, number>>((countsByType, record) => {
    countsByType[record.areaType] = (countsByType[record.areaType] ?? 0) + 1;
    return countsByType;
  }, {});
  const codeCounts = new Map<string, number>();
  for (const record of records) if (record.code && record.codeAuthority) {
    const key = `${record.codeAuthority}:${record.areaType}:${record.code}`;
    codeCounts.set(key, (codeCounts.get(key) ?? 0) + 1);
  }
  const manifestErrors = Object.entries(options.expected ?? {}).flatMap(([areaType, expectation]) => {
    const count = countByAreaType[areaType] ?? 0;
    if (expectation.min !== undefined && count < expectation.min) return [`manifest:${areaType}:below_minimum`];
    if (expectation.max !== undefined && count > expectation.max) return [`manifest:${areaType}:above_maximum`];
    return [];
  });
  uniqueErrors.push(...manifestErrors);
  const recordsToInsert = valid.filter((record) => !existingIdentities.has(identity(record))).length;
  const recordsToUpdate = valid.filter((record) => existingIdentities.has(identity(record))).length;
  const cycleErrors = uniqueErrors.filter((error) => error.endsWith(':cycle_detected'));

  return {
    country,
    totalInputRecords: records.length,
    validRecords: valid.length,
    invalidRecords: records.length - valid.length,
    duplicateProviderIds,
    missingParents: uniqueErrors.filter((error) => error.endsWith(':parent_missing')),
    cycleErrors,
    unsupportedAreaTypes: uniqueErrors.filter((error) => error.endsWith(':unsupported_area_type')),
    recordsToInsert,
    recordsToUpdate,
    totalRecords: records.length,
    duplicateExternalIds: duplicateProviderIds,
    cycles: cycleErrors,
    wouldInsert: recordsToInsert,
    wouldUpdate: recordsToUpdate,
    errors: uniqueErrors,
    records,
    provider: records.length && new Set(records.map((record) => record.provider)).size === 1 ? records[0].provider : '',
    datasetVersion: options.datasetVersion ?? (records[0]?.metadata.datasetVersion as string | undefined) ?? null,
    countByAreaType,
    duplicateOfficialCodes: [...codeCounts].filter(([, count]) => count > 1).map(([key]) => key),
    crossCountryParents: uniqueErrors.filter((error) => error.endsWith(':parent_country_mismatch')),
    invalidCoordinates: uniqueErrors.filter((error) => /:centroid_(?:lat|lng)_invalid$/.test(error)),
    invalidBounds: uniqueErrors.filter((error) => /:bounds_(?:lat|lng)_invalid$/.test(error) || error.endsWith(':bounds_incomplete')),
    potentiallyObsolete: existing.filter((record) => !counts.has(identity(record))).map(identity),
  };
}

export interface GeoImportRepository {
  existing(provider: string, countryIso2: string): Promise<ExistingGeoImportRecord[]>;
  upsert(records: readonly CanonicalGeoAreaImportRecord[]): Promise<void>;
}

export async function executeGeoImport(
  repository: GeoImportRepository,
  input: readonly GeoAreaImportInput[],
  countryIso2: string,
): Promise<GeoImportDryRun> {
  const normalized = input.map(normalizeGeoImportRecord);
  const providers = [...new Set(normalized.map((record) => record.provider))];
  if (providers.length !== 1) throw new Error('An import file must contain exactly one source provider');
  const existing = await repository.existing(providers[0], countryIso2.toUpperCase());
  const report = createGeoImportDryRun(input, countryIso2, existing);
  if (report.invalidRecords || report.duplicateProviderIds.length) throw new Error(`Geo import validation failed: ${report.errors.join(', ')}`);
  await repository.upsert(report.records);
  return report;
}
