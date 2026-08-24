import {
  normalizeGeoImportRecord,
  validateGeoHierarchyRecord,
  validateGeoImportBatch,
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
  errors: string[];
  records: CanonicalGeoAreaImportRecord[];
};

const identity = (record: Pick<CanonicalGeoAreaImportRecord, 'provider' | 'externalId'>) =>
  `${record.provider}:${record.externalId}`;

export function createGeoImportDryRun(
  input: readonly GeoAreaImportInput[],
  countryIso2: string,
  existing: readonly ExistingGeoImportRecord[] = [],
): GeoImportDryRun {
  const country = countryIso2.trim().toUpperCase();
  const records = input.map(normalizeGeoImportRecord);
  const counts = new Map<string, number>();
  for (const record of records) counts.set(identity(record), (counts.get(identity(record)) ?? 0) + 1);
  const duplicateProviderIds = [...counts].filter(([, count]) => count > 1).map(([key]) => key);

  const recordErrors = records.flatMap((record) => {
    const errors = validateGeoHierarchyRecord(record).errors.map((error) => `${identity(record)}:${error}`);
    if (!record.sourceLicense?.trim()) errors.push(`${identity(record)}:source_license_required`);
    if (record.countryIso2 !== country) errors.push(`${identity(record)}:country_mismatch`);
    if (!SUPPORTED_AREA_TYPES.has(record.areaType)) errors.push(`${identity(record)}:unsupported_area_type`);
    return errors;
  });
  const batchErrors = validateGeoImportBatch(records).errors.flatMap((error) => {
    const separator = error.indexOf(':');
    const externalId = separator < 0 ? error : error.slice(0, separator);
    const matchingRecords = records.filter((record) => record.externalId === externalId);
    return matchingRecords.length
      ? matchingRecords.map((record) => `${record.provider}:${error}`)
      : [error];
  });
  const errors = [...new Set([...recordErrors, ...batchErrors])];
  const invalidIdentities = new Set(errors.map((error) => error.split(':').slice(0, 2).join(':')));
  const existingIdentities = new Set(existing.map(identity));
  const valid = records.filter((record) => !invalidIdentities.has(identity(record)));

  return {
    country,
    totalInputRecords: records.length,
    validRecords: valid.length,
    invalidRecords: records.length - valid.length,
    duplicateProviderIds,
    missingParents: errors.filter((error) => error.endsWith(':parent_missing')),
    cycleErrors: errors.filter((error) => error.endsWith(':cycle_detected')),
    unsupportedAreaTypes: errors.filter((error) => error.endsWith(':unsupported_area_type')),
    recordsToInsert: valid.filter((record) => !existingIdentities.has(identity(record))).length,
    recordsToUpdate: valid.filter((record) => existingIdentities.has(identity(record))).length,
    errors,
    records,
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
