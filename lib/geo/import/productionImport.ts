import type { CanonicalGeoAreaImportRecord } from '../canonical';
import { createGeoImportDryRun, INITIAL_EU_IMPORT_COUNTRIES, type ExistingGeoImportRecord, type GeoImportDryRun } from './pipeline';
import type { OfficialGeoCountry } from './providers';
import { EUROPEAN_PRODUCTION_IMPORTS } from './productionConfig';

export type ProductionExistingRecord = ExistingGeoImportRecord & { id: string; fingerprint?: string };
export type ProductionBatchResult = { inserted: number; updated: number; unchanged: number };
export interface ProductionGeoRepository {
  existing(provider: string, country: OfficialGeoCountry): Promise<ProductionExistingRecord[]>;
  upsertBatch(records: readonly CanonicalGeoAreaImportRecord[]): Promise<ProductionBatchResult>;
}
export type ProductionImportReport = Omit<GeoImportDryRun, 'records'> & ProductionBatchResult & {
  failed: number; sourceLicense: string; applied: boolean; batchesCompleted: number;
};
export type ProductionImportOptions = { apply?: boolean; batchSize?: number };
export class ProductionImportFailure extends Error {
  constructor(public readonly report: ProductionImportReport, cause: unknown) {
    super(`Production batch failed after ${report.batchesCompleted} batches; failed=${report.failed}; rerun is safe: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}

const identity = (record: Pick<CanonicalGeoAreaImportRecord, 'provider' | 'externalId'>) => `${record.provider}:${record.externalId}`;
const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stable(item)]))
  : value;
export const canonicalFingerprint = (record: CanonicalGeoAreaImportRecord) => JSON.stringify(stable({
  parentExternalId: record.parentExternalId, code: record.code, codeAuthority: record.codeAuthority,
  officialName: record.officialName, shortName: record.shortName, areaType: record.areaType, level: record.level,
  coordinates: record.coordinates, bounds: record.bounds, sourceUpdatedAt: record.sourceUpdatedAt ? new Date(record.sourceUpdatedAt).toISOString() : null,
  sourceLicense: record.sourceLicense, metadata: record.metadata,
}));

export function assertProductionSafety(report: GeoImportDryRun, country: string, sourceLicense: string) {
  if (!(INITIAL_EU_IMPORT_COUNTRIES as readonly string[]).includes(country)) throw new Error(`Unsupported production country: ${country}`);
  if (!sourceLicense.trim() || sourceLicense === 'CONFIRM_REQUIRED') throw new Error('Production source license is not confirmed');
  if (!report.datasetVersion?.trim()) throw new Error('Production dataset version is required');
  const blockers = report.invalidRecords + report.missingParents.length + report.duplicateExternalIds.length
    + report.crossCountryParents.length + report.cycles.length + report.unsupportedAreaTypes.length + report.errors.length;
  if (blockers) throw new Error(`Production safety gate failed: ${report.errors.join(', ')}`);
}

export async function prepareEuropeanProductionImport(
  repository: ProductionGeoRepository | null,
  country: OfficialGeoCountry,
  records: readonly CanonicalGeoAreaImportRecord[],
  options: ProductionImportOptions = {},
): Promise<ProductionImportReport> {
  const config = EUROPEAN_PRODUCTION_IMPORTS[country];
  if (!config) throw new Error(`Unsupported production country: ${country}`);
  if (records.some((record) => record.provider !== config.provider || record.codeAuthority !== config.codeAuthority)) throw new Error('Production provider/code authority mismatch');
  if (records.some((record) => record.sourceLicense !== config.sourceLicense)) throw new Error('Production source license mismatch or unconfirmed placeholder');
  if (records.some((record) => record.metadata.datasetVersion !== config.datasetVersion)) throw new Error('Production dataset version mismatch');
  const existing = repository ? await repository.existing(config.provider, country) : [];
  const dryRun = createGeoImportDryRun(records, country, existing, { datasetVersion: config.datasetVersion, expected: config.expected });
  if (dryRun.totalRecords !== config.total) dryRun.errors.push(`manifest:TOTAL:expected_${config.total}:actual_${dryRun.totalRecords}`);
  assertProductionSafety(dryRun, country, config.sourceLicense);
  const existingByIdentity = new Map(existing.map((record) => [identity(record), record]));
  const inserted = records.filter((record) => !existingByIdentity.has(identity(record))).length;
  const updated = records.filter((record) => { const current = existingByIdentity.get(identity(record)); return current && current.fingerprint !== canonicalFingerprint(record); }).length;
  const unchanged = records.length - inserted - updated;
  const base = {
    ...dryRun,
    records: undefined,
    recordsToInsert: inserted,
    recordsToUpdate: updated,
    wouldInsert: inserted,
    wouldUpdate: updated,
    inserted,
    updated,
    unchanged,
    failed: 0,
    sourceLicense: config.sourceLicense,
    applied: false,
    batchesCompleted: 0,
  } as ProductionImportReport;
  if (!options.apply) return base;
  if (!repository) throw new Error('Apply requires a server-side repository');
  const batchSize = options.batchSize ?? 500;
  let result = { inserted: 0, updated: 0, unchanged: 0 }; let batchesCompleted = 0;
  try {
    const levels = [...new Set(records.map((record) => record.level))].sort((left, right) => left - right);
    for (const level of levels) {
      const levelRecords = records.filter((record) => record.level === level);
      for (let offset = 0; offset < levelRecords.length; offset += batchSize) {
        const batch = await repository.upsertBatch(levelRecords.slice(offset, offset + batchSize));
        result = { inserted: result.inserted + batch.inserted, updated: result.updated + batch.updated, unchanged: result.unchanged + batch.unchanged };
        batchesCompleted += 1;
      }
    }
  } catch (error) {
    const failed = records.length - result.inserted - result.updated - result.unchanged;
    throw new ProductionImportFailure({ ...base, ...result, failed, applied: true, batchesCompleted }, error);
  }
  return { ...base, ...result, failed: 0, applied: true, batchesCompleted };
}
